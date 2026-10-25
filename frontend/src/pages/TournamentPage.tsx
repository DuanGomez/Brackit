import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { Match, Team, Tournament } from '../api/types';
import { Bracket } from '../components/Bracket';
import { Icon, type IconName } from '../components/Icon';
import { MatchRow } from '../components/MatchRow';
import { Standings } from '../components/Standings';
import { TeamBadge } from '../components/TeamBadge';
import { useNow } from '../lib/clock';
import { FORMAT_LABEL, formatDate, plural } from '../lib/format';
import { SPORTS } from '../lib/sports';
import { useLiveStatus } from '../live/live';
import { useTournament } from '../live/useTournament';
import './tournament.css';

type Tab = 'resumen' | 'partidos' | 'tabla' | 'llaves' | 'goleadores' | 'equipos';

export function tabsFor(t: Tournament): { id: Tab; label: string; icon: IconName }[] {
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: 'resumen', label: 'Resumen', icon: 'live' },
    { id: 'partidos', label: 'Partidos', icon: 'calendar' },
  ];
  if (t.format !== 'KNOCKOUT') tabs.push({ id: 'tabla', label: t.format === 'LEAGUE' ? 'Tabla' : 'Grupos', icon: 'table' });
  if (t.format !== 'LEAGUE') tabs.push({ id: 'llaves', label: 'Llaves', icon: 'bracket' });
  if (t.sport.scoring !== 'SETS') tabs.push({ id: 'goleadores', label: t.sport.scorersTitle, icon: 'trophy' });
  tabs.push({ id: 'equipos', label: t.sport.participantLabel === 'Equipo' ? 'Equipos' : 'Participantes', icon: 'users' });
  return tabs;
}

export default function TournamentPage() {
  const { slug } = useParams();
  const { data: t, error, loading, teams } = useTournament(slug);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('vista') as Tab) || 'resumen';
  const setTab = (id: Tab) => setParams(id === 'resumen' ? {} : { vista: id }, { replace: true });
  const live = useLiveStatus();
  const hasLive = !!t?.matches.some((m) => m.status === 'LIVE');
  const now = useNow(hasLive);

  useEffect(() => {
    if (t) document.title = `${t.name} · en vivo`;
  }, [t]);

  if (loading) return <div className="container page"><div className="skeleton" style={{ height: 280 }} /></div>;
  if (error || !t) {
    return (
      <div className="container page">
        <div className="card empty"><h3>No encontramos este torneo</h3><p>{error}</p><Link to="/" className="btn" style={{ marginTop: 16 }}>Volver a explorar</Link></div>
      </div>
    );
  }

  const look = SPORTS[t.sport.code];
  const champion = t.championId ? teams.get(t.championId) : null;
  const linkTo = (m: Match) => `/t/${t.slug}/partido/${m.id}`;

  return (
    <>
      <section className="t-hero">
        <img src={look.photo} alt="" className="t-hero-photo" />
        <div className="t-hero-shade" />
        <div className="container t-hero-inner">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="chip t-chip"><Icon name={t.sport.code} size={14} />{look.label}</span>
            <span className="chip t-chip">{FORMAT_LABEL[t.format]}</span>
            {hasLive && <span className="chip chip-live t-chip-live"><span className="live-dot" />En vivo</span>}
            {t.status === 'FINISHED' && <span className="chip t-chip">Finalizado</span>}
          </div>
          <h1 className="title t-title">{t.name}</h1>
          <p className="t-sub">
            {t.location && <span className="t-loc"><Icon name="pin" size={15} />{t.location} ·</span>}
            {plural(t.teams.length, t.sport.participantLabel.toLowerCase(), t.sport.participantLabel.toLowerCase() + 's')}
            {t.startDate && ` · desde ${formatDate(t.startDate, true)}`} · Organiza {t.organizer}
          </p>
        </div>
      </section>

      <div className="container page t-page">
        {champion && (
          <div className="champion card">
            <Icon name="trophy" size={28} />
            <div>
              <p className="eyebrow">Campeón</p>
              <strong>{champion.name}</strong>
            </div>
            <TeamBadge team={champion} size={44} />
          </div>
        )}

        <div className="row-between t-tabs-row">
          <div className="tabs" role="tablist">
            {tabsFor(t).map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'active' : ''} onClick={() => setTab(x.id)}>
                <Icon name={x.icon} size={16} />{x.label}
              </button>
            ))}
          </div>
          <span className={`conn conn-${live}`} title="Conexión en tiempo real">
            <span className="conn-dot" />{live === 'online' ? 'Tiempo real activo' : live === 'offline' ? 'Reconectando…' : 'Conectando…'}
          </span>
        </div>

        {tab === 'resumen' && <Summary t={t} teams={teams} now={now} linkTo={linkTo} onTab={setTab} />}
        {tab === 'partidos' && <Fixtures t={t} teams={teams} now={now} linkTo={linkTo} />}
        {tab === 'tabla' && <Tables t={t} teams={teams} />}
        {tab === 'llaves' && (
          t.matches.some((m) => m.stage === 'KNOCKOUT') ? (
            <div className="card card-pad"><Bracket matches={t.matches} teams={teams} sport={t.sport} now={now} linkTo={linkTo} /></div>
          ) : (
            <div className="card empty"><h3>La fase final se arma al terminar los grupos</h3><p>Clasifican {plural(t.advancePerGroup, 'equipo', 'equipos')} por grupo.</p></div>
          )
        )}
        {tab === 'goleadores' && <Scorers t={t} teams={teams} />}
        {tab === 'equipos' && <Teams t={t} />}
        {t.description && tab === 'resumen' && <p className="muted t-desc">{t.description}</p>}
      </div>
    </>
  );
}

