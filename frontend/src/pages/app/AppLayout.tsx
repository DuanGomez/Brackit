import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { api, ApiError, onServerWaking } from '../../api/client';
import type { Org } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Icon, OrgBadge, type IconName } from '../../components/Icon';
import { planLabel } from '../../config';
import { ROLE_LABEL } from '../../lib/format';
import { useApplyTheme } from '../../theme/theme';
import { ThemeSwitch, ThemeToggle } from '../../theme/ThemeControls';
import { LoadError } from '../site/ErrorPages';
import './app.css';

// ---------- Organización actual ----------

interface OrgValue {
  org: Org;
  reloadOrg: () => Promise<void>;
  canManage: boolean;
  isAdmin: boolean;
  toast: (message: string) => void;
}

const OrgContext = createContext<OrgValue | null>(null);

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg fuera del panel');
  return ctx;
}

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

function navFor(manage: boolean): { main: NavItem[]; extra: NavItem[] } {
  if (!manage) {
    return {
      main: [
        { to: '', label: 'Mis partidos', icon: 'whistle', end: true },
        { to: 'calendario', label: 'Calendario', icon: 'calendar' },
      ],
      extra: [{ to: 'publica', label: 'Página pública', icon: 'globe' }],
    };
  }
  return {
    main: [
      { to: '', label: 'Inicio', icon: 'home', end: true },
      { to: 'torneos', label: 'Torneos', icon: 'trophy' },
      { to: 'calendario', label: 'Calendario', icon: 'calendar' },
      { to: 'partidos', label: 'Partidos', icon: 'clock' },
      { to: 'equipos', label: 'Equipos y jugadores', icon: 'shield' },
      { to: 'canchas', label: 'Sedes y canchas', icon: 'court' },
      { to: 'arbitros', label: 'Árbitros', icon: 'whistle' },
    ],
    extra: [
      { to: 'miembros', label: 'Miembros y roles', icon: 'members' },
      { to: 'publica', label: 'Página pública', icon: 'globe' },
      { to: 'ajustes', label: 'Ajustes', icon: 'gear' },
    ],
  };
}

function OrgSwitcher({ org }: { org: Org }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  return (
    <div className="org-switch">
      <button type="button" className="org-switch-btn" aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
        <OrgBadge shortName={org.shortName} color={org.color} size={36} />
        <span className="org-switch-text"><b>{org.name}</b><span>Plan {planLabel(org.plan)}{org.city ? ` · ${org.city}` : ''}</span></span>
        <Icon name="updown" size={14} />
      </button>
      {open && (
        <div className="org-menu" role="menu">
          <p className="org-menu-title">Tus organizaciones</p>
          {session?.memberships.map((m) => (
            <button key={m.slug} type="button" role="menuitem" className={m.slug === org.slug ? 'active' : ''} onClick={() => navigate(`/app/${m.slug}`)}>
              <OrgBadge shortName={m.shortName} color={m.color} size={26} />
              <span><b>{m.name}</b><small>{ROLE_LABEL[m.role]}</small></span>
              {m.slug === org.slug && <Icon name="check" size={16} />}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => navigate('/app/nueva')}>
            <span className="org-menu-plus"><Icon name="plus" size={16} /></span><span><b>Crear organización</b></span>
          </button>
        </div>
      )}
    </div>
  );
}

function WakingBanner() {
  const [waking, setWaking] = useState(false);
  useEffect(() => onServerWaking(setWaking), []);
  if (!waking) return null;
  return <div className="banner-waking" role="status"><span className="spinner" />Despertando el servidor… la primera carga puede tardar hasta un minuto.</div>;
}

/** Estructura del panel de una organización. */
export default function AppLayout() {
  useApplyTheme(true);
  const { org: slug } = useParams();
  const { session, membership, logout } = useAuth();
  const location = useLocation();
  const [org, setOrg] = useState<Org | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const reloadOrg = async () => {
    if (!slug) return;
    try {
      setOrg(await api.org(slug));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? { status: e.status, message: e.message } : { status: 500, message: 'No se pudo abrir la organización' });
    }
  };

  useEffect(() => {
    setOrg(null);
    reloadOrg();
  }, [slug]);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(id);
  }, [toastMsg]);

  if (!session) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
  if (error) {
    return <LoadError status={error.status} message={error.message} onRetry={reloadOrg}
      notFound={{ title: 'No tienes acceso a esta organización', text: 'No existe o tu cuenta no es miembro. Pide a un administrador que te invite con este correo.', back: { to: '/app', label: 'Ir a mis organizaciones' } }} />;
  }

  const role = org?.myRole ?? membership(slug)?.role;
  const fullScreen = location.pathname.includes('/consola/');
  if (fullScreen) {
    return org ? (
      <OrgContext.Provider value={{ org, reloadOrg, canManage: role === 'ADMIN' || role === 'COORDINATOR', isAdmin: role === 'ADMIN', toast: setToastMsg }}>
        <Outlet />
        {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
        <WakingBanner />
      </OrgContext.Provider>
    ) : <div className="app-center"><div className="skeleton" style={{ width: 320, height: 200 }} /></div>;
  }
  const manage = role === 'ADMIN' || role === 'COORDINATOR';
  const nav = navFor(manage);
  const base = `/app/${slug}`;
  const link = (item: NavItem) => (
    <NavLink key={item.to} to={item.to ? `${base}/${item.to}` : base} end={item.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
      <Icon name={item.icon} size={18} />{item.label}
    </NavLink>
  );

  return (
    <div className="app">
      <header className="app-top">
        <button type="button" className="btn btn-secondary icon-btn" aria-label="Abrir menú" onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" size={18} /></button>
        {org && <span className="app-top-org"><OrgBadge shortName={org.shortName} color={org.color} size={28} />{org.name}</span>}
        <span style={{ marginLeft: 'auto' }}><ThemeToggle /></span>
      </header>

      <aside className={`side ${menuOpen ? 'open' : ''}`}>
        {org ? <OrgSwitcher org={org} /> : <div className="skeleton" style={{ height: 58, borderRadius: 14 }} />}
        <nav aria-label="Panel" className="side-nav">
          {nav.main.map(link)}
          <span className="side-sep" />
          {nav.extra.map(link)}
        </nav>
        <div className="side-bottom">
          <ThemeSwitch />
          <div className="side-user">
            <span className="side-avatar">{initials(session.user.name)}</span>
            <span className="side-user-text"><b>{session.user.name}</b><span>{role ? ROLE_LABEL[role] : ''}</span></span>
            <button type="button" className="btn btn-ghost icon-btn" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={logout}><Icon name="logout" size={17} /></button>
          </div>
        </div>
      </aside>
      {menuOpen && <button type="button" className="side-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <main className="app-main">
        {org ? (
          <OrgContext.Provider value={{ org, reloadOrg, canManage: manage, isAdmin: role === 'ADMIN', toast: setToastMsg }}>
            <Outlet />
          </OrgContext.Provider>
        ) : (
          <div className="page"><div className="skeleton" style={{ height: 140 }} /></div>
        )}
      </main>
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
      <WakingBanner />
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** Página del panel con título, subtítulo y acciones. */
export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="h1">{title}</h1>
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/** /app: lleva a la primera organización o a crear una. */
export function AppHome() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/ingresar" replace />;
  if (!session.memberships.length) return <Navigate to="/app/nueva" replace />;
  return <Navigate to={`/app/${session.memberships[0].slug}`} replace />;
}
