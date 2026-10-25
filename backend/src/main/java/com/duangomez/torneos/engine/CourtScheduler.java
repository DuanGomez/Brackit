package com.duangomez.torneos.engine;

import java.time.*;
import java.util.*;

/**
 * Reparte partidos en canchas y horarios. Para cada jornada, en orden, busca el primer hueco que:
 * <ul>
 *   <li>cae dentro del horario disponible de la cancha ese día de la semana,</li>
 *   <li>no se cruza con otro partido ni con un bloqueo de esa cancha,</li>
 *   <li>respeta el descanso mínimo de los dos equipos.</li>
 * </ul>
 * Busca por día, luego por hora y luego por cancha, así los partidos de una jornada se juegan
 * en paralelo cuando hay varias canchas. Lo que no cabe queda en "sin programar".
 */
public final class CourtScheduler {

    public record Window(LocalTime start, LocalTime end) {
    }

    public record Interval(Instant start, Instant end) {
        boolean overlaps(Instant s, Instant e) {
            return start.isBefore(e) && end.isAfter(s);
        }
    }

    /** Una cancha: horario semanal y lo que ya la ocupa (partidos existentes y bloqueos). */
    public record CourtSlots(long courtId, Map<DayOfWeek, List<Window>> weekly, List<Interval> busy) {
    }

    /** Partido por programar. Los equipos pueden ser nulos (llaves aún sin definir). */
    public record Request(long matchId, int round, Long home, Long away) {
    }

    public record Assignment(long matchId, long courtId, Instant start) {
    }

    public record Result(List<Assignment> assigned, List<Long> unscheduled) {
    }

    /** Parámetros de una corrida. */
    public record Options(LocalDate startDate, int daysBetweenRounds, int blockMinutes, int restMinutes,
                          ZoneId zone, int stepMinutes, int searchDays) {
        public static Options of(LocalDate startDate, int daysBetweenRounds, int blockMinutes, int restMinutes, ZoneId zone) {
            return new Options(startDate, daysBetweenRounds, blockMinutes, restMinutes, zone, 15, 28);
        }
    }

    private CourtScheduler() {
    }

    public static Result schedule(List<Request> requests, List<CourtSlots> courts,
                                  Map<Long, List<Interval>> teamBusy, Options opt) {
        Map<Long, List<Interval>> courtBusy = new HashMap<>();
        for (CourtSlots c : courts) courtBusy.put(c.courtId(), new ArrayList<>(c.busy()));
        Map<Long, List<Interval>> teams = new HashMap<>();
        teamBusy.forEach((k, v) -> teams.put(k, new ArrayList<>(v)));

        List<Integer> rounds = requests.stream().map(Request::round).distinct().sorted().toList();
        Duration block = Duration.ofMinutes(opt.blockMinutes());
        Duration rest = Duration.ofMinutes(opt.restMinutes());

        List<Assignment> assigned = new ArrayList<>();
        List<Long> unscheduled = new ArrayList<>();
        // Si una jornada se corre por falta de cupo, las siguientes se corren igual
        LocalDate floor = opt.startDate();

        for (int index = 0; index < rounds.size(); index++) {
            int round = rounds.get(index);
            LocalDate earliest = opt.startDate().plusDays((long) index * opt.daysBetweenRounds());
            if (earliest.isBefore(floor)) earliest = floor;
            LocalDate lastUsed = earliest;

            for (Request r : requests) {
                if (r.round() != round) continue;
                Assignment found = findSlot(r, courts, courtBusy, teams, earliest, block, rest, opt);
                if (found == null) {
                    unscheduled.add(r.matchId());
                    continue;
                }
                assigned.add(found);
                Instant end = found.start().plus(block);
                courtBusy.get(found.courtId()).add(new Interval(found.start(), end));
                if (r.home() != null) teams.computeIfAbsent(r.home(), k -> new ArrayList<>()).add(new Interval(found.start(), end));
                if (r.away() != null) teams.computeIfAbsent(r.away(), k -> new ArrayList<>()).add(new Interval(found.start(), end));
                LocalDate day = found.start().atZone(opt.zone()).toLocalDate();
                if (day.isAfter(lastUsed)) lastUsed = day;
            }
            LocalDate next = lastUsed.plusDays(1);
            if (index + 1 < rounds.size()) {
                LocalDate planned = opt.startDate().plusDays((long) (index + 1) * opt.daysBetweenRounds());
                floor = planned.isAfter(next) ? planned : next;
            }
        }
        return new Result(assigned, unscheduled);
    }

    private static Assignment findSlot(Request r, List<CourtSlots> courts, Map<Long, List<Interval>> courtBusy,
                                       Map<Long, List<Interval>> teams, LocalDate earliest, Duration block,
                                       Duration rest, Options opt) {
        for (int d = 0; d < opt.searchDays(); d++) {
            LocalDate day = earliest.plusDays(d);
            // Horas candidatas del día (de todas las canchas), en orden
            TreeSet<LocalTime> times = new TreeSet<>();
            for (CourtSlots c : courts) {
                for (Window w : c.weekly().getOrDefault(day.getDayOfWeek(), List.of())) {
                    // t + bloque debe caber en la franja; si da la vuelta a medianoche, se corta
                    for (LocalTime t = w.start(); t.plus(block).isAfter(t) && !t.plus(block).isAfter(w.end());
                         t = t.plusMinutes(opt.stepMinutes())) {
                        times.add(t);
                    }
                }
            }
            for (LocalTime t : times) {
                Instant start = LocalDateTime.of(day, t).atZone(opt.zone()).toInstant();
                Instant end = start.plus(block);
                if (!teamFree(teams.get(r.home()), start, end, rest) || !teamFree(teams.get(r.away()), start, end, rest)) continue;
                for (CourtSlots c : courts) {
                    if (!fitsWindow(c, day, t, block)) continue;
                    boolean clash = courtBusy.get(c.courtId()).stream().anyMatch(i -> i.overlaps(start, end));
                    if (!clash) return new Assignment(r.matchId(), c.courtId(), start);
                }
            }
        }
        return null;
    }

    static boolean fitsWindow(CourtSlots c, LocalDate day, LocalTime t, Duration block) {
        LocalTime end = t.plus(block);
        if (end.isBefore(t)) return false;
        return c.weekly().getOrDefault(day.getDayOfWeek(), List.of()).stream()
                .anyMatch(w -> !t.isBefore(w.start()) && !end.isAfter(w.end()));
    }

    /** El equipo está libre si ningún partido suyo queda a menos de {@code rest} del nuevo. */
    static boolean teamFree(List<Interval> busy, Instant start, Instant end, Duration rest) {
        if (busy == null) return true;
        return busy.stream().noneMatch(i -> i.start().isBefore(end.plus(rest)) && i.end().plus(rest).isAfter(start));
    }
}
