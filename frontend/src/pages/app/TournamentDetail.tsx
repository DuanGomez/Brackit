import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import type { Match, Team, Tournament, Venue } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Bracket, MatchLine, Standings } from '../../components/match';
import { TeamBadge } from '../../components/TeamBadge';
import { TeamEditor } from '../../components/TeamEditor';
import { useNow } from '../../lib/clock';
import { addDays, FORMAT_LABEL, formatDate, plural, todayKey } from '../../lib/format';
import { toCard } from '../../lib/cards';
import { useTournamentLive } from '../../live/hooks';
import { useOrg } from './AppLayout';
import { SportChip, TournamentStatusChip } from './Tournaments';

type Tab = 'resumen' | 'partidos' | 'tabla' | 'llaves' | 'equipos' | 'reglas';

export default function TournamentDetail() {
  const { id } = useParams();
  const tournamentId = Number(id);
  const { org, canManage } = useOrg();
  const { data: t, teams, error, loading, reload } = useTournamentLive(() => api.tournament(org.slug, tournamentId), `${org.slug}-${tournamentId}`);
  const [params, setParams] = useSearchParams();
  const now = useNow(!!t?.matches.some((m) => m.status === 'LIVE'));
  const base = `/app/${org.slug}`;

  if (loading) return <div className="page"><div className="skeleton" style={{ height: 160 }} /><div className="skeleton" style={{ height: 320 }} /></div>;
  if (error || !t) return <div className="page"><div className="card empty"><h3>No se pudo abrir el torneo</h3><p>{error}</p></div></div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'partidos', label: 'Partidos' },
    ...(t.format !== 'KNOCKOUT' ? [{ id: 'tabla' as Tab, label: t.format === 'LEAGUE' ? 'Tabla' : 'Grupos' }] : []),
    ...(t.format !== 'LEAGUE' ? [{ id: 'llaves' as Tab, label: 'Llaves' }] : []),
    { id: 'equipos', label: 'Equipos y plantillas' },
    ...(canManage ? [{ id: 'reglas' as Tab, label: 'Reglas' }] : []),
  ];
  const tab = (params.get('vista') as Tab) || 'resumen';
  const setTab = (next: Tab) => setParams(next === 'resumen' ? {} : { vista: next }, { replace: true });
  const live = t.matches.filter((m) => m.status === 'LIVE').length;
  const unplaced = t.matches.filter((m) => m.status === 'SCHEDULED' && !m.bye && (!m.courtId || !m.scheduledAt)).length;
  const linkTo = (m: Match) => `${base}/partido/${m.id}`;

  return (
    <div className="page" style={{ gap: 0, paddingTop: 0 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '26px 0 0', borderBottom: '1px solid var(--line)' }}>
        <nav aria-label="Ruta" style={{ fontSize: 13, color: 'var(--faint)', display: 'flex', gap: 8 }}><Link to={`${base}/torneos`}>Torneos</Link><span>›</span><span>{t.name}</span></nav>
        <div className="page-header">
          <div className="page-header-text" style={{ gap: 10 }}>
            <h1 className="h1">{t.name}</h1>
            <div className="t-meta">
              <SportChip sport={t.sport.code} />
              <span className="chip">{FORMAT_LABEL[t.format]}</span>
              <span className="chip">{plural(t.teams.length, t.sport.participantLabel.toLowerCase(), t.sport.participantLabel.toLowerCase() + 's')}{t.category ? ` · ${t.category}` : ''}</span>
              <TournamentStatusChip t={{ status: t.status, liveCount: live }} />
            </div>
          </div>
          <div className="page-actions">
            {t.status !== 'DRAFT' && <a className="btn btn-secondary" href={`/l/${org.slug}/${t.slug}`} target="_blank" rel="noreferrer"><Icon name="external" size={15} />Página pública</a>}
            {canManage && unplaced > 0 && t.status !== 'DRAFT' && (
              <button type="button" className="btn" onClick={async () => { await api.placePending(org.slug, t.id); reload(); }}>Programar {plural(unplaced, 'pendiente', 'pendientes')}</button>
            )}
          </div>
        </div>
        <div className="tabs-line" role="tablist">
          {tabs.map((x) => <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'active' : ''} onClick={() => setTab(x.id)}>{x.label}</button>)}
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 26 }}>
        {t.status === 'DRAFT' && canManage && <ScheduleBanner t={t} onDone={reload} />}
        {tab === 'resumen' && <Summary t={t} teams={teams} now={now} linkTo={linkTo} onTab={setTab} />}
        {tab === 'partidos' && <Rounds t={t} teams={teams} now={now} base={base} />}
        {tab === 'tabla' && <Tables t={t} teams={teams} />}
        {tab === 'llaves' && (t.matches.some((m) => m.stage === 'KNOCKOUT')
          ? <section className="card card-pad"><Bracket matches={t.matches} teams={teams} sport={t.sport.code} now={now} linkTo={linkTo} /></section>
          : <div className="card empty"><h3>La fase final se arma sola al terminar los grupos</h3><p>Clasifican {plural(t.advancePerGroup, 'equipo', 'equipos')} por grupo y se programan en las canchas del torneo.</p></div>)}
        {tab === 'equipos' && <TeamsEditor t={t} reload={reload} canManage={canManage} />}
        {tab === 'reglas' && canManage && <RulesEditor t={t} onSaved={reload} />}
      </div>
    </div>
  );
}

