import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import type { Sport, SportCode, TournamentCard as Card } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { TournamentCard } from '../components/TournamentCard';
import { BRAND } from '../config';
import { HERO_PHOTO, SPORT_ORDER, SPORTS } from '../lib/sports';
import './home.css';

/** Resumen corto de las reglas de cada deporte para la sección "Deportes". */
function rulesSummary(s: Sport) {
  if (s.scoring === 'SETS') {
    return `Al mejor de ${s.setsToWin * 2 - 1} sets · ${s.setTarget} ${s.scoreUnit.toLowerCase()} por set`;
  }
  const periods = s.scoring === 'POINTS' ? `${s.periods} cuartos de ${s.periodMinutes} min` : `${s.periods} tiempos de ${s.periodMinutes} min`;
  const points = s.allowsDraw ? `${s.winPoints}-${s.drawPoints}-${s.lossPoints} pts` : `${s.winPoints} pts victoria, ${s.lossPoints} derrota`;
  return `${periods} · ${points}`;
}

export default function Home() {
  const { isOrganizer } = useAuth();
  const [all, setAll] = useState<Card[] | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sport, setSport] = useState<SportCode | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.publicTournaments().then(setAll).catch((e) => setError(e.message));
    api.sports().then(setSports).catch(() => {});
    // La lista se refresca cada 30 s para que el contador "en vivo" no envejezca
    const id = setInterval(() => api.publicTournaments().then(setAll).catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    return (all ?? []).filter((t) => (!sport || t.sport === sport)
      && (!q || `${t.name} ${t.location ?? ''}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(q)));
  }, [all, sport, query]);

  const liveNow = (all ?? []).reduce((n, t) => n + t.liveCount, 0);
  const createTo = isOrganizer ? '/panel/nuevo' : '/registro';

  return (
    <>
      <section className="hero">
        <img className="hero-photo" src={HERO_PHOTO} alt="" fetchPriority="high" />
        <div className="hero-shade" />
        <div className="container hero-inner">
          {liveNow > 0 && (
            <a href="#torneos" className="hero-live"><span className="live-dot" />{liveNow} {liveNow === 1 ? 'partido' : 'partidos'} en vivo ahora</a>
          )}
          <h1 className="display">Tu torneo, en vivo.<br />Cualquier deporte.</h1>
          <p className="hero-lead">{BRAND.tagline} Calendario automático, marcador minuto a minuto y tabla que se actualiza sola.</p>
          <div className="hero-ctas">
            <Link to={createTo} className="btn btn-lg">Crear un torneo gratis</Link>
            <a href="#torneos" className="btn btn-lg hero-secondary">Ver torneos</a>
          </div>
        </div>
      </section>

      <section className="container section" id="torneos">
        <div className="row-between section-head">
          <div>
            <p className="eyebrow">Explorar</p>
            <h2 className="title">Torneos en juego</h2>
          </div>
          <label className="search">
            <Icon name="search" size={18} />
            <span className="visually-hidden">Buscar torneo</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o ciudad" />
          </label>
        </div>

        <div className="sport-filter" role="group" aria-label="Filtrar por deporte">
          <button type="button" className={!sport ? 'active' : ''} onClick={() => setSport(null)}>Todos</button>
          {SPORT_ORDER.map((code) => (
            <button key={code} type="button" className={sport === code ? 'active' : ''} onClick={() => setSport(sport === code ? null : code)}>
              <Icon name={code} size={17} />{SPORTS[code].label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="card empty"><h3>No pudimos cargar los torneos</h3><p>{error}</p></div>
        ) : !all ? (
          <div className="grid-cards">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 300 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card empty">
            <h3>No hay torneos con ese filtro</h3>
            <p>Prueba con otro deporte o crea el primero.</p>
          </div>
        ) : (
          <div className="grid-cards">{filtered.map((t) => <TournamentCard key={t.id} t={t} />)}</div>
        )}
      </section>

      <section className="how">
        <div className="container how-grid">
          <div className="how-photo">
            <img src={`${import.meta.env.BASE_URL}sports/arbitro.webp`} alt="Árbitro dirigiendo un partido" loading="lazy" />
          </div>
          <div className="stack how-steps">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="title">Del sorteo a la final, sin hojas de cálculo.</h2>
            <ol>
              <li>
                <span className="how-n">1</span>
                <div><strong>Crea el torneo</strong><p className="muted">Elige deporte y formato: liga, eliminación directa o grupos con fase final. Inscribe los equipos y el calendario se genera solo.</p></div>
              </li>
              <li>
                <span className="how-n">2</span>
                <div><strong>Comparte el PIN con el árbitro</strong><p className="muted">Desde el celular registra goles, canastas o puntos. No necesita crear una cuenta.</p></div>
              </li>
              <li>
                <span className="how-n">3</span>
                <div><strong>Todos lo siguen en vivo</strong><p className="muted">El marcador, la tabla, las llaves y los goleadores se actualizan al instante para quien tenga el enlace.</p></div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="container section">
        <p className="eyebrow">Deportes</p>
        <h2 className="title" style={{ marginBottom: 24 }}>Cada deporte con sus reglas.</h2>
        <div className="sports-grid">
          {SPORT_ORDER.map((code) => {
            const s = sports.find((x) => x.code === code);
            return (
              <button key={code} type="button" className="sport-tile" onClick={() => {
                setSport(code);
                document.getElementById('torneos')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <img src={SPORTS[code].photo} alt="" loading="lazy" />
                <div className="sport-tile-text">
                  <strong><Icon name={code} size={18} />{SPORTS[code].label}</strong>
                  <small>{s ? rulesSummary(s) : ''}</small>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
