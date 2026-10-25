import { Link } from 'react-router';
import type { Match, Sport, Team } from '../api/types';
import { liveClockLabel } from '../lib/clock';
import { formatTime } from '../lib/format';
import { TeamBadge } from './TeamBadge';
import './match.css';

interface Props {
  match: Match;
  teams: Map<number, Team>;
  sport: Sport;
  now: number;
  to?: string;
  showRound?: boolean;
}

/** Fila de partido: equipos, marcador o estado, y reloj si está en vivo. */
export function MatchRow({ match, teams, sport, now, to, showRound }: Props) {
  const home = match.homeId ? teams.get(match.homeId) : null;
  const away = match.awayId ? teams.get(match.awayId) : null;
  const live = match.status === 'LIVE';
  const done = match.status === 'FINISHED';
  const homeWon = done && match.winnerId === match.homeId;
  const awayWon = done && match.winnerId === match.awayId;

  const content = (
    <>
      <div className="mr-meta">
        {live ? (
          <span className="mr-live"><span className="live-dot" />{liveClockLabel(match, sport, now)}</span>
        ) : done ? (
          <span className="faint">Final</span>
        ) : (
          <span className="num">{formatTime(match.scheduledAt) || '—'}</span>
        )}
        {showRound && <span className="mr-round">{match.group ? `Grupo ${match.group} · ` : ''}{match.roundLabel}</span>}
      </div>

      <div className={`mr-team mr-home ${homeWon ? 'won' : ''} ${done && !homeWon && match.winnerId ? 'lost' : ''}`}>
        <span className="mr-name">{home?.name ?? 'Por definir'}</span>
        <TeamBadge team={home} size={28} />
      </div>

      <div className={`mr-score ${live ? 'is-live' : ''}`}>
        {match.bye ? (
          <span className="mr-vs">Pasa directo</span>
        ) : match.status === 'SCHEDULED' ? (
          <span className="mr-vs">vs</span>
        ) : (
          <>
            <span className="num">{match.homeScore}</span>
            <span className="mr-sep">-</span>
            <span className="num">{match.awayScore}</span>
          </>
        )}
      </div>

      <div className={`mr-team mr-away ${awayWon ? 'won' : ''} ${done && !awayWon && match.winnerId ? 'lost' : ''}`}>
        <TeamBadge team={away} size={28} />
        <span className="mr-name">{match.bye ? '' : away?.name ?? 'Por definir'}</span>
      </div>

      <div className="mr-extra">
        {match.homePenalties != null && <span className="faint num">Penales {match.homePenalties}-{match.awayPenalties}</span>}
        {sport.scoring === 'SETS' && match.sets.length > 0 && (
          <span className="mr-sets num">
            {match.sets.map((s, i) => (
              <span key={i} className={!s.finished ? 'current' : ''}>{s.home}-{s.away}</span>
            ))}
          </span>
        )}
      </div>
    </>
  );

  return to && !match.bye ? (
    <Link to={to} className={`match-row ${live ? 'live' : ''}`}>{content}</Link>
  ) : (
    <div className={`match-row ${live ? 'live' : ''}`}>{content}</div>
  );
}
