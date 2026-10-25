import type { MatchDetail } from '../api/types';
import { liveClockLabel } from '../lib/clock';
import { formatDateTime } from '../lib/format';
import { TeamBadge } from './TeamBadge';
import './scoreboard.css';

/** Marcador grande compartido por la página pública y la consola del árbitro. */
export function Scoreboard({ detail, now, compact }: { detail: MatchDetail; now: number; compact?: boolean }) {
  const { match, home, away, sport } = detail;
  const live = match.status === 'LIVE';
  const done = match.status === 'FINISHED';

  return (
    <div className={`scoreboard ${compact ? 'compact' : ''}`}>
      <div className="sb-status">
        {live ? (
          <span className="sb-live"><span className="live-dot" />{liveClockLabel(match, sport, now)}</span>
        ) : done ? (
          <span className="sb-final">Final{match.homePenalties != null ? ' · penales' : ''}</span>
        ) : (
          <span className="sb-when">{formatDateTime(match.scheduledAt)}</span>
        )}
      </div>
      <div className="sb-main">
        <div className={`sb-team ${done && match.winnerId === home?.id ? 'won' : ''}`}>
          <TeamBadge team={home} size={compact ? 48 : 72} />
          <strong>{home?.name ?? 'Por definir'}</strong>
        </div>
        <div className={`sb-score num ${live ? 'is-live' : ''}`}>
          {match.status === 'SCHEDULED' ? <span className="sb-vs">vs</span> : (
            <>
              <span>{match.homeScore}</span>
              <span className="sb-dash">:</span>
              <span>{match.awayScore}</span>
            </>
          )}
        </div>
        <div className={`sb-team ${done && match.winnerId === away?.id ? 'won' : ''}`}>
          <TeamBadge team={away} size={compact ? 48 : 72} />
          <strong>{away?.name ?? 'Por definir'}</strong>
        </div>
      </div>
      {match.homePenalties != null && (
        <p className="sb-pens num">Penales {match.homePenalties} - {match.awayPenalties}</p>
      )}
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
      {sport.scoring === 'SETS' && <p className="sb-unit">{sport.scoreUnit} por set · gana quien llegue a {sport.setsToWin} sets</p>}
    </div>
  );
}
