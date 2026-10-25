import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { MatchLine } from '../../components/match';
import { useNow } from '../../lib/clock';
import { addDays, formatDate, todayKey } from '../../lib/format';
import { useLoad, useOrgChanges } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';

/** Portada del árbitro: sus partidos (y los que no tienen árbitro) de hoy y los próximos días. */
export default function RefereeHome() {
  const { org } = useOrg();
  const { session } = useAuth();
  const from = todayKey();
  const { data, loading, error, reload } = useLoad(() => api.matches(org.slug, { from, to: addDays(from, 14), mine: true }), `ref-${org.slug}`);
  useOrgChanges(org.slug, reload);
  const now = useNow(!!data?.some((m) => m.status === 'LIVE'));
  const base = `/app/${org.slug}`;

  const live = data?.filter((m) => m.status === 'LIVE') ?? [];
  const mine = data?.filter((m) => m.status === 'SCHEDULED' && m.refereeId === session?.user.id) ?? [];
  const open = data?.filter((m) => m.status === 'SCHEDULED' && m.refereeId == null) ?? [];

  return (
    <div className="page">
      <PageHeader eyebrow={org.name} title="Mis partidos">
        <p className="muted">Toca un partido para abrir la consola y llevar el marcador en vivo.</p>
      </PageHeader>
      {loading ? <div className="skeleton" style={{ height: 300 }} /> : error ? <div className="card empty"><h3>No se pudieron cargar</h3><p>{error}</p></div> : (
        <>
          {live.length > 0 && (
            <section className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head"><h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="dot dot-live" />En vivo</h2></div>
              {live.map((m) => <MatchLine key={m.id} m={m} now={now} to={`${base}/consola/${m.id}`} showTournament />)}
            </section>
          )}
          <section className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head"><h2>Asignados a mí</h2><span className="muted num">{mine.length}</span></div>
            {mine.length ? mine.map((m) => <MatchLine key={m.id} m={m} now={now} to={`${base}/consola/${m.id}`} showTournament withDate />)
              : <p className="empty">No tienes partidos asignados en los próximos 14 días.</p>}
          </section>
          <section className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head"><h2>Sin árbitro</h2><span className="muted" style={{ fontSize: 13 }}>Puedes dirigirlos si el organizador te lo pide</span></div>
            {open.length ? open.slice(0, 20).map((m) => <MatchLine key={m.id} m={m} now={now} to={`${base}/consola/${m.id}`} showTournament withDate />)
              : <p className="empty">No hay partidos sin árbitro hasta el {formatDate(addDays(from, 14))}.</p>}
          </section>
        </>
      )}
    </div>
  );
}
