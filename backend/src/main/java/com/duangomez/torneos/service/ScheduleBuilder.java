package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Team;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.engine.BracketGenerator;
import com.duangomez.torneos.engine.FixtureGenerator;
import com.duangomez.torneos.engine.FixtureGenerator.Pairing;

import java.time.*;
import java.util.*;

/** Convierte los cruces del motor en partidos y les asigna fecha, hora y sede. */
public final class ScheduleBuilder {

    /** Cómo repartir las fechas: un día por jornada y varios partidos por día. */
    public record Plan(LocalDate startDate, LocalTime firstMatchTime, int daysBetweenRounds,
                       int minutesBetweenMatches, List<String> venues, ZoneId zone) {

        public Plan {
            venues = venues == null ? List.of() : venues.stream().filter(v -> v != null && !v.isBlank()).toList();
        }
    }

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
     * Crea todas las rondas de la llave. Las de la primera ronda con "bye" quedan terminadas
     * y su equipo ya aparece en la ronda siguiente.
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

    /** El ganador de la posición {@code fromPosition} ocupa local (par) o visitante (impar) del siguiente cruce. */
    public static void placeInSlot(Match next, int fromPosition, Team team) {
        if (fromPosition % 2 == 0) next.setHome(team);
        else next.setAway(team);
    }

    /**
     * Fechas por jornada: todos los partidos de la jornada el mismo día; con varias sedes
     * se juegan en paralelo y si no, uno tras otro separados por {@code minutesBetweenMatches}.
     * Los "bye" no ocupan horario.
     */
    public static void assignDates(List<Match> matches, Plan plan, int roundOffset) {
        Map<Integer, List<Match>> byRound = new TreeMap<>();
        for (Match m : matches) {
            if (!m.isBye()) byRound.computeIfAbsent(m.getRoundNumber(), r -> new ArrayList<>()).add(m);
        }
        int venues = Math.max(1, plan.venues().size());
        for (var entry : byRound.entrySet()) {
            LocalDate day = plan.startDate().plusDays((long) (entry.getKey() - 1 + roundOffset) * plan.daysBetweenRounds());
            List<Match> round = entry.getValue();
            for (int i = 0; i < round.size(); i++) {
                LocalDateTime when = LocalDateTime.of(day, plan.firstMatchTime())
                        .plusMinutes((long) (i / venues) * plan.minutesBetweenMatches());
                round.get(i).setScheduledAt(when.atZone(plan.zone()).toInstant());
                if (!plan.venues().isEmpty()) round.get(i).setVenue(plan.venues().get(i % venues));
            }
        }
    }

    private static Match newMatch(Tournament t, Stage stage, int round) {
        Match m = new Match();
        m.setTournament(t);
        m.setStage(stage);
        m.setRoundNumber(round);
        return m;
    }
}
