import type { Scoring, SportCode } from '../api/types';

/** Identidad y reglas de tiempo de cada deporte (espejo de Sport.java para el reloj del cliente). */
export interface SportLook {
  code: SportCode;
  label: string;
  color: string;
  photo: string;
  scoring: Scoring;
  periods: number;
  periodMinutes: number;
  /** "Equipo", "Jugador" o "Pareja". */
  participant: string;
}

const base = import.meta.env.BASE_URL;

export const SPORTS: Record<SportCode, SportLook> = {
  FUTBOL: { code: 'FUTBOL', label: 'Fútbol', color: '#18C46A', photo: `${base}sports/futbol.webp`, scoring: 'GOALS', periods: 2, periodMinutes: 45, participant: 'Equipo' },
  FUTBOL_SALA: { code: 'FUTBOL_SALA', label: 'Fútbol sala', color: '#0EA5A4', photo: `${base}sports/futbol-sala.webp`, scoring: 'GOALS', periods: 2, periodMinutes: 20, participant: 'Equipo' },
  BALONCESTO: { code: 'BALONCESTO', label: 'Baloncesto', color: '#FF7A1A', photo: `${base}sports/baloncesto.webp`, scoring: 'POINTS', periods: 4, periodMinutes: 10, participant: 'Equipo' },
  VOLEIBOL: { code: 'VOLEIBOL', label: 'Voleibol', color: '#D4A017', photo: `${base}sports/voleibol.webp`, scoring: 'SETS', periods: 0, periodMinutes: 0, participant: 'Equipo' },
  TENIS: { code: 'TENIS', label: 'Tenis', color: '#7CB518', photo: `${base}sports/tenis.webp`, scoring: 'SETS', periods: 0, periodMinutes: 0, participant: 'Jugador' },
  PADEL: { code: 'PADEL', label: 'Pádel', color: '#1F5BFF', photo: `${base}sports/padel.webp`, scoring: 'SETS', periods: 0, periodMinutes: 0, participant: 'Pareja' },
  BALONMANO: { code: 'BALONMANO', label: 'Balonmano', color: '#AF52DE', photo: `${base}sports/balonmano.webp`, scoring: 'GOALS', periods: 2, periodMinutes: 30, participant: 'Equipo' },
};

export const SPORT_ORDER: SportCode[] = ['FUTBOL', 'FUTBOL_SALA', 'BALONCESTO', 'VOLEIBOL', 'TENIS', 'PADEL', 'BALONMANO'];
