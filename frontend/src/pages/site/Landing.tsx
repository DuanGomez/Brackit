import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { api } from '../../api/client';
import type { PublicOrgCard } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Icon, Logo, OrgBadge } from '../../components/Icon';
import { BRAND, PLANS, whatsappLink } from '../../config';
import { SPORT_ORDER, SPORTS } from '../../lib/sports';
import './site.css';

const check = <Icon name="check" size={18} strokeWidth={2.4} />;

const SECTIONS = [
  { id: 'producto', label: 'Producto' },
  { id: 'ligas', label: 'Ligas en vivo' },
  { id: 'precios', label: 'Precios' },
];

/** Lleva a una sección del inicio desde cualquier página (respeta la ruta base del sitio). */
function useGoToSection() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (id: string) => {
    if (pathname === '/') scrollToSection(id);
    else navigate('/', { state: { section: id } });
  };
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 56;
  window.scrollTo({ top, behavior: 'smooth' });
  history.replaceState(history.state, '', `#${id}`);
}

export function SiteNav() {
  const { session } = useAuth();
  const go = useGoToSection();
  const [open, setOpen] = useState(false);
  const pick = (id: string) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    setOpen(false);
    go(id);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`site-nav ${open ? 'open' : ''}`}>
      <nav className="site-nav-inner" aria-label="Principal">
        <Link to="/" className="site-brand" onClick={() => { setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Logo size={28} />{BRAND.name}</Link>
        <div className="site-links">
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} onClick={pick(s.id)}>{s.label}</a>)}
        </div>
        <div className="site-actions">
          {session ? (
            <Link to="/app" className="pill-light">Ir a mi panel</Link>
          ) : (
            <>
              <Link to="/ingresar" className="link">Ingresar</Link>
              <Link to="/registro" className="pill-light">Crear organización</Link>
            </>
          )}
          <button type="button" className="site-burger" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>
            <span /><span />
          </button>
        </div>
      </nav>
      {open && (
        <div className="site-menu">
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} onClick={pick(s.id)}>{s.label}</a>)}
          {!session && <Link to="/ingresar" onClick={() => setOpen(false)}>Ingresar</Link>}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-wrap">
        <span>{BRAND.name} · Hecho en Medellín</span>
        <a href={whatsappLink('Hola Duan, quiero saber más de Brackit.')} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a>
      </div>
    </footer>
  );
}

