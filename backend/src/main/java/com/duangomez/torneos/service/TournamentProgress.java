package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Team;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.engine.BracketGenerator;
import com.duangomez.torneos.engine.StandingsCalculator.Row;
import com.duangomez.torneos.web.ApiException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/** Qué pasa después de cada resultado: avanzar en la llave, cerrar grupos o coronar campeón. */
@Component
public class TournamentProgress {

    private final SchedulingService scheduling;

    public TournamentProgress(SchedulingService scheduling) {
        this.scheduling = scheduling;
    }

    /**
     * Aplica las consecuencias de un partido terminado (o corregido).
     *
     * @param previousWinner ganador anterior si es una corrección; null si es la primera vez
     * @return true si cambió la estructura del torneo (llaves, fase final o campeón)
     */
    public boolean onFinished(Match match, Long previousWinner) {
        Tournament t = match.getTournament();
        return switch (match.getStage()) {
            case KNOCKOUT -> advanceKnockout(t, match, previousWinner);
            case THIRD_PLACE -> false;
            case LEAGUE -> closeLeagueIfDone(t);
            case GROUP -> closeGroupsIfDone(t);
        };
    }

    private boolean advanceKnockout(Tournament t, Match match, Long previousWinner) {
        int totalRounds = TournamentViews.knockoutRounds(t);
        Team winner = winnerTeam(match);
        if (winner == null) return false;

        if (match.getRoundNumber() == totalRounds) {
            t.setChampionTeamId(winner.getId());
            t.setStatus(TournamentStatus.FINISHED);
            return true;
        }
        Match next = findKnockout(t, match.getRoundNumber() + 1, match.getBracketPosition() / 2);
        if (next == null) return false;
        if (previousWinner != null && !previousWinner.equals(winner.getId()) && next.getStatus() != MatchStatus.SCHEDULED) {
            throw ApiException.conflict("El siguiente cruce ya empezó: no se puede cambiar quién avanzó");
        }
        ScheduleBuilder.placeInSlot(next, match.getBracketPosition(), winner);

        // Perdedores de semifinales al partido por el tercer puesto
        if (match.getRoundNumber() == totalRounds - 1) {
            t.getMatches().stream().filter(m -> m.getStage() == Stage.THIRD_PLACE).findFirst().ifPresent(third -> {
                Team loser = match.isHome(winner.getId()) ? match.getAway() : match.getHome();
                if (third.getStatus() == MatchStatus.SCHEDULED) ScheduleBuilder.placeInSlot(third, match.getBracketPosition(), loser);
            });
        }
        return true;
    }

    private boolean closeLeagueIfDone(Tournament t) {
        boolean done = t.getMatches().stream()
                .filter(m -> m.getStage() == Stage.LEAGUE)
                .allMatch(m -> m.getStatus() == MatchStatus.FINISHED || m.getStatus() == MatchStatus.CANCELLED);
        if (!done) return false;
        List<Row> table = TournamentViews.rows(t, t.getTeams(), Stage.LEAGUE, null);
        Long champion = table.isEmpty() ? null : table.get(0).teamId();
        boolean changed = !Objects.equals(champion, t.getChampionTeamId()) || t.getStatus() != TournamentStatus.FINISHED;
        t.setChampionTeamId(champion);
        t.setStatus(TournamentStatus.FINISHED);
        return changed;
    }

    /** Al terminar el último partido de grupos se arma la fase final y se programa sola. */
    private boolean closeGroupsIfDone(Tournament t) {
        List<Match> groupMatches = t.getMatches().stream().filter(m -> m.getStage() == Stage.GROUP).toList();
        boolean done = groupMatches.stream().allMatch(m -> m.getStatus() == MatchStatus.FINISHED || m.getStatus() == MatchStatus.CANCELLED);
        boolean hasKnockout = t.getMatches().stream().anyMatch(m -> m.getStage() == Stage.KNOCKOUT);
        if (!done || hasKnockout) return false;

        Map<String, List<Team>> byGroup = new TreeMap<>();
        t.getTeams().forEach(team -> byGroup.computeIfAbsent(team.getGroupLabel(), g -> new ArrayList<>()).add(team));
        List<List<Long>> qualifiers = new ArrayList<>();
        byGroup.forEach((group, teams) -> qualifiers.add(TournamentViews.rows(t, teams, Stage.GROUP, group).stream()
                .limit(t.getAdvancePerGroup()).map(Row::teamId).toList()));

        Map<Long, Team> teamsById = new HashMap<>();
        t.getTeams().forEach(team -> teamsById.put(team.getId(), team));
        List<Match> knockout = ScheduleBuilder.knockout(t,
                BracketGenerator.fromGroups(qualifiers, t.getAdvancePerGroup()), teamsById);
        t.getMatches().addAll(knockout);

        LocalDate lastGroupDay = groupMatches.stream()
                .filter(m -> m.getScheduledAt() != null)
                .map(m -> m.getScheduledAt().atZone(SchedulingService.ZONE).toLocalDate())
                .max(Comparator.naturalOrder())
                .orElse(LocalDate.now(SchedulingService.ZONE));
        LocalDate today = LocalDate.now(SchedulingService.ZONE);
        LocalDate start = lastGroupDay.plusDays(Math.max(1, t.getDaysBetween()));
        scheduling.autoPlace(t, knockout, start.isBefore(today) ? today.plusDays(1) : start);
        return true;
    }

    private static Match findKnockout(Tournament t, int round, int position) {
        return t.getMatches().stream()
                .filter(m -> m.getStage() == Stage.KNOCKOUT && m.getRoundNumber() == round
                        && Objects.equals(m.getBracketPosition(), position))
                .findFirst().orElse(null);
    }

    private static Team winnerTeam(Match m) {
        if (m.getWinnerTeamId() == null) return null;
        return m.isHome(m.getWinnerTeamId()) ? m.getHome() : m.getAway();
    }
}
