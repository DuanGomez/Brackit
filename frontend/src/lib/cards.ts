import type { Match, MatchCard, Team, Tournament } from '../api/types';

/** Convierte un partido del torneo en tarjeta para reutilizar las filas de partido. */
export function toCard(m: Match, t: Tournament, teams: Map<number, Team>): MatchCard {
  const ref = (id: number | null) => (id && teams.get(id)) || null;
  return {
    id: m.id, tournamentId: t.id, tournamentName: t.name, tournamentSlug: t.slug, sport: t.sport.code, roundLabel: m.roundLabel, group: m.group,
    status: m.status, cancelReason: m.cancelReason, scheduledAt: m.scheduledAt, blockMinutes: t.blockMinutes, courtId: m.courtId,
    courtName: m.courtName, venueName: m.venueName, refereeId: m.refereeId, refereeName: m.refereeName, home: ref(m.homeId), away: ref(m.awayId),
    homeScore: m.homeScore, awayScore: m.awayScore, homePenalties: m.homePenalties, awayPenalties: m.awayPenalties, period: m.period,
    periodLabel: m.periodLabel, periodStartedAt: m.periodStartedAt, clockSpeed: m.clockSpeed, sets: m.sets, winnerId: m.winnerId,
  };
}
