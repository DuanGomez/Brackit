import type { Format, TournamentStatus } from '../api/types';

const LOCALE = 'es-CO';

export function formatDate(iso: string | null | undefined, withYear = false) {
  if (!iso) return 'Por definir';
  const date = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return date.toLocaleDateString(LOCALE, {
    weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'Fecha por definir';
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** Clave de día local (AAAA-MM-DD) para agrupar partidos. */
export function dayKey(iso: string | null) {
  if (!iso) return 'sin-fecha';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isToday(iso: string | null) {
  return iso != null && dayKey(iso) === dayKey(new Date().toISOString());
}

export const FORMAT_LABEL: Record<Format, string> = {
  LEAGUE: 'Liga',
  KNOCKOUT: 'Eliminación directa',
  GROUPS_KNOCKOUT: 'Grupos y eliminación',
};

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En juego',
  FINISHED: 'Finalizado',
};

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