interface SectionProps {
  t: Tournament;
  teams: Map<number, Team>;
  now: number;
  linkTo: (m: Match) => string;
}

function Summary({ t, teams, now, linkTo, onTab }: SectionProps & { onTab: (tab: Tab) => void }) {
  const live = t.matches.filter((m) => m.status === 'LIVE');
  const upcoming = t.matches
    .filter((m) => m.status === 'SCHEDULED' && !m.bye)
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
    .slice(0, 5);
  const recent = t.matches
    .filter((m) => m.status === 'FINISHED' && !m.bye)
    .sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? ''))
    .slice(0, 5);
  const firstTable = t.standings[0];

  return (
    <div className="summary-grid">
      <div className="stack">
        {live.length > 0 && (
          <section className="card">
            <div className="card-head"><h2 className="row" style={{ gap: 8 }}><span className="live-dot" />En vivo</h2></div>
            {live.map((m) => <MatchRow key={m.id} match={m} teams={teams} sport={t.sport} now={now} to={linkTo(m)} showRound />)}
          </section>
        )}
        <section className="card">
          <div className="card-head"><h2>Próximos partidos</h2><button className="btn btn-ghost btn-sm" onClick={() => onTab('partidos')}>Ver calendario</button></div>
          {upcoming.length ? upcoming.map((m) => (
            <div key={m.id}>
              <p className="day-label">{formatDate(m.scheduledAt)}</p>
              <MatchRow match={m} teams={teams} sport={t.sport} now={now} to={linkTo(m)} showRound />
            </div>
          )) : <p className="empty">No hay partidos pendientes.</p>}
        </section>
        <section className="card">
          <div className="card-head"><h2>Últimos resultados</h2></div>
          {recent.length ? recent.map((m) => <MatchRow key={m.id} match={m} teams={teams} sport={t.sport} now={now} to={linkTo(m)} showRound />)
            : <p className="empty">Todavía no se ha jugado ningún partido.</p>}
        </section>
      </div>

      <aside className="stack">
        {firstTable && firstTable.rows.length > 0 ? (
          <section className="card">
            <div className="card-head"><h2>{firstTable.group ? `Grupo ${firstTable.group}` : 'Tabla'}</h2><button className="btn btn-ghost btn-sm" onClick={() => onTab('tabla')}>Completa</button></div>
            <MiniTable rows={firstTable.rows.slice(0, 6)} teams={teams} />
          </section>
        ) : t.matches.some((m) => m.stage === 'KNOCKOUT') && (
          <section className="card">
            <div className="card-head"><h2>Llaves</h2><button className="btn btn-ghost btn-sm" onClick={() => onTab('llaves')}>Ver llaves</button></div>
            <NextRound t={t} teams={teams} />
          </section>
        )}
        {t.scorers.length > 0 && (
          <section className="card">
            <div className="card-head"><h2>{t.sport.scorersTitle}</h2><button className="btn btn-ghost btn-sm" onClick={() => onTab('goleadores')}>Todos</button></div>
            <ScorerList t={t} teams={teams} limit={5} />
          </section>
        )}
      </aside>
    </div>
  );
}

