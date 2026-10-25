import { useEffect, useState } from 'react';
import type { MatchStatus, Scoring } from '../api/types';

// Diferencia entre el reloj del servidor y el del dispositivo, para que el minuto no dependa
// de la hora (a veces mal puesta) del celular.
let serverOffset = 0;

export function syncServerTime(serverTime: string | undefined | null) {
  if (!serverTime) return;
  const parsed = Date.parse(serverTime);
  if (!Number.isNaN(parsed)) serverOffset = parsed - Date.now();
}

export function serverNow() {
  return Date.now() + serverOffset;
}

/** Lo mínimo del deporte que necesita el reloj. */
export interface ClockRules {
  scoring: Scoring;
  periods: number;
  periodMinutes: number;
}

/** Lo mínimo del partido que necesita el reloj (sirve para Match y MatchCard). */
export interface ClockState {
  status: MatchStatus;
  period: number;
  periodLabel: string;
  periodStartedAt: string | null;
  clockSpeed: number;
}

export function minutesForPeriod(sport: ClockRules, period: number) {
  if (sport.scoring === 'POINTS' && period > sport.periods) return 5;
  return sport.periodMinutes;
}

export function minutesBeforePeriod(sport: ClockRules, period: number) {
  let total = 0;
  for (let p = 1; p < period; p++) total += minutesForPeriod(sport, p);
  return total;
}

/**
 * Texto del reloj de un partido en vivo:
 * fútbol "67'" o "45+2'", baloncesto "C3 · 04:12" (cuenta regresiva), sets "Set 2".
 */
export function liveClockLabel(match: ClockState, sport: ClockRules, now: number): string {
  if (match.status !== 'LIVE') return '';
  if (sport.scoring === 'SETS' || !match.periodStartedAt) return match.periodLabel;
  const elapsedMin = Math.max(0, ((now - Date.parse(match.periodStartedAt)) * match.clockSpeed) / 60000);
  const length = minutesForPeriod(sport, match.period);

  if (sport.scoring === 'POINTS') {
    const remaining = Math.max(0, Math.round((length - elapsedMin) * 60));
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    return `${match.periodLabel} · ${mm}:${ss}`;
  }
  const before = minutesBeforePeriod(sport, match.period);
  const end = before + length;
  const minute = before + Math.floor(elapsedMin) + 1;
  return minute > end ? `${end}+${minute - end}'` : `${minute}'`;
}

/** Re-renderiza cada segundo mientras {@code active} sea verdadero. */
export function useNow(active: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
