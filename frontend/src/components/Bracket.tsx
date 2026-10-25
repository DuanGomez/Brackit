import { Link } from 'react-router';
import type { Match, Sport, Team } from '../api/types';
import { liveClockLabel } from '../lib/clock';
import { formatDate } from '../lib/format';
import { TeamBadge } from './TeamBadge';
import './match.css';

interface Props {
  matches: Match[];
  teams: Map<number, Team>;
  sport: Sport;
  now: number;
  linkTo: (match: Match) => string;
}

/** Llaves de eliminación: una columna por ronda, alineadas para que se vea el camino a la final. */
export function Bracket({ matches, teams, sport, now, linkTo }: Props) {
  const knockout = matches.filter((m) => m.stage === 'KNOCKOUT');
  const rounds = [...new Set(knockout.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="bracket">
      {rounds.map((round) => {
        const list = knockout.filter((m) => m.round === round).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        return (
          <div className="bracket-round" key={round}>
            <h4>{list[0]?.roundLabel}</h4>
            <div className="bracket-col">
              {list.map((m) => <BracketMatch key={m.id} match={m} teams={teams} sport={sport} now={now} to={linkTo(m)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BracketMatch({ match, teams, sport, now, to }: { match: Match; teams: Map<number, Team>; sport: Sport; now: number; to: string }) {
  const done = match.status === 'FINISHED';
  const live = match.status === 'LIVE';
  const side = (teamId: number | null, score: number, pens: number | null) => {
    const team = teamId ? teams.get(teamId) : null;
    const won = done && match.winnerId != null && match.winnerId === teamId;
    const lost = done && match.winnerId != null && match.winnerId !== teamId;
    return (
      <div className={`bm-team ${won ? 'won' : ''} ${lost ? 'lost' : ''}`}>
        <TeamBadge team={team} size={22} />
        <span className="bm-name">{team?.name ?? (match.bye && teamId == null ? 'Pasa directo' : 'Por definir')}</span>
        {!match.bye && match.status !== 'SCHEDULED' && (
          <span className="bm-score">{score}{pens != null && <small className="faint"> ({pens})</small>}</span>
        )}
      </div>
    );
  };

  const body = (
    <>
      {side(match.homeId, match.homeScore, match.homePenalties)}
      {side(match.awayId, match.awayScore, match.awayPenalties)}
      <div className="bm-foot">
        {live ? <span className="live">En vivo · {liveClockLabel(match, sport, now)}</span>
          : done ? <span>{match.bye ? 'Sin rival' : 'Final'}</span>
          : <span>{formatDate(match.scheduledAt)}</span>}
        {sport.scoring === 'SETS' && match.sets.length > 0 && (
          <span className="num">{match.sets.map((s) => `${s.home}-${s.away}`).join(' ')}</span>
        )}
      </div>
    </>
  );

  return match.bye || !match.homeId || !match.awayId ? (
    <div className="bracket-match">{body}</div>
  ) : (
    <Link to={to} className={`bracket-match ${live ? 'live' : ''}`}>{body}</Link>
  );
}
