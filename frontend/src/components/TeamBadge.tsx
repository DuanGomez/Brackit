import type { Team } from '../api/types';

/** Escudo circular con la abreviatura y el color del equipo. */
export function TeamBadge({ team, size = 32 }: { team: Team | null | undefined; size?: number }) {
  if (!team) {
    return <span className="badge" style={{ width: size, height: size, background: '#d1d1d6', fontSize: size * 0.36 }}>?</span>;
  }
  const label = team.shortName.slice(0, 3);
  return (
    <span
      className="badge"
      title={team.name}
      style={{ width: size, height: size, background: team.color, fontSize: size * (label.length > 2 ? 0.3 : 0.36) }}
    >
      {label}
    </span>
  );
}
