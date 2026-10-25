import type { TeamRef } from '../api/types';

/** Escudo circular con la abreviatura y el color del equipo. */
export function TeamBadge({ team, size = 30 }: { team: TeamRef | null | undefined; size?: number }) {
  if (!team) {
    return <span className="team-badge" style={{ width: size, height: size, background: 'var(--fill)', color: 'var(--faint)', fontSize: size * 0.36 }}>?</span>;
  }
  const label = team.shortName.slice(0, 3);
  const light = isLight(team.color);
  return (
    <span className="team-badge" title={team.name}
      style={{ width: size, height: size, background: team.color, color: light ? '#1D1D1F' : '#fff', fontSize: size * (label.length > 2 ? 0.31 : 0.37) }}>
      {label}
    </span>
  );
}

/** Colores claros (amarillos, cian) llevan texto oscuro para que se lean. */
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
