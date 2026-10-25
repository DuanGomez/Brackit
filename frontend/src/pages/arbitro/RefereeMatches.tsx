import { Link, Navigate } from 'react-router';
import type { Match } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { MatchRow } from '../../components/MatchRow';
import { useNow } from '../../lib/clock';
import { formatDate } from '../../lib/format';
import { useTournament } from '../../live/useTournament';

/** Partidos del torneo al que tiene acceso el árbitro: en vivo, por jugar y terminados. */
export default function RefereeMatches() {
  const { session } = useAuth();
  const slug = session?.tournament?.slug;
  const { data: t, teams, loading, error } = useTournament(slug);
  const now = useNow(!!t?.matches.some((m) => m.status === 'LIVE'));

  if (!slug) return <Navigate to="/arbitro" replace />;
  if (loading) return <div className="container page"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (error || !t) return <div className="container page"><div className="card empty"><h3>No se pudo cargar el torneo</h3><p>{error}</p></div></div>;

  const playable = (m: Match) => !m.bye && m.homeId != null && m.awayId != null;
  const live = t.matches.filter((m) => m.status === 'LIVE');
  const pending = t.matches.filter((m) => m.status === 'SCHEDULED' && playable(m))
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  const finished = t.matches.filter((m) => m.status === 'FINISHED' && !m.bye)
    .sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? ''));
  const to = (m: Match) => `/arbitro/partido/${m.id}`;

  return (
    <div className="container container-narrow page stack">
      <div>
        <p className="eyebrow">Árbitro</p>
        <h1 className="title">{t.name}</h1>
        <p className="muted">Elige el partido que vas a dirigir. Los cambios se ven al instante en la página pública.</p>
      </div>
      {live.length > 0 && (
        <section className="card">
          <div className="card-head"><h2 className="row" style={{ gap: 8 }}><span className="live-dot" />En vivo</h2></div>
          {live.map((m) => <MatchRow key={m.id} match={m} teams={teams} sport={t.sport} now={now} to={to(m)} showRound />)}
        </section>
      )}
      <section className="card">
        <div className="card-head"><h2>Por jugar</h2><span className="muted">{pending.length}</span></div>
        {pending.length ? pending.slice(0, 30).map((m) => (
          <div key={m.id}>
            <p className="day-label">{formatDate(m.scheduledAt)}</p>
            <MatchRow match={m} teams={teams} sport={t.sport} now={now} to={to(m)} showRound />
          </div>
        )) : <p className="empty">No hay partidos pendientes con rivales definidos.</p>}
      </section>
      {finished.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Terminados</h2></div>
          {finished.slice(0, 10).map((m) => <MatchRow key={m.id} match={m} teams={teams} sport={t.sport} now={now} to={`/t/${t.slug}/partido/${m.id}`} showRound />)}
        </section>
      )}
      <Link to={`/t/${t.slug}`} className="btn btn-secondary" style={{ alignSelf: 'center' }}>Ver la página pública</Link>
    </div>
  );
}
