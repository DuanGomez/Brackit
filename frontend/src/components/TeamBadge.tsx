import { useState } from 'react';
import type { TeamRef } from '../api/types';
import { API_URL } from '../config';

/** Escudo del equipo: la foto que subió la organización o el escudo generado por el servidor. */
export function teamLogoUrl(team: { id: number; logo?: string }) {
  return `${API_URL}/api/public/teams/${team.id}/logo${team.logo ? `?v=${team.logo}` : ''}`;
}

/** Vista previa de un escudo generado, para el editor. */
export function crestPreviewUrl(style: number, color: string, color2: string, label: string) {
  const q = new URLSearchParams({ style: String(style), color, color2, label: label.slice(0, 3) });
  return `${API_URL}/api/public/crest?${q}`;
}

export function TeamBadge({ team, size = 30 }: { team: TeamRef | null | undefined; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!team) {
    return <span className="team-badge" style={{ width: size, height: size, background: 'var(--fill)', color: 'var(--faint)', fontSize: size * 0.36 }}>?</span>;
  }
  const src = teamLogoUrl(team);
  if (failed !== src) {
    return (
      <img className="team-logo" src={src} alt="" title={team.name} width={size} height={size} loading="lazy" decoding="async"
        onError={() => setFailed(src)} style={{ width: size, height: size }} />
    );
  }
  // Sin conexión con el servidor: círculo con la abreviatura
  const label = team.shortName.slice(0, 3);
  return (
    <span className="team-badge" title={team.name}
      style={{ width: size, height: size, background: team.color, color: isLight(team.color) ? '#1D1D1F' : '#fff', fontSize: size * (label.length > 2 ? 0.31 : 0.37) }}>
      {label}
    </span>
  );
}

/** Colores claros (amarillos, cian) llevan texto oscuro para que se lean. */
export function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
