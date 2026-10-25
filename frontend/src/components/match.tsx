import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Match, MatchCard, MatchDetail, MatchEvent, SportCode, StandingsGroup, Team, TeamRef } from '../api/types';
import { liveClockLabel, type ClockState } from '../lib/clock';
import { formatDateTime, formatTime } from '../lib/format';
import { SPORTS } from '../lib/sports';
import { Icon } from './Icon';
import { TeamBadge } from './TeamBadge';
import './match.css';

type Status = ClockState & { scheduledAt: string | null; cancelReason?: string | null };

/** Chip con el estado del partido en los colores de estado de Brackit. */
export function StatusChip({ m, sport, now, withDate }: { m: Status; sport: SportCode; now: number; withDate?: boolean }) {
  switch (m.status) {
    case 'FINISHED':
      return <span className="chip chip-done">Finalizado</span>;
    case 'CANCELLED':
      return <span className="chip chip-cancel">Cancelado</span>;
    case 'LIVE':
      return <span className="chip chip-live num"><span className="dot dot-live" />En vivo {liveClockLabel(m, SPORTS[sport], now)}</span>;
    default:
      return <span className="chip chip-sched num">{m.scheduledAt ? (withDate ? formatDateTime(m.scheduledAt) : formatTime(m.scheduledAt)) : 'Sin programar'}</span>;
  }
}

