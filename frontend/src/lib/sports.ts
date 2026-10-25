import type { SportCode } from '../api/types';

/** Identidad visual de cada deporte: nombre, color y foto (public/sports/*.webp, CC0). */
export interface SportLook {
  code: SportCode;
  label: string;
  color: string;
  photo: string;
}

const base = import.meta.env.BASE_URL;

export const SPORTS: Record<SportCode, SportLook> = {
  FUTBOL: { code: 'FUTBOL', label: 'Fútbol', color: '#1F9D55', photo: `${base}sports/futbol.webp` },
  FUTBOL_SALA: { code: 'FUTBOL_SALA', label: 'Fútbol sala', color: '#0E8C7E', photo: `${base}sports/futbol-sala.webp` },
  BALONCESTO: { code: 'BALONCESTO', label: 'Baloncesto', color: '#E06A12', photo: `${base}sports/baloncesto.webp` },
  VOLEIBOL: { code: 'VOLEIBOL', label: 'Voleibol', color: '#D69A00', photo: `${base}sports/voleibol.webp` },
  TENIS: { code: 'TENIS', label: 'Tenis', color: '#6A9A10', photo: `${base}sports/tenis.webp` },
  PADEL: { code: 'PADEL', label: 'Pádel', color: '#2F6FED', photo: `${base}sports/padel.webp` },
  BALONMANO: { code: 'BALONMANO', label: 'Balonmano', color: '#8E44AD', photo: `${base}sports/balonmano.webp` },
};

export const SPORT_ORDER: SportCode[] = ['FUTBOL', 'FUTBOL_SALA', 'BALONCESTO', 'VOLEIBOL', 'TENIS', 'PADEL', 'BALONMANO'];

export const HERO_PHOTO = `${base}sports/estadio.webp`;