function MiniTable({ rows, teams }: { rows: Tournament['standings'][number]['rows']; teams: Map<number, Team> }) {
  return (
    <ul className="mini-table">
      {rows.map((r, i) => (
        <li key={r.teamId}>
          <span className="faint num">{i + 1}</span>
          <TeamBadge team={teams.get(r.teamId)} size={24} />
          <span className="mini-name">{teams.get(r.teamId)?.name}</span>
          {r.live && <span className="live-dot" />}
          <span className="muted num">{r.played} PJ</span>
          <strong className="num">{r.points}</strong>
        </li>
      ))}
    </ul>
  );
}

function NextRound({ t, teams }: { t: Tournament; teams: Map<number, Team> }) {
  const pending = t.matches.filter((m) => m.stage === 'KNOCKOUT' && m.status !== 'FINISHED');
  const round = pending.length ? Math.min(...pending.map((m) => m.round)) : null;
  const list = t.matches.filter((m) => m.stage === 'KNOCKOUT' && m.round === round);
  if (!list.length) return <p className="empty">Llaves completas.</p>;
  return (
    <ul className="mini-table">
      <li className="faint" style={{ fontSize: 13 }}>{list[0].roundLabel}</li>
      {list.map((m) => (
        <li key={m.id}>
          <TeamBadge team={m.homeId ? teams.get(m.homeId) : null} size={22} />
          <span className="mini-name">{m.homeId ? teams.get(m.homeId)?.shortName : '—'} vs {m.awayId ? teams.get(m.awayId)?.shortName : '—'}</span>
          <TeamBadge team={m.awayId ? teams.get(m.awayId) : null} size={22} />
        </li>
      ))}
    </ul>
  );
}

function Fixtures({ t, teams, now, linkTo }: SectionProps) {
  // Agrupa por fase + jornada/ronda; abre en la que tiene partidos en vivo o pendientes
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; matches: Match[] }>();
    const ordered = [...t.matches].sort((a, b) =>
      (a.stage === 'KNOCKOUT' ? 1 : 0) - (b.stage === 'KNOCKOUT' ? 1 : 0) || a.round - b.round || (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
    for (const m of ordered) {
      const key = `${m.stage === 'KNOCKOUT' ? 'K' : 'L'}-${m.round}`;
      if (!map.has(key)) map.set(key, { label: m.roundLabel, matches: [] });
      map.get(key)!.matches.push(m);
    }
    return [...map.entries()];
  }, [t.matches]);

  const initial = groups.find(([, g]) => g.matches.some((m) => m.status === 'LIVE'))?.[0]
    ?? groups.find(([, g]) => g.matches.some((m) => m.status === 'SCHEDULED'))?.[0]
    ?? groups[groups.length - 1]?.[0];
  const [selected, setSelected] = useState<string | undefined>(initial);
  const current = groups.find(([key]) => key === selected) ?? groups[0];

  if (!groups.length) return <div className="card empty"><h3>Aún no hay calendario</h3></div>;
  return (
    <div className="stack">
      <div className="round-picker">
        {groups.map(([key, g]) => (
          <button key={key} type="button" className={key === current[0] ? 'active' : ''} onClick={() => setSelected(key)}>
            {g.matches.some((m) => m.status === 'LIVE') && <span className="live-dot" />}{g.label}
          </button>
        ))}
      </div>
      <section className="card">
        <div className="card-head"><h2>{current[1].label}</h2><span className="muted">{formatDate(current[1].matches.find((m) => !m.bye)?.scheduledAt)}</span></div>
        {current[1].matches.map((m) => <MatchRow key={m.id} match={m} teams={teams} sport={t.sport} now={now} to={linkTo(m)} showRound={!!m.group} />)}
      </section>
    </div>
  );
}