function ScheduleBanner({ t, onDone }: { t: Tournament; onDone: () => void }) {
  const { org, toast } = useOrg();
  const [date, setDate] = useState(t.startDate ?? addDays(todayKey(), 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderColor: 'var(--primary)' }}>
      <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--primary-soft)', color: 'var(--link)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="calendar" size={22} /></span>
      <div style={{ flex: '1 1 260px' }}>
        <h2 className="h2">Genera el calendario</h2>
        <p className="muted" style={{ fontSize: 14 }}>Brackit crea los partidos y los reparte en tus canchas respetando horarios, duración y descanso. Al generarlo, el torneo queda publicado.</p>
        {error && <p className="form-error" style={{ marginTop: 10 }}>{error}</p>}
      </div>
      <label className="field" style={{ minWidth: 170 }}><span>Primera jornada</span>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <button type="button" className="btn btn-lg" disabled={busy || t.teams.length < 2} onClick={async () => {
        setBusy(true);
        setError(null);
        try {
          const r = await api.schedule(org.slug, t.id, date);
          toast(r.unplaced ? `${r.placed} partidos programados; ${r.unplaced} quedaron sin cupo en las canchas.` : `${r.placed} partidos programados en tus canchas.`);
          onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}>{busy ? 'Programando…' : 'Generar calendario'}</button>
    </section>
  );
}

