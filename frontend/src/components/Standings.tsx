import type { Sport, StandingsGroup, Team } from '../api/types';
import { TeamBadge } from './TeamBadge';
import './match.css';

interface Props {
  group: StandingsGroup;
  teams: Map<number, Team>;
  sport: Sport;
  /** Cuántos clasifican (grupos) o 1 para resaltar al líder (liga). */
  highlight: number;
  league: boolean;
}

/** Tabla de posiciones con las columnas que importan en cada deporte. */
export function Standings({ group, teams, sport, highlight, league }: Props) {
  const goals = sport.scoring === 'GOALS';
  const sets = sport.scoring === 'SETS';
  const forLabel = goals ? 'GF' : sets ? 'SG' : 'PF';
  const againstLabel = goals ? 'GC' : sets ? 'SP' : 'PC';

  return (
    <div className="table-scroll">
      <table className="standings">
        <thead>
          <tr>
            <th className="st-pos">#</th>
            <th className="st-team">{sport.participantLabel}</th>
            <th title="Partidos jugados">PJ</th>
            <th title="Ganados">G</th>
            {goals && <th title="Empatados">E</th>}
            <th title="Perdidos">P</th>
            <th className="hide-sm" title={goals ? 'Goles a favor' : sets ? 'Sets ganados' : 'Puntos a favor'}>{forLabel}</th>
            <th className="hide-sm" title={goals ? 'Goles en contra' : sets ? 'Sets perdidos' : 'Puntos en contra'}>{againstLabel}</th>
            <th title="Diferencia">{sets ? 'Dif' : goals ? 'DG' : 'Dif'}</th>
            <th title="Puntos en la tabla">Pts</th>
            <th className="hide-sm">Racha</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row, index) => {
            const team = teams.get(row.teamId);
            const qualifies = index < highlight && row.played > 0;
            return (
              <tr key={row.teamId} className={qualifies ? (league ? 'qualify leader' : 'qualify') : ''}>
                <td className="st-pos">{index + 1}</td>
                <td className="st-team">
                  <div className="st-team-cell">
                    <TeamBadge team={team} size={26} />
                    <span>{team?.name}</span>
                    {row.live && <span className="st-live"><span className="live-dot" />Vivo</span>}
                  </div>
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                {goals && <td>{row.drawn}</td>}
                <td>{row.lost}</td>
                <td className="hide-sm">{row.scoreFor}</td>
                <td className="hide-sm">{row.scoreAgainst}</td>
                <td>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                <td className="st-pts">{row.points}</td>
                <td className="hide-sm">
                  <span className="form">
                    {row.form.map((f, i) => <span key={i} className={f}>{f}</span>)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
