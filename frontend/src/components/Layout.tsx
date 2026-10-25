import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { onServerWaking } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BRAND } from '../config';
import { Icon } from './Icon';

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Icon name="trophy" size={size * 0.6} />
    </span>
  );
}

function Header() {
  const { session, isOrganizer, isReferee, logout } = useAuth();
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="brand" aria-label={`${BRAND.name}, inicio`}>
          <BrandMark />
          {BRAND.name}
        </Link>
        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>Explorar</NavLink>
          {isOrganizer && <NavLink to="/panel">Mis torneos</NavLink>}
          {isReferee && <NavLink to="/arbitro/partidos">Partidos a dirigir</NavLink>}
          {!session && <NavLink to="/arbitro">Soy árbitro</NavLink>}
        </nav>
        <div className="header-actions">
          {session ? (
            <>
              {isOrganizer && (
                <Link to="/panel/nuevo" className="btn btn-sm">
                  <Icon name="plus" size={16} /><span className="btn-label">Crear torneo</span>
                </Link>
              )}
              <button type="button" className="btn btn-sm btn-secondary" onClick={logout} title="Cerrar sesión">
                <Icon name="logout" size={16} /><span className="btn-label">Salir</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/ingresar" className="btn btn-sm btn-secondary">Ingresar</Link>
              <Link to="/registro" className="btn btn-sm">Crear torneo</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Aviso cuando el servidor gratuito está despertando (primera visita tras un rato sin uso). */
function WakingBanner() {
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    const off = onServerWaking(setWaking);
    return () => {
      off();
    };
  }, []);
  if (!waking) return null;
  return (
    <div className="banner-waking" role="status">
      <span className="spinner" />
      Despertando el servidor gratuito… puede tardar hasta un minuto la primera vez.
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout({ children }: { children?: ReactNode }) {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>{children ?? <Outlet />}</main>
      <footer className="footer">
        <div className="container">
          <span>{BRAND.name} · Proyecto de portafolio de Duan Gómez</span>
          <span>Spring Boot · React · WebSockets</span>
        </div>
      </footer>
      <WakingBanner />
    </>
  );
}
