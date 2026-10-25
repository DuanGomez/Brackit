import { describe, expect, it } from 'vitest';
import type { Match, Sport } from '../api/types';
import { liveClockLabel, minutesBeforePeriod } from './clock';

const sport = (over: Partial<Sport>): Sport => ({
  code: 'FUTBOL', label: 'Fútbol', scoring: 'GOALS', periods: 2, periodMinutes: 45, setsToWin: 0, setTarget: 0,
  lastSetTarget: 0, allowsDraw: true, winPoints: 3, drawPoints: 1, lossPoints: 0, scorersTitle: '', scoreUnit: '',
  participantLabel: 'Equipo', events: [], ...over,
});

const match = (over: Partial<Match>): Match => ({
  id: 1, stage: 'LEAGUE', round: 1, roundLabel: 'Jornada 1', group: null, position: null, homeId: 1, awayId: 2,
  scheduledAt: null, venue: null, status: 'LIVE', period: 1, periodLabel: '1T', periodStartedAt: '2026-10-25T15:00:00Z',
  clockSpeed: 1, homeScore: 0, awayScore: 0, homePenalties: null, awayPenalties: null, sets: [], winnerId: null, bye: false,
  ...over,
});

const at = (minutes: number) => Date.parse('2026-10-25T15:00:00Z') + minutes * 60000;

describe('reloj en vivo', () => {
  it('fútbol cuenta el minuto en curso y suma los tiempos anteriores', () => {
    expect(liveClockLabel(match({}), sport({}), at(0.5))).toBe("1'");
    expect(liveClockLabel(match({ period: 2 }), sport({}), at(21.2))).toBe("67'");
  });

  it('fútbol muestra el tiempo añadido', () => {
    expect(liveClockLabel(match({}), sport({}), at(46.5))).toBe("45+2'");
  });

  it('respeta la velocidad del reloj (simulación de la demo)', () => {
    expect(liveClockLabel(match({ clockSpeed: 9 }), sport({}), at(2))).toBe("19'");
  });

  it('baloncesto cuenta hacia atrás dentro del cuarto', () => {
    const basket = sport({ code: 'BALONCESTO', scoring: 'POINTS', periods: 4, periodMinutes: 10 });
    expect(liveClockLabel(match({ periodLabel: 'C2', period: 2 }), basket, at(2.5))).toBe('C2 · 07:30');
    expect(liveClockLabel(match({ periodLabel: 'C4', period: 4 }), basket, at(12))).toBe('C4 · 00:00');
  });

  it('la prórroga de baloncesto dura 5 minutos', () => {
    const basket = sport({ code: 'BALONCESTO', scoring: 'POINTS', periods: 4, periodMinutes: 10 });
    expect(minutesBeforePeriod(basket, 5)).toBe(40);
    expect(liveClockLabel(match({ periodLabel: 'Prórroga 1', period: 5 }), basket, at(1))).toBe('Prórroga 1 · 04:00');
  });

  it('en deportes de sets muestra el set y nada para partidos sin empezar', () => {
    const volley = sport({ code: 'VOLEIBOL', scoring: 'SETS' });
    expect(liveClockLabel(match({ periodLabel: 'Set 3', period: 3 }), volley, at(5))).toBe('Set 3');
    expect(liveClockLabel(match({ status: 'SCHEDULED' }), sport({}), at(5))).toBe('');
  });
});