function Tables({ t, teams }: { t: Tournament; teams: Map<number, Team> }) {
  const league = t.format === 'LEAGUE';
  return (
    <div className="stack">
      {t.standings.map((g) => (
        <section className="card" key={g.group ?? 'liga'}>
          <div className="card-head">
            <h2>{g.group ? `Grupo ${g.group}` : 'Tabla de posiciones'}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {league ? 'El primero es campeón' : `Clasifican ${t.advancePerGroup}`}
            </span>
          </div>
          <Standings group={g} teams={teams} sport={t.sport} highlight={league ? 1 : t.advancePerGroup} league={league} />
        </section>
      ))}
      <p className="faint" style={{ fontSize: 13 }}>
        {t.sport.scoring === 'GOALS' && `Puntos: ${t.sport.winPoints} por victoria, ${t.sport.drawPoints} por empate. Desempate: diferencia de gol, goles a favor y enfrentamiento directo.`}
        {t.sport.scoring === 'POINTS' && `Puntos: ${t.sport.winPoints} por victoria y ${t.sport.lossPoints} por derrota. Desempate: enfrentamiento directo, diferencia y puntos a favor.`}
        {t.sport.scoring === 'SETS' && (t.sport.code === 'VOLEIBOL'
          ? 'Puntos: 3 por ganar 3-0 o 3-1; 2 y 1 en un 3-2. Desempate: victorias, cociente de sets y de puntos.'
          : `Puntos: ${t.sport.winPoints} por victoria. Desempate: victorias, cociente de sets y de juegos.`)}
      </p>
    </div>
  );
}

function ScorerList({ t, teams, limit }: { t: Tournament; teams: Map<number, Team>; limit?: number }) {
  const list = limit ? t.scorers.slice(0, limit) : t.scorers;
  if (!list.length) return <p className="empty">Aún no hay {t.sport.scorersTitle.toLowerCase()}.</p>;
  return (
    <ul>
      {list.map((s, i) => (
        <li className="scorer" key={s.playerId}>
          <span className="scorer-pos">{i + 1}</span>
          <TeamBadge team={teams.get(s.teamId)} size={28} />
          <span className="scorer-name"><strong>{s.player}</strong><small>{teams.get(s.teamId)?.name}</small></span>
          <span className="scorer-value">{s.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Scorers({ t, teams }: { t: Tournament; teams: Map<number, Team> }) {
  return (
    <section className="card">
      <div className="card-head"><h2>{t.sport.scorersTitle}</h2><span className="muted">{t.sport.scoreUnit}</span></div>
      <ScorerList t={t} teams={teams} />
    </section>
  );
}

function Teams({ t }: { t: Tournament }) {
  const single = t.sport.participantLabel !== 'Equipo';
  return (
    <div className="teams-grid">
      {t.teams.map((team) => (
        <section className="card team-card" key={team.id}>
          <div className="row">
            <TeamBadge team={team} size={40} />
            <div>
              <strong>{team.name}</strong>
              <p className="muted" style={{ fontSize: 13 }}>{team.group ? `Grupo ${team.group}` : `Siembra ${team.seed}`}</p>
            </div>
          </div>
          {!single && (team.players.length ? (
            <ul className="roster">
              {team.players.map((p) => <li key={p.id}><span className="num faint">{p.number ?? '—'}</span>{p.name}</li>)}
            </ul>
          ) : <p className="faint" style={{ fontSize: 14 }}>Sin plantilla registrada</p>)}
          {single && team.players.length > 1 && <p className="muted" style={{ fontSize: 14 }}>{team.players.map((p) => p.name).join(' y ')}</p>}
        </section>
      ))}
    </div>
  );
}
