package com.duangomez.torneos.engine;

import com.duangomez.torneos.engine.CourtScheduler.Window;

import java.time.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Revisa si mover un partido a una cancha y hora crea problemas. Se usa al reprogramar a mano:
 * la interfaz muestra los choques antes de guardar.
 */
public final class ConflictChecker {

    public enum Type { OUTSIDE_HOURS, COURT_BUSY, COURT_BLOCKED, TEAM_OVERLAP, TEAM_REST }

    public record Conflict(Type type, String message) {
    }

    /** Algo que ya ocupa tiempo, con un texto para explicar el choque. */
    public record Busy(Instant start, Instant end, String label) {
    }

    /** Partidos de un equipo, para revisar solapes y descanso. */
    public record TeamAgenda(String teamName, List<Busy> matches) {
    }

    private ConflictChecker() {
    }

    public static List<Conflict> check(Instant start, int blockMinutes, ZoneId zone, List<Window> dayWindows,
                                       List<Busy> courtMatches, List<Busy> courtBlocks,
                                       List<TeamAgenda> teams, int restMinutes) {
        List<Conflict> out = new ArrayList<>();
        Instant end = start.plus(Duration.ofMinutes(blockMinutes));
        LocalTime from = start.atZone(zone).toLocalTime();
        LocalTime to = end.atZone(zone).toLocalTime();
        boolean sameDay = start.atZone(zone).toLocalDate().equals(end.atZone(zone).toLocalDate());
        boolean inside = sameDay && dayWindows.stream().anyMatch(w -> !from.isBefore(w.start()) && !to.isAfter(w.end()));
        if (!inside) out.add(new Conflict(Type.OUTSIDE_HOURS, "La cancha no está disponible en ese horario"));

        for (Busy b : courtBlocks) {
            if (overlaps(b, start, end)) out.add(new Conflict(Type.COURT_BLOCKED, "Cancha bloqueada: " + b.label()));
        }
        for (Busy b : courtMatches) {
            if (overlaps(b, start, end)) out.add(new Conflict(Type.COURT_BUSY, "La cancha ya tiene " + b.label()));
        }
        Duration rest = Duration.ofMinutes(restMinutes);
        for (TeamAgenda team : teams) {
            for (Busy b : team.matches()) {
                if (overlaps(b, start, end)) {
                    out.add(new Conflict(Type.TEAM_OVERLAP, team.teamName() + " ya juega a esa hora (" + b.label() + ")"));
                } else if (restMinutes > 0 && b.start().isBefore(end.plus(rest)) && b.end().plus(rest).isAfter(start)) {
                    out.add(new Conflict(Type.TEAM_REST, team.teamName() + " no alcanza el descanso mínimo de "
                            + formatRest(restMinutes) + ": juega " + b.label()));
                }
            }
        }
        return out;
    }

    private static String formatRest(int minutes) {
        return minutes % 60 == 0 ? (minutes / 60) + " h" : minutes + " min";
    }

    private static boolean overlaps(Busy b, Instant start, Instant end) {
        return b.start().isBefore(end) && b.end().isAfter(start);
    }
}
