package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Team;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.engine.BracketGenerator;
import com.duangomez.torneos.engine.FixtureGenerator;
import com.duangomez.torneos.engine.FixtureGenerator.Pairing;

import java.time.Instant;
import java.util.*;

/** Convierte los cruces del motor en partidos. La cancha y la hora las asigna {@link SchedulingService}. */
public final class ScheduleBuilder {

    private ScheduleBuilder() {
    }

    /** Todos contra todos para una liga o un grupo. */
    public static List<Match> roundRobin(Tournament t, List<Team> teams, Stage stage, String group, boolean doubleRound) {
        Map<Long, Team> byId = new HashMap<>();
        teams.forEach(team -> byId.put(team.getId(), team));
        List<Match> result = new ArrayList<>();
        for (Pairing p : FixtureGenerator.roundRobin(teams.stream().map(Team::getId).toList(), doubleRound)) {
            Match m = newMatch(t, stage, p.round());
            m.setGroupLabel(group);
            m.setHome(byId.get(p.home()));
            m.setAway(byId.get(p.away()));
            result.add(m);
        }
        return result;
    }

    /**
     * Crea todas las rondas de la llave (y el tercer puesto si el torneo lo pide). Las de la
     * primera ronda con "bye" quedan terminadas y su equipo ya aparece en la ronda siguiente.
     */
    public static List<Match> knockout(Tournament t, List<BracketGenerator.Slot> firstRound, Map<Long, Team> teams) {
        int totalRounds = Integer.numberOfTrailingZeros(firstRound.size() * 2);
        Map<String, Match> byPosition = new HashMap<>();
        List<Match> result = new ArrayList<>();
        for (int round = 1; round <= totalRounds; round++) {
            int count = firstRound.size() >> (round - 1);
            for (int pos = 0; pos < count; pos++) {
                Match m = newMatch(t, Stage.KNOCKOUT, round);
                m.setBracketPosition(pos);
                byPosition.put(round + ":" + pos, m);
                result.add(m);
            }
        }
        if (t.isThirdPlace() && totalRounds >= 2) {
            Match third = newMatch(t, Stage.THIRD_PLACE, totalRounds);
            third.setBracketPosition(0);
            result.add(third);
        }
        for (BracketGenerator.Slot slot : firstRound) {
            Match m = byPosition.get("1:" + slot.position());
            m.setHome(slot.home() == null ? null : teams.get(slot.home()));
            m.setAway(slot.away() == null ? null : teams.get(slot.away()));
            if (slot.bye() && m.getHome() != null) {
                m.setBye(true);
                m.setStatus(MatchStatus.FINISHED);
                m.setWinnerTeamId(m.getHome().getId());
                m.setFinishedAt(Instant.now());
                Match next = byPosition.get("2:" + slot.position() / 2);
                if (next != null) placeInSlot(next, slot.position(), m.getHome());
            }
        }
        return result;
    }

    /** El equipo que viene de la posición {@code fromPosition} ocupa local (par) o visitante (impar). */
    public static void placeInSlot(Match next, int fromPosition, Team team) {
        if (fromPosition % 2 == 0) next.setHome(team);
        else next.setAway(team);
    }

    private static Match newMatch(Tournament t, Stage stage, int round) {
        Match m = new Match();
        m.setTournament(t);
        m.setStage(stage);
        m.setRoundNumber(round);
        return m;
    }
}