export default function Landing() {
  const [orgs, setOrgs] = useState<PublicOrgCard[] | null>(null);
  const location = useLocation();
  useEffect(() => {
    document.title = `${BRAND.name} · ${BRAND.tagline}`;
    api.publicOrgs().then(setOrgs).catch(() => setOrgs([]));
  }, []);
  // Llegó desde otra página pidiendo una sección (o con #precios en el enlace)
  const wanted = (location.state as { section?: string } | null)?.section ?? location.hash.replace('#', '');
  useEffect(() => {
    if (!wanted) return;
    const timer = setTimeout(() => scrollToSection(wanted), 60);
    return () => clearTimeout(timer);
  }, [wanted, orgs]);
  const liveOrg = orgs?.find((o) => o.liveCount > 0) ?? orgs?.[0];

  return (
    <div className="site">
      <SiteNav />

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <p className="hero-kicker">{BRAND.tagline}</p>
          <h1>Tu liga entera.<br /><span className="grad-text">En un solo lugar.</span></h1>
          <p className="hero-lead">Equipos, canchas, horarios y árbitros en un panel para tu organización. Cada marcador se transmite en vivo a tu propia página.</p>
          <div className="hero-ctas">
            <Link to="/registro" className="btn">Crear mi organización gratis</Link>
            {liveOrg && <Link to={`/l/${liveOrg.organization.slug}`} className="text-link">Ver una liga en vivo ›</Link>}
          </div>
        </div>

        <div className="shot" aria-hidden="true">
          <div className="shot-inner">
            <div className="shot-side">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#F5F5F7', fontWeight: 600, padding: '6px 8px 14px' }}>
                <OrgBadge shortName="LB" color="#18C46A" size={26} />Liga Barrial
              </span>
              <span className="on">Inicio</span><span>Torneos</span><span>Calendario</span><span>Sedes y canchas</span><span>Equipos</span><span>Árbitros</span>
            </div>
            <div className="shot-main">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-0.02em' }}>Sábado 31 de octubre</span>
                <span style={{ fontSize: 13, color: 'rgba(245,245,247,.55)' }}>12 partidos · 3 canchas</span>
              </div>
              <div className="shot-cards">
                <div className="shot-card live"><small><span className="dot dot-live" />En vivo · 67'</small>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Club Laureles</span><b className="num">2</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(245,245,247,.7)' }}><span>Atlético Robledo</span><b className="num">1</b></div></div>
                <div className="shot-card"><small>5:00 p. m. · Cancha 2</small><span>Juventud Bello</span><span style={{ color: 'rgba(245,245,247,.7)' }}>Real Envigado Sur</span></div>
                <div className="shot-card"><small>7:00 p. m. · Coliseo</small><span>Titanes de Envigado</span><span style={{ color: 'rgba(245,245,247,.7)' }}>Halcones de Rionegro</span></div>
              </div>
              <div className="shot-card" style={{ gap: 10 }}>
                <small>Ocupación de canchas</small>
                <div className="occ">
                  <span>Cancha 1</span><div className="occ-bar"><span style={{ left: '4%', width: '22%', background: 'rgba(48,209,88,.35)' }} /><span style={{ left: '30%', width: '22%', background: 'rgba(255,159,10,.55)' }} /><span style={{ left: '56%', width: '22%', background: 'rgba(31,91,255,.38)' }} /></div>
                  <span>Cancha 2</span><div className="occ-bar"><span style={{ left: '17%', width: '22%', background: 'rgba(31,91,255,.38)' }} /><span style={{ left: '43%', width: '22%', background: 'rgba(31,91,255,.38)' }} /></div>
                  <span>Coliseo</span><div className="occ-bar"><span style={{ left: '60%', width: '26%', background: 'rgba(255,159,10,.55)' }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-light" id="producto">
        <div className="site-wrap">
          <div className="sec-head">
            <p className="sec-kicker">Una plataforma, muchas organizaciones</p>
            <h2>Cada liga en su propio espacio.</h2>
            <p className="sec-lead">Tus torneos, equipos y resultados solo los ve y los edita tu gente. Nadie más entra a tu organización.</p>
          </div>
          <div className="cards-3">
            <article className="feature">
              <span style={{ color: '#1F5BFF' }}><Icon name="shield" size={34} strokeWidth={1.6} /></span>
              <h3>Datos aislados</h3>
              <p>Cada organización tiene sus torneos, sedes, canchas, equipos y jugadores. Lo de una nunca se mezcla con lo de otra.</p>
            </article>
            <article className="feature">
              <span style={{ color: '#18C46A' }}><Icon name="members" size={34} strokeWidth={1.6} /></span>
              <h3>Roles para tu equipo</h3>
              <p>Administrador, coordinador y árbitro. Cada uno ve y hace solo lo que le toca, desde su propia cuenta.</p>
            </article>
            <article className="feature">
              <span style={{ color: '#FF7A1A' }}><Icon name="globe" size={34} strokeWidth={1.6} /></span>
              <h3>Tu página, tu marca</h3>
              <p>Tu color, tus iniciales y una página pública propia para que jugadores y familias sigan todo en vivo.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="site-wrap split">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p className="sec-kicker">Calendario inteligente</p>
            <h2>Canchas y horarios.<br />Sin choques.</h2>
            <p className="sec-lead">Defines tus sedes, sus canchas y cuándo están disponibles. Brackit reparte los partidos respetando la duración de cada deporte y el descanso de cada equipo.</p>
            <ul className="checks">
              <li>{check}Disponibilidad por cancha y por día</li>
              <li>{check}Descanso mínimo entre partidos de un equipo</li>
              <li>{check}Avisos de choques antes de mover un partido</li>
              <li>{check}Árbitros asignados por partido</li>
            </ul>
          </div>
          <div className="cal-demo" aria-hidden="true">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(245,245,247,.55)' }}><span>Sábado</span><span className="num">2 p. m. · 4 p. m. · 6 p. m.</span></div>
            <div className="cal-row"><span style={{ color: 'rgba(245,245,247,.6)' }}>Cancha 1</span><div className="cal-slots">
              <span className="cal-slot" style={{ background: 'rgba(48,209,88,.14)', border: '1px solid rgba(48,209,88,.4)' }}>Laureles<br />vs Robledo</span>
              <span className="cal-slot" style={{ background: 'rgba(255,159,10,.14)', border: '1px solid rgba(255,159,10,.55)' }}>Belén<br />vs Castilla</span>
              <span className="cal-slot" style={{ border: '1px dashed rgba(255,255,255,.18)' }} /></div></div>
            <div className="cal-row"><span style={{ color: 'rgba(245,245,247,.6)' }}>Cancha 2</span><div className="cal-slots">
              <span className="cal-slot" style={{ border: '1px dashed rgba(255,255,255,.18)' }} />
              <span className="cal-slot" style={{ background: 'rgba(31,91,255,.18)', border: '1px solid rgba(31,91,255,.5)' }}>Bello<br />vs Envigado</span>
              <span className="cal-slot" style={{ background: 'rgba(255,59,48,.16)', border: '1px solid rgba(255,59,48,.55)', color: '#FF8A84' }}>Choque:<br />Bello sin descanso</span></div></div>
            <div className="cal-row"><span style={{ color: 'rgba(245,245,247,.6)' }}>Coliseo</span><div className="cal-slots">
              <span className="cal-slot" style={{ background: 'rgba(31,91,255,.18)', border: '1px solid rgba(31,91,255,.5)' }}>Titanes<br />vs Halcones</span>
              <span className="cal-slot" style={{ flex: 2, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 8px, transparent 8px 16px)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(245,245,247,.5)' }}>No disponible</span></div></div>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="live-box">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p className="sec-kicker" style={{ color: '#FFB340', display: 'flex', alignItems: 'center', gap: 10 }}><span className="dot dot-live" />En vivo</p>
            <h2 style={{ fontSize: 'clamp(36px, 4.6vw, 56px)' }}>El árbitro marca.<br />Todos lo ven al instante.</h2>
            <p className="sec-lead" style={{ fontSize: 19 }}>Del celular del árbitro al marcador, la tabla, las llaves y los goleadores de tu página pública. Sin recargar.</p>
          </div>
          <div className="live-score" aria-hidden="true">
            <span style={{ fontSize: 13, color: 'rgba(245,245,247,.55)' }}>Liga Barrial · Jornada 6 · Cancha 1</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><span className="team-badge" style={{ width: 60, height: 60, background: '#30D158', color: '#0B0B0F', fontSize: 18 }}>CLL</span><b style={{ fontSize: 15 }}>Club Laureles</b></div>
              <div className="num" style={{ fontSize: 62, fontWeight: 700, letterSpacing: '-0.04em' }}>2<span style={{ color: 'rgba(245,245,247,.3)', padding: '0 8px' }}>:</span>1</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><span className="team-badge" style={{ width: 60, height: 60, background: '#3B82F6', color: '#fff', fontSize: 18 }}>ATR</span><b style={{ fontSize: 15 }}>Atlético Robledo</b></div>
            </div>
            <span className="chip chip-live num" style={{ height: 30, padding: '0 14px', background: 'rgba(255,159,10,.16)', color: '#FFB340' }}>67'</span>
          </div>
        </div>
      </section>

      <section className="sec sec-light">
        <div className="site-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 36, alignItems: 'center', textAlign: 'center' }}>
          <h2>Cada deporte, con sus reglas.</h2>
          <p className="sec-lead">Goles, canastas o sets. Puntos de tabla, desempates, prórrogas, penales y tercer puesto como se juegan de verdad.</p>
          <div className="sport-pills">
            {SPORT_ORDER.map((code) => <span key={code}><Icon name={code} size={18} />{SPORTS[code].label}</span>)}
          </div>
        </div>
      </section>

      {orgs && orgs.length > 0 && (
        <section className="sec" id="ligas">
          <div className="site-wrap">
            <div className="sec-head">
              <p className="sec-kicker">Ligas en vivo</p>
              <h2>Mira Brackit funcionando.</h2>
              <p className="sec-lead">Organizaciones de ejemplo con partidos simulados en tiempo real. Entra y sigue el marcador.</p>
            </div>
            <div className="orgs-live">
              {orgs.map((o) => (
                <Link key={o.organization.slug} to={`/l/${o.organization.slug}`} className="org-card">
                  <OrgBadge shortName={o.organization.shortName} color={o.organization.color} size={44} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{o.organization.name}</b>
                    <small>{o.tournaments} torneos{o.organization.city ? ` · ${o.organization.city}` : ''}</small>
                  </span>
                  {o.liveCount > 0 && <span className="chip" style={{ background: 'rgba(255,159,10,.16)', color: '#FFB340' }}><span className="dot dot-live" />{o.liveCount}</span>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="sec" id="precios" style={{ paddingTop: orgs && orgs.length > 0 ? 40 : 140 }}>
        <div className="site-wrap">
          <div className="sec-head">
            <h2>Empieza gratis. Crece cuando quieras.</h2>
            <p className="sec-lead">Los planes pagos se activan hablando con nosotros por WhatsApp: te ayudamos a montar tu liga.</p>
          </div>
          <div className="plans">
            {PLANS.map((p) => (
              <article key={p.id} className={`plan ${p.highlight ? 'featured' : ''}`}>
                <h3>{p.name}{p.highlight && <span className="chip" style={{ background: 'rgba(31,91,255,.2)', color: '#8DB2FF' }}>Más elegido</span>}</h3>
                <p className="plan-price num">{p.price}{p.period && <small> {p.period}</small>}</p>
                <p style={{ color: 'rgba(245,245,247,.62)', fontSize: 16 }}>{p.blurb}</p>
                <ul>{p.features.map((f) => <li key={f}>{check}{f}</li>)}</ul>
                {p.whatsapp ? (
                  <a className={`btn ${p.highlight ? '' : 'btn-outline'}`} href={whatsappLink(p.whatsapp)} target="_blank" rel="noreferrer">
                    <Icon name="whatsapp" size={18} />{p.cta}
                  </a>
                ) : (
                  <Link to="/registro" className="btn btn-outline">{p.cta}</Link>
                )}
              </article>
            ))}
          </div>
          <p className="plans-note">Precios en pesos colombianos. Sin permanencia: cancelas cuando quieras.</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