function Summary({ t, teams, now, linkTo, onTab }: { t: Tournament; teams: Map<number, Team>; now: number; linkTo: (m: Match) => string; onTab: (tab: Tab) => void }) {
  const phases = useMemo(() => phasesOf(t), [t]);
  const champion = t.championId ? teams.get(t.championId) : null;
  return (
    <>
      {champion && (
        <section className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#D4A017' }}><Icon name="trophy" size={30} /></span>
          <div style={{ flex: 1 }}><span className="eyebrow">Campeón</span><p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{champion.name}</p></div>
          <TeamBadge team={champion} size={46} />
        </section>
      )}
      {phases.length > 0 && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="h2">Fases</h2>
          <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {phases.map((p) => (
              <li key={p.name} style={{ borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
                background: p.current ? 'var(--primary-soft)' : 'var(--surface-2)', border: p.current ? '1.5px solid var(--primary)' : '1.5px solid transparent' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.current ? 'var(--link)' : p.done ? 'var(--s-done)' : 'var(--s-sched)' }}>{p.state}</span>
                <b style={{ fontSize: 16, fontWeight: 650 }}>{p.name}</b>
                <span className="muted num" style={{ fontSize: 13 }}>{p.detail}</span>
                {p.current && p.total > 0 && <div className="progress" style={{ marginTop: 4 }}><span style={{ width: `${(p.played / p.total) * 100}%` }} /></div>}
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="two-col">
        {t.standings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {t.standings.map((g) => (
              <section className="card" key={g.group ?? 'tabla'} style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h3 className="h3">{g.group ? `Grupo ${g.group}` : 'Tabla de posiciones'}</h3>
                  <span className="muted" style={{ fontSize: 12 }}>{t.format === 'LEAGUE' ? 'El primero es campeón' : `Clasifican ${t.advancePerGroup}`}</span>
                </div>
                <Standings group={g} teams={teams} sport={t.sport.code} highlight={t.format === 'LEAGUE' ? 1 : t.advancePerGroup} />
              </section>
            ))}
          </div>
        ) : t.matches.some((m) => m.stage === 'KNOCKOUT') ? (
          <section className="card card-pad"><Bracket matches={t.matches} teams={teams} sport={t.sport.code} now={now} linkTo={linkTo} /></section>
        ) : <div className="card empty"><h3>Aún no hay resultados</h3></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <RulesCard t={t} onEdit={() => onTab('reglas')} />
          {t.scorers.length > 0 && (
            <section className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head"><h3>{t.sport.scorersTitle}</h3></div>
              {t.scorers.slice(0, 5).map((s, i) => (
                <div key={s.playerId} className="list-row">
                  <span className="faint num" style={{ width: 16 }}>{i + 1}</span>
                  <TeamBadge team={teams.get(s.teamId)} size={26} />
                  <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 600 }}>{s.player}</b><br /><small className="muted">{teams.get(s.teamId)?.name}</small></span>
                  <b className="num" style={{ fontSize: 18 }}>{s.value}</b>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
      {t.standings.length > 0 && t.matches.some((m) => m.stage === 'KNOCKOUT') && (
        <section className="card card-pad"><h2 className="h2" style={{ marginBottom: 14 }}>Fase final</h2><Bracket matches={t.matches} teams={teams} sport={t.sport.code} now={now} linkTo={linkTo} /></section>
      )}
    </>
  );
}

interface Phase { name: string; state: string; detail: string; current: boolean; done: boolean; played: number; total: number }

function phasesOf(t: Tournament): Phase[] {
  if (t.status === 'DRAFT') return [];
  const real = t.matches.filter((m) => !m.bye && m.status !== 'CANCELLED');
  const groupsOrLeague = real.filter((m) => m.stage === 'GROUP' || m.stage === 'LEAGUE');
  const knockout = real.filter((m) => m.stage === 'KNOCKOUT' || m.stage === 'THIRD_PLACE');
  const out: Phase[] = [];
  let currentSet = false;
  const add = (name: string, list: Match[], pendingText: string) => {
    const played = list.filter((m) => m.status === 'FINISHED').length;
    const done = list.length > 0 && played === list.length;
    const current = !done && !currentSet && list.length > 0;
    if (current) currentSet = true;
    const next = list.filter((m) => m.status === 'SCHEDULED' && m.scheduledAt).map((m) => m.scheduledAt!).sort()[0];
    out.push({ name, done, current, played, total: list.length,
      state: done ? 'Terminada' : current ? 'En curso' : list.length ? 'Programada' : 'Se arma sola',
      detail: list.length ? (done ? `${played} partidos jugados` : current ? `${played} de ${list.length} partidos` : next ? formatDate(next) : 'Por programar') : pendingText });
  };
  if (groupsOrLeague.length) add(t.format === 'LEAGUE' ? 'Liga' : 'Fase de grupos', groupsOrLeague, '');
  if (t.format !== 'LEAGUE') {
    const rounds = [...new Set(knockout.filter((m) => m.stage === 'KNOCKOUT').map((m) => m.round))].sort((a, b) => a - b);
    if (!rounds.length) add('Fase final', [], t.format === 'GROUPS_KNOCKOUT' ? `Clasifican ${t.advancePerGroup} por grupo` : '');
    rounds.forEach((r) => {
      const list = knockout.filter((m) => m.stage === 'KNOCKOUT' && m.round === r);
      add(list[0].roundLabel, list, '');
    });
    const third = knockout.filter((m) => m.stage === 'THIRD_PLACE');
    if (third.length) add('Tercer puesto', third, '');
  }
  return out;
}

function RulesCard({ t, onEdit }: { t: Tournament; onEdit: () => void }) {
  const { canManage } = useOrg();
  const s = t.sport;
  const points = s.scoring === 'SETS' ? (s.code === 'VOLEIBOL' ? '3-0/3-1: 3 · 3-2: 2 y 1' : `${s.winPoints} por victoria`)
    : s.allowsDraw ? `${s.winPoints} victoria · ${s.drawPoints} empate` : `${s.winPoints} victoria · ${s.lossPoints} derrota`;
  const duration = s.scoring === 'SETS' ? `Al mejor de ${s.setsToWin * 2 - 1} sets` : `${s.periods} × ${s.periodMinutes} min`;
  return (
    <section className="card" style={{ overflow: 'hidden' }}>
      <div className="card-head"><h3>Reglas</h3>{canManage && <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>Editar</button>}</div>
      <dl style={{ padding: '10px 22px 16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '11px 16px', fontSize: 14 }}>
        <dt className="muted">Puntos</dt><dd className="num" style={{ fontWeight: 600, textAlign: 'right' }}>{points}</dd>
        <dt className="muted">Duración</dt><dd className="num" style={{ fontWeight: 600, textAlign: 'right' }}>{duration}</dd>
        <dt className="muted">Tiempo en cancha</dt><dd className="num" style={{ fontWeight: 600, textAlign: 'right' }}>{t.blockMinutes} min</dd>
        <dt className="muted">Descanso mínimo</dt><dd className="num" style={{ fontWeight: 600, textAlign: 'right' }}>{t.minRestHours ? `${t.minRestHours} h por equipo` : 'Sin mínimo'}</dd>
        <dt className="muted">Entre jornadas</dt><dd className="num" style={{ fontWeight: 600, textAlign: 'right' }}>{t.daysBetween === 7 ? 'Una semana' : plural(t.daysBetween, 'día', 'días')}</dd>
      </dl>
    </section>
  );
}

function Rounds({ t, teams, now, base }: { t: Tournament; teams: Map<number, Team>; now: number; base: string }) {
  const groups = useMemo(() => {
    const map = new Map<string, Match[]>();
    [...t.matches].filter((m) => !m.bye)
      .sort((a, b) => (a.stage === 'GROUP' || a.stage === 'LEAGUE' ? 0 : 1) - (b.stage === 'GROUP' || b.stage === 'LEAGUE' ? 0 : 1) || a.round - b.round
        || (a.stage === 'THIRD_PLACE' ? -1 : 0) || (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
      .forEach((m) => {
        const key = m.stage === 'THIRD_PLACE' ? 'T' : `${m.stage === 'GROUP' || m.stage === 'LEAGUE' ? 'L' : 'K'}${m.round}`;
        map.set(key, [...(map.get(key) ?? []), m]);
      });
    return [...map.values()];
  }, [t.matches]);
  if (!groups.length) return <div className="card empty"><h3>Aún no hay partidos</h3><p>Genera el calendario para crearlos.</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map((list) => (
        <section className="card" key={list[0].id} style={{ overflow: 'hidden' }}>
          <div className="card-head"><h3>{list[0].roundLabel}</h3><span className="muted" style={{ fontSize: 13 }}>{list[0].scheduledAt ? formatDate(list[0].scheduledAt) : 'Sin programar'}</span></div>
          {list.map((m) => <MatchLine key={m.id} m={toCard(m, t, teams)} now={now} to={`${base}/partido/${m.id}`} withDate />)}
        </section>
      ))}
    </div>
  );
}

function Tables({ t, teams }: { t: Tournament; teams: Map<number, Team> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {t.standings.map((g) => (
        <section className="card" key={g.group ?? 'tabla'} style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 className="h3">{g.group ? `Grupo ${g.group}` : 'Tabla de posiciones'}</h3>
            <span className="muted" style={{ fontSize: 12 }}>{t.format === 'LEAGUE' ? 'El primero es campeón' : `Clasifican ${t.advancePerGroup}`}</span>
          </div>
          <Standings group={g} teams={teams} sport={t.sport.code} highlight={t.format === 'LEAGUE' ? 1 : t.advancePerGroup} />
        </section>
      ))}
    </div>
  );
}

function TeamsEditor({ t, reload, canManage }: { t: Tournament; reload: () => Promise<void>; canManage: boolean }) {
  const { org } = useOrg();
  const [open, setOpen] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Team | null>(null);
  const draft = t.status === 'DRAFT';
  const individual = t.sport.participantLabel !== 'Equipo';
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section className="card" style={{ overflow: 'hidden' }}>
      <div className="card-head">
        <h3>{plural(t.teams.length, t.sport.participantLabel.toLowerCase(), t.sport.participantLabel.toLowerCase() + 's')}</h3>
        {!draft && canManage && <span className="muted" style={{ fontSize: 13 }}>Con calendario ya no se agregan ni quitan participantes</span>}
      </div>
      {error && <p className="form-error" style={{ margin: '12px 22px' }}>{error}</p>}
      {t.teams.map((team) => {
        const missing = team.players.filter((p) => !p.document).length;
        return (
          <div key={team.id} style={{ borderTop: '1px solid var(--line)' }}>
            <div className="list-row team-row" style={{ borderTop: 0 }}>
              {canManage ? (
                <button type="button" className="team-row-main" onClick={() => setEditing(team)} title="Personalizar equipo">
                  <TeamBadge team={team} size={40} />
                  <span><b>{team.name}</b><small className="muted">{team.shortName} · {team.hasPhoto ? 'Foto del escudo' : 'Escudo con sus colores'}</small></span>
                </button>
              ) : (
                <span className="team-row-main"><TeamBadge team={team} size={40} /><span><b>{team.name}</b><small className="muted">{team.shortName}</small></span></span>
              )}
              {canManage && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(team)}><Icon name="edit" size={14} />Personalizar</button>}
              {team.group && <span className="chip">Grupo {team.group}</span>}
              {missing > 0 && <span className="chip chip-cancel">{plural(missing, 'sin documento', 'sin documento')}</span>}
              {!individual && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(open === team.id ? null : team.id)}>{plural(team.players.length, 'jugador', 'jugadores')}</button>}
              {draft && canManage && <button type="button" className="btn btn-danger icon-btn" aria-label={`Quitar ${team.name}`} onClick={() => act(() => api.deleteTeam(org.slug, team.id))}><Icon name="trash" size={15} /></button>}
            </div>
            {(open === team.id || individual) && <Roster team={team} act={act} canManage={canManage} />}
          </div>
        );
      })}
      {editing && <TeamEditor org={org.slug} team={editing} onClose={() => setEditing(null)} onSaved={() => { reload(); }} />}
      {draft && canManage && (
        <form style={{ display: 'flex', gap: 8, padding: '14px 22px 20px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }} onSubmit={(e: FormEvent) => {
          e.preventDefault();
          // Al agregar un equipo se abre su editor para ponerle escudo y colores
          if (name.trim()) act(async () => setEditing(await api.addTeam(org.slug, t.id, { name }))).then(() => setName(''));
        }}>
          <input className="input" style={{ flex: '1 1 220px' }} placeholder={`Nuevo ${t.sport.participantLabel.toLowerCase()}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className="btn"><Icon name="plus" size={15} />Agregar</button>
        </form>
      )}
    </section>
  );
}

function Roster({ team, act, canManage }: { team: Team; act: (fn: () => Promise<unknown>) => Promise<void>; canManage: boolean }) {
  const { org } = useOrg();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [doc, setDoc] = useState('');
  return (
    <div style={{ padding: '0 22px 16px 68px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {team.players.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, flexWrap: 'wrap' }}>
          <span className="num faint" style={{ width: 26, textAlign: 'right' }}>{p.number ?? '—'}</span>
          <span style={{ flex: '1 1 160px' }}>{p.name}</span>
          {canManage ? (
            <input className="input" style={{ width: 160, height: 32, fontSize: 13, borderColor: p.document ? undefined : 'var(--red)' }} placeholder="Documento" defaultValue={p.document ?? ''}
              onBlur={(e) => e.target.value !== (p.document ?? '') && act(() => api.updatePlayer(org.slug, p.id, { name: p.name, number: p.number, document: e.target.value || null }))} />
          ) : <span className={p.document ? 'muted num' : 'chip chip-cancel'} style={{ fontSize: 12 }}>{p.document ?? 'Sin documento'}</span>}
          {canManage && <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.deletePlayer(org.slug, p.id))}>Quitar</button>}
        </div>
      ))}
      {canManage && (
        <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }} onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          act(() => api.addPlayer(org.slug, team.id, { name, number: number ? Number(number) : null, document: doc || null })).then(() => { setName(''); setNumber(''); setDoc(''); });
        }}>
          <input className="input" style={{ width: 70, height: 36 }} inputMode="numeric" placeholder="N.º" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          <input className="input" style={{ flex: '1 1 180px', height: 36 }} placeholder="Nombre del jugador" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <input className="input" style={{ width: 160, height: 36 }} placeholder="Documento" value={doc} onChange={(e) => setDoc(e.target.value)} maxLength={30} />
          <button className="btn btn-sm btn-secondary">Agregar</button>
        </form>
      )}
    </div>
  );
}

function RulesEditor({ t, onSaved }: { t: Tournament; onSaved: () => void }) {
  const { org, toast } = useOrg();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState({ name: t.name, category: t.category ?? '', description: t.description ?? '', blockMinutes: t.blockMinutes,
    minRestHours: t.minRestHours, daysBetween: t.daysBetween, courtIds: t.courtIds });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.venues(org.slug).then(setVenues).catch(() => {});
  }, [org.slug]);
  const courts = venues.flatMap((v) => v.courts.filter((c) => !c.sports.length || c.sports.includes(t.sport.code)).map((c) => ({ ...c, venue: v.name })));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <form className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await api.updateTournament(org.slug, t.id, { ...form, category: form.category || null, description: form.description || null, startDate: t.startDate });
          toast('Cambios guardados');
          onSaved();
        } catch (err) {
          setError((err as Error).message);
        }
      }}>
        <h2 className="h2">Datos y reglas</h2>
        <div className="grid-2">
          <label className="field"><span>Nombre</span><input className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>Categoría</span><input className="input" maxLength={40} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
        </div>
        <label className="field"><span>Descripción</span><textarea className="textarea" maxLength={400} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="grid-3">
          <label className="field"><span>Tiempo en cancha (min)</span><input className="input" type="number" min={15} max={600} step={15} value={form.blockMinutes} onChange={(e) => setForm({ ...form, blockMinutes: Number(e.target.value) })} /></label>
          <label className="field"><span>Descanso mínimo (h)</span><input className="input" type="number" min={0} max={168} value={form.minRestHours} onChange={(e) => setForm({ ...form, minRestHours: Number(e.target.value) })} /></label>
          <label className="field"><span>Días entre jornadas</span><input className="input" type="number" min={1} max={30} value={form.daysBetween} onChange={(e) => setForm({ ...form, daysBetween: Number(e.target.value) })} /></label>
        </div>
        <div className="field">
          <span>Canchas del torneo</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {courts.map((c) => {
              const on = form.courtIds.includes(c.id);
              return <button key={c.id} type="button" className={`check-chip ${on ? 'active' : ''}`} aria-pressed={on}
                onClick={() => setForm({ ...form, courtIds: on ? form.courtIds.filter((x) => x !== c.id) : [...form.courtIds, c.id] })}>{on && <Icon name="check" size={14} />}{c.name}<span className="faint" style={{ fontWeight: 400 }}>· {c.venue}</span></button>;
            })}
          </div>
          <small>Los cambios aplican a lo que se programe de aquí en adelante.</small>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn" style={{ alignSelf: 'flex-start' }}>Guardar cambios</button>
      </form>
      {!org.demo && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'var(--danger-bg)' }}>
          <h2 className="h2">Eliminar torneo</h2>
          <p className="muted">Se borran equipos, partidos y resultados. No se puede deshacer.</p>
          <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={async () => {
            if (!window.confirm(`¿Eliminar "${t.name}" para siempre?`)) return;
            await api.deleteTournament(org.slug, t.id);
            navigate(`/app/${org.slug}/torneos`, { replace: true });
          }}><Icon name="trash" size={15} />Eliminar torneo</button>
        </section>
      )}
    </div>
  );
}