/** Fila de partido de las listas del panel: estado, equipos con marcador y cancha. */
export function MatchLine({ m, now, to, showTournament, withDate, action }: {
  m: MatchCard; now: number; to?: string; showTournament?: boolean; withDate?: boolean; action?: ReactNode;
}) {
  const live = m.status === 'LIVE';
  const cancelled = m.status === 'CANCELLED';
  const played = m.status === 'FINISHED' || live;
  const body = (
    <>
      <div className="ml-status"><StatusChip m={m} sport={m.sport} now={now} withDate={withDate} /></div>
      <div className={`ml-teams ${cancelled ? 'cancelled' : ''}`}>
        <span className={`ml-team home ${m.winnerId && m.winnerId !== m.home?.id ? 'lost' : ''}`}>{m.home?.name ?? 'Por definir'}</span>
        {played ? <b className="ml-score num">{m.homeScore} - {m.awayScore}</b> : <span className="ml-vs">vs</span>}
        <span className={`ml-team ${m.winnerId && m.winnerId !== m.away?.id ? 'lost' : ''}`}>{m.away?.name ?? 'Por definir'}</span>
        {showTournament && <small className="ml-sub">{m.tournamentName} · {m.roundLabel}</small>}
      </div>
      <div className="ml-meta">
        <span>{cancelled ? (m.cancelReason ?? 'Cancelado') : m.courtName ?? 'Sin cancha'}</span>
        {action}
      </div>
    </>
  );
  const cls = `match-line ${live ? 'live' : ''}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Marcador grande: página del partido y consola del árbitro. */
export function Scoreboard({ detail, now, dark }: { detail: MatchDetail; now: number; dark?: boolean }) {
  const { match, home, away, sport } = detail;
  const live = match.status === 'LIVE';
  const done = match.status === 'FINISHED';
  return (
    <div className={`scoreboard ${dark ? 'dark' : ''}`}>
      <div className="sb-status">
        {live ? <span className="chip chip-live num sb-chip"><span className="dot dot-live" />En vivo · {liveClockLabel(match, sport, now)}</span>
          : done ? <span className="chip chip-done sb-chip">Final{match.homePenalties != null ? ' · penales' : ''}</span>
          : match.status === 'CANCELLED' ? <span className="chip chip-cancel sb-chip">Cancelado</span>
          : <span className="chip chip-sched sb-chip num">{formatDateTime(match.scheduledAt)}</span>}
      </div>
      <div className="sb-main">
        <div className={`sb-team ${done && match.winnerId === home?.id ? 'won' : ''}`}><TeamBadge team={home} size={64} /><strong>{home?.name ?? 'Por definir'}</strong></div>
        <div className="sb-score num">
          {match.status === 'SCHEDULED' || match.status === 'CANCELLED' ? <span className="sb-vs">vs</span>
            : <>{match.homeScore}<span className="sb-colon">:</span>{match.awayScore}</>}
        </div>
        <div className={`sb-team ${done && match.winnerId === away?.id ? 'won' : ''}`}><TeamBadge team={away} size={64} /><strong>{away?.name ?? 'Por definir'}</strong></div>
      </div>
      {match.homePenalties != null && <p className="sb-note num">Penales {match.homePenalties} - {match.awayPenalties}</p>}
      {sport.scoring === 'SETS' && match.sets.length > 0 && (
        <div className="sb-sets">
          {match.sets.map((s, i) => (
            <div key={i} className={`sb-set ${!s.finished && live ? 'current' : ''}`}>
              <small>Set {i + 1}</small>
              <span className={`num ${s.finished && s.home > s.away ? 'w' : ''}`}>{s.home}</span>
              <span className={`num ${s.finished && s.away > s.home ? 'w' : ''}`}>{s.away}</span>
            </div>
          ))}
        </div>
      )}
      <p className="sb-note">{[match.roundLabel, match.courtName, match.venueName].filter(Boolean).join(' · ')}</p>
    </div>
  );
}

function eventMark(e: MatchEvent) {
  switch (e.type) {
    case 'YELLOW_CARD': return <span className="ev-card" style={{ background: '#FFD60A' }} />;
    case 'RED_CARD': return <span className="ev-card" style={{ background: '#FF3B30' }} />;
    case 'SUSPENSION': return <span className="ev-tag">2'</span>;
    case 'FOUL': return <span className="ev-tag">F</span>;
    case 'POINT_1': return <span className="ev-tag strong">+1</span>;
    case 'POINT_2': return <span className="ev-tag strong">+2</span>;
    case 'POINT_3': return <span className="ev-tag strong">+3</span>;
    default: return <span className="ev-goal"><Icon name="FUTBOL" size={15} /></span>;
  }
}

/** Minuto a minuto (no aplica en deportes de sets). */
export function Timeline({ detail, limit }: { detail: MatchDetail; limit?: number }) {
  const { events, home, away } = detail;
  const shown = [...events].reverse().slice(0, limit ?? 80);
  if (!shown.length) return <p className="empty">Todavía no hay acciones registradas.</p>;
  return (
    <ul className="timeline">
      {shown.map((e) => {
        const isHome = e.teamId === home?.id;
        return (
          <li key={e.id}>
            <span className="ev-min num">{e.minute != null ? `${e.minute}'` : e.setIndex != null ? `S${e.setIndex + 1}` : ''}</span>
            {eventMark(e)}
            <span className="ev-text">
              <strong>{e.playerName ?? (isHome ? home?.name : away?.name)}</strong>
              <small>{e.label} · {isHome ? home?.shortName : away?.shortName}</small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Tabla de posiciones con las columnas de cada deporte. */
export function Standings({ group, teams, sport, highlight, live }: {
  group: StandingsGroup; teams: Map<number, Team>; sport: SportCode; highlight: number; live?: boolean;
}) {
  const scoring = SPORTS[sport].scoring;
  const goals = scoring === 'GOALS';
  const sets = scoring === 'SETS';
  return (
    <div className="table-scroll">
      <table className="standings">
        <thead>
          <tr>
            <th className="left">#</th>
            <th className="left">{SPORTS[sport].participant}</th>
            <th>PJ</th><th className="hide-xs">G</th>{goals && <th className="hide-xs">E</th>}<th className="hide-xs">P</th>
            <th className="hide-sm">{goals ? 'GF' : sets ? 'SG' : 'PF'}</th>
            <th className="hide-sm">{goals ? 'GC' : sets ? 'SP' : 'PC'}</th>
            <th>{goals ? 'DG' : 'Dif'}</th><th>Pts</th><th className="hide-sm">Racha</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((r, i) => {
            const team = teams.get(r.teamId);
            return (
              <tr key={r.teamId} className={r.live && live !== false ? 'is-live' : ''}>
                <td className="left faint">{i + 1}</td>
                <td className="left">
                  <span className="st-team">
                    <span className="st-bar" style={{ background: i < highlight && r.played > 0 ? 'var(--green)' : 'transparent' }} />
                    <TeamBadge team={team} size={24} />
                    <span className="st-name">{team?.name}</span>
                    {r.live && <span className="st-live">En vivo</span>}
                  </span>
                </td>
                <td>{r.played}</td><td className="hide-xs">{r.won}</td>{goals && <td className="hide-xs">{r.drawn}</td>}<td className="hide-xs">{r.lost}</td>
                <td className="hide-sm">{r.scoreFor}</td><td className="hide-sm">{r.scoreAgainst}</td>
                <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                <td className="st-pts">{r.points}</td>
                <td className="hide-sm"><span className="form">{r.form.map((f, k) => <span key={k} className={`f-${f}`} title={f === 'G' ? 'Ganó' : f === 'E' ? 'Empató' : 'Perdió'} />)}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Llaves de eliminación: una columna por ronda, y el tercer puesto aparte. */
export function Bracket({ matches, teams, sport, now, linkTo }: {
  matches: Match[]; teams: Map<number, Team>; sport: SportCode; now: number; linkTo?: (m: Match) => string;
}) {
  const knockout = matches.filter((m) => m.stage === 'KNOCKOUT');
  const third = matches.find((m) => m.stage === 'THIRD_PLACE');
  const rounds = [...new Set(knockout.map((m) => m.round))].sort((a, b) => a - b);
  const ref = (id: number | null): TeamRef | null => (id ? teams.get(id) ?? null : null);

  const box = (m: Match) => {
    const done = m.status === 'FINISHED';
    const side = (id: number | null, score: number, pens: number | null) => {
      const t = ref(id);
      const won = done && m.winnerId != null && m.winnerId === id;
      const lost = done && m.winnerId != null && m.winnerId !== id;
      return (
        <div className={`bk-team ${won ? 'won' : ''} ${lost ? 'lost' : ''}`}>
          <TeamBadge team={t} size={20} />
          <span className="bk-name">{t?.name ?? (m.bye && !id ? 'Pasa directo' : 'Por definir')}</span>
          {!m.bye && (m.status === 'FINISHED' || m.status === 'LIVE') && <b className="num">{score}{pens != null && <small className="faint"> ({pens})</small>}</b>}
        </div>
      );
    };
    const content = (
      <>
        {side(m.homeId, m.homeScore, m.homePenalties)}
        {side(m.awayId, m.awayScore, m.awayPenalties)}
        <div className="bk-foot">
          <StatusChip m={m} sport={sport} now={now} withDate />
          {SPORTS[sport].scoring === 'SETS' && m.sets.length > 0 && <span className="num faint">{m.sets.map((s) => `${s.home}-${s.away}`).join(' ')}</span>}
        </div>
      </>
    );
    const cls = `bk-match ${m.status === 'LIVE' ? 'live' : ''}`;
    return linkTo && m.homeId && m.awayId && !m.bye
      ? <Link key={m.id} to={linkTo(m)} className={cls}>{content}</Link>
      : <div key={m.id} className={cls}>{content}</div>;
  };

  return (
    <div className="bracket">
      {rounds.map((r) => {
        const list = knockout.filter((m) => m.round === r).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        return (
          <div className="bk-round" key={r}>
            <h4>{list[0]?.roundLabel}</h4>
            <div className="bk-col">{list.map(box)}</div>
          </div>
        );
      })}
      {third && (
        <div className="bk-round">
          <h4>Tercer puesto</h4>
          <div className="bk-col">{box(third)}</div>
        </div>
      )}
    </div>
  );
}
