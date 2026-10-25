import { Link, useNavigate } from 'react-router';
import { api } from '../../api/client';
import type { CalendarCourt, MatchCard, Pending } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { MatchLine } from '../../components/match';
import { serverNow, useNow } from '../../lib/clock';
import { formatLongDate, greeting, minutesOfDay, plural, todayKey } from '../../lib/format';
import { SPORTS } from '../../lib/sports';
import { useLoad, useOrgChanges } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';
import RefereeHome from './RefereeHome';

export default function Dashboard() {
  const { canManage } = useOrg();
  return canManage ? <ManagerDashboard /> : <RefereeHome />;
}

function ManagerDashboard() {
  const { org } = useOrg();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useLoad(() => api.dashboard(org.slug), `dash-${org.slug}`);
  useOrgChanges(org.slug, reload);
  const now = useNow(!!data && data.liveCount > 0);
  const base = `/app/${org.slug}`;
  const first = session?.user.name.split(' ')[0] ?? '';

  if (loading) return <div className="page"><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 380 }} /></div>;
  if (error || !data) return <div className="page"><div className="card empty"><h3>No se pudo cargar el panel</h3><p>{error}</p></div></div>;

  const noVenues = org.limits.venues === 0;
  const noTournaments = data.tournaments.length === 0;

  return (
    <div className="page">
      <PageHeader eyebrow={formatLongDate(todayKey())} title={`${greeting()}, ${first}`}
        actions={<>
          <Link to={`${base}/partidos`} className="search" aria-label="Buscar partidos"><Icon name="search" size={16} /><span>Buscar partidos</span></Link>
          <Link to={`${base}/torneos/nuevo`} className="btn"><Icon name="plus" size={16} strokeWidth={2.2} />Nuevo torneo</Link>
        </>} />

      {(noVenues || noTournaments) && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="h2">Pon en marcha tu organización</h2>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SetupStep done={!noVenues} n={1} text="Crea una sede con sus canchas y horarios" to={`${base}/canchas`} />
            <SetupStep done={!noTournaments} n={2} text="Crea tu primer torneo e inscribe los equipos" to={`${base}/torneos/nuevo`} />
            <SetupStep done={false} n={3} text="Invita a tus árbitros y coordinadores" to={`${base}/miembros`} />
          </ol>
        </section>
      )}

      <div className="stats">
        <div className="stat"><span>Partidos hoy</span><b>{data.today.length}</b><small>en {plural(data.courtsCount, 'cancha', 'canchas')}</small></div>
        <div className="stat"><span style={{ color: 'var(--s-live)', fontWeight: 600 }}><span className="dot dot-live" />En vivo</span><b>{data.liveCount}</b>
          <small>{data.liveCount ? [...new Set(data.today.filter((m) => m.status === 'LIVE').map((m) => m.courtName))].join(' y ') : 'Ningún partido ahora'}</small></div>
        <div className="stat"><span>Torneos activos</span><b>{data.activeTournaments}</b><small>{plural(data.teamsCount, 'equipo inscrito', 'equipos inscritos')}</small></div>
        <div className="stat"><span>Por revisar</span><b style={{ color: data.pending.some((p) => p.severity === 'error') ? 'var(--danger)' : undefined }}>{data.pending.length}</b>
          <small>{data.pending.length ? 'árbitros, planillas o calendario' : 'Todo al día'}</small></div>
      </div>

      <div className="two-col">
        <section className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head"><h2>Partidos de hoy</h2><Link to={`${base}/calendario`} style={{ fontSize: 14, fontWeight: 500 }}>Ver calendario</Link></div>
          {data.today.length ? data.today.map((m) => <MatchLine key={m.id} m={m} now={now} to={`${base}/partido/${m.id}`} />)
            : <p className="empty">Hoy no hay partidos programados.</p>}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head"><h2>Torneos</h2><Link to={`${base}/torneos`} style={{ fontSize: 14, fontWeight: 500 }}>Todos</Link></div>
            <div style={{ padding: '6px 22px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.tournaments.length ? data.tournaments.map((t) => {
                const pct = t.matchesTotal ? Math.round((t.matchesPlayed / t.matchesTotal) * 100) : 0;
                return (
                  <Link key={t.id} to={`${base}/torneos/${t.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, color: 'var(--text)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}>
                      <b style={{ fontWeight: 600 }}>{t.name} · {SPORTS[t.sport].label}</b>
                      <span className="num" style={{ color: t.status === 'DRAFT' ? 'var(--s-sched)' : 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {t.status === 'DRAFT' ? 'Borrador' : `${t.matchesPlayed} de ${t.matchesTotal}`}
                      </span>
                    </div>
                    <div className="progress"><span style={{ width: `${t.status === 'DRAFT' ? 6 : pct}%`, background: t.status === 'DRAFT' ? 'var(--s-sched)' : undefined }} /></div>
                  </Link>
                );
              }) : <p className="muted" style={{ paddingTop: 12 }}>Aún no hay torneos activos.</p>}
            </div>
          </section>

          <section className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head"><h2>Por revisar</h2></div>
            {data.pending.length ? data.pending.map((p, i) => <PendingRow key={i} p={p} onOpen={() => navigate(pendingLink(base, p))} />)
              : <p className="list-row muted" style={{ fontSize: 14 }}><Icon name="check" size={16} />Nada pendiente. Buen trabajo.</p>}
          </section>
        </div>
      </div>

      {data.courtsToday.length > 0 && <CourtsToday courts={data.courtsToday} matches={data.today} />}
    </div>
  );
}

function SetupStep({ done, n, text, to }: { done: boolean; n: number; text: string; to: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flex: 'none',
        background: done ? 'var(--green)' : 'var(--primary-soft)', color: done ? '#fff' : 'var(--link)' }}>{done ? <Icon name="check" size={14} strokeWidth={2.6} /> : n}</span>
      <span style={{ flex: 1, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--text)' }}>{text}</span>
      {!done && <Link to={to} className="btn btn-sm btn-secondary">Ir</Link>}
    </li>
  );
}

function pendingLink(base: string, p: Pending) {
  switch (p.kind) {
    case 'NO_REFEREE': return `${base}/partidos?sinArbitro=1`;
    case 'UNPLACED': return `${base}/calendario`;
    default: return p.tournamentId ? `${base}/torneos/${p.tournamentId}${p.kind === 'NO_DOCUMENT' ? '?vista=equipos' : ''}` : base;
  }
}

function PendingRow({ p, onOpen }: { p: Pending; onOpen: () => void }) {
  const color = p.severity === 'error' ? 'var(--red)' : p.severity === 'warning' ? 'var(--amber)' : 'var(--s-sched)';
  const action = p.kind === 'NO_REFEREE' ? 'Asignar' : p.kind === 'UNPLACED' ? 'Programar' : p.kind === 'DRAFT' ? 'Abrir' : 'Revisar';
  return (
    <button type="button" className="list-row" onClick={onOpen} style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--text)' }}>
      <span className="dot" style={{ background: color }} />
      <span style={{ flex: 1, fontSize: 14 }}>{p.message}</span>
      <span style={{ color: 'var(--link)', fontSize: 14, fontWeight: 500 }}>{action}</span>
    </button>
  );
}

const STATUS_FILL: Record<string, string> = {
  FINISHED: 'rgba(48,209,88,.32)', LIVE: 'rgba(255,159,10,.6)', SCHEDULED: 'rgba(130,150,190,.32)', CANCELLED: 'rgba(255,59,48,.18)',
};

/** Ocupación de cada cancha hoy, con la línea de "ahora". */
function CourtsToday({ courts, matches }: { courts: CalendarCourt[]; matches: MatchCard[] }) {
  const windows = courts.flatMap((c) => c.windows);
  if (!windows.length) return null;
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const start = Math.min(...windows.map((w) => toMin(w.start)));
  const end = Math.max(...windows.map((w) => toMin(w.end)));
  const span = Math.max(60, end - start);
  const pct = (m: number) => `${Math.max(0, Math.min(100, ((m - start) / span) * 100))}%`;
  const nowMin = minutesOfDay(new Date(serverNow()).toISOString());
  const showNow = nowMin >= start && nowMin <= end;
  const hour = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1} ${m >= 720 ? 'p. m.' : 'a. m.'}`;

  return (
    <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 className="h2">Canchas hoy</h2>
        <span className="num muted" style={{ fontSize: 13 }}>{hour(start)} — {hour(end)}</span>
      </div>
      <div className="occupancy">
        {courts.map((c) => (
          <div key={c.id} style={{ display: 'contents' }}>
            <span title={c.venueName}>{c.name}</span>
            <div className="occ-track">
              {c.blocks.map((b) => {
                const s = minutesOfDay(b.startsAt), e = minutesOfDay(b.endsAt);
                return <span key={b.id} title={b.reason ?? 'Bloqueada'} style={{ left: pct(s), width: `calc(${pct(e)} - ${pct(s)})`,
                  background: 'repeating-linear-gradient(135deg, var(--line-strong) 0 6px, transparent 6px 12px)' }} />;
              })}
              {matches.filter((m) => m.courtId === c.id && m.scheduledAt).map((m) => {
                const s = minutesOfDay(m.scheduledAt!);
                return <span key={m.id} title={`${m.home?.name} vs ${m.away?.name}`}
                  style={{ left: pct(s), width: `calc(${pct(s + m.blockMinutes)} - ${pct(s)} - 2px)`, background: STATUS_FILL[m.status] }} />;
              })}
              {showNow && <span className="occ-now" style={{ left: pct(nowMin) }} />}
            </div>
          </div>
        ))}
      </div>
      <div className="legend">
        <span><span className="dot" style={{ background: '#30D158' }} />Finalizado</span>
        <span><span className="dot" style={{ background: 'var(--amber)' }} />En vivo</span>
        <span><span className="dot" style={{ background: '#8E9BB8' }} />Programado</span>
        <span><span className="dot" style={{ background: 'var(--link)' }} />Ahora</span>
      </div>
    </section>
  );
}
