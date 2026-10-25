import type { Format, MatchStatus, Role, TournamentStatus } from '../api/types';

const LOCALE = 'es-CO';
export const TIME_ZONE = 'America/Bogota';

export function formatDate(iso: string | null | undefined, opts: { year?: boolean; weekday?: 'long' | 'short' } = {}) {
  if (!iso) return 'Por definir';
  const date = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return date.toLocaleDateString(LOCALE, {
    timeZone: TIME_ZONE, weekday: opts.weekday ?? 'short', day: 'numeric', month: 'short', ...(opts.year ? { year: 'numeric' } : {}),
  });
}

export function formatLongDate(iso: string) {
  const date = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  const text = date.toLocaleDateString(LOCALE, { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(LOCALE, { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'Sin programar';
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** Fecha local de Bogotá (AAAA-MM-DD) de un instante. */
export function dayKey(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return parts;
}

export function todayKey() {
  return dayKey(new Date());
}

export function addDays(key: string, days: number) {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Minutos desde la medianoche (hora de Bogotá) de un instante. */
export function minutesOfDay(iso: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  const [h, m] = parts.split(':').map(Number);
  return (h % 24) * 60 + m;
}

/** Instante ISO para una fecha (AAAA-MM-DD) y hora "HH:mm" de Bogotá (UTC-5, sin horario de verano). */
export function bogotaInstant(day: string, time: string) {
  return new Date(`${day}T${time}:00-05:00`).toISOString();
}

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hour12: false }).format(new Date()));
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export const FORMAT_LABEL: Record<Format, string> = {
  LEAGUE: 'Liga',
  KNOCKOUT: 'Eliminación directa',
  GROUPS_KNOCKOUT: 'Grupos y fase final',
};

export const TOURNAMENT_STATUS: Record<TournamentStatus, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
};

export const MATCH_STATUS: Record<MatchStatus, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  COORDINATOR: 'Coordinador',
  REFEREE: 'Árbitro',
};

export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function timeAgoOrIn(iso: string) {
  const diff = Date.parse(iso) - Date.now();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return mins >= 0 ? `en ${mins} min` : `hace ${-mins} min`;
  return formatDateTime(iso);
}
