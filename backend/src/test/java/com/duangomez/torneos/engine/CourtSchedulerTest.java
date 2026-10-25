package com.duangomez.torneos.engine;

import com.duangomez.torneos.engine.ConflictChecker.Busy;
import com.duangomez.torneos.engine.ConflictChecker.Conflict;
import com.duangomez.torneos.engine.ConflictChecker.TeamAgenda;
import com.duangomez.torneos.engine.ConflictChecker.Type;
import com.duangomez.torneos.engine.CourtScheduler.*;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class CourtSchedulerTest {

    private static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final LocalDate SATURDAY = LocalDate.of(2026, 11, 7);

    private static Map<DayOfWeek, List<Window>> saturdays(int fromHour, int toHour) {
        return Map.of(DayOfWeek.SATURDAY, List.of(new Window(LocalTime.of(fromHour, 0), LocalTime.of(toHour, 0))));
    }

    private static Instant at(LocalDate day, int hour, int minute) {
        return LocalDateTime.of(day, LocalTime.of(hour, minute)).atZone(ZONE).toInstant();
    }

    private static List<Request> roundRobin(int teams) {
        List<Request> list = new ArrayList<>();
        long id = 1;
        for (FixtureGenerator.Pairing p : FixtureGenerator.roundRobin(
                java.util.stream.LongStream.rangeClosed(1, teams).boxed().toList(), false)) {
            list.add(new Request(id++, p.round(), p.home(), p.away()));
        }
        return list;
    }

    @Test
    void conDosCanchasLosPartidosDeUnaJornadaSeJueganEnParalelo() {
        List<CourtSlots> courts = List.of(
                new CourtSlots(10, saturdays(14, 20), List.of()),
                new CourtSlots(20, saturdays(14, 20), List.of()));
        Result r = CourtScheduler.schedule(roundRobin(4), courts, Map.of(),
                CourtScheduler.Options.of(SATURDAY, 7, 120, 0, ZONE));

        assertThat(r.unscheduled()).isEmpty();
        assertThat(r.assigned()).hasSize(6);
        // Jornada 1: los dos partidos el mismo sábado a las 2 p. m., uno por cancha
        List<Assignment> first = r.assigned().subList(0, 2);
        assertThat(first).extracting(Assignment::start).containsOnly(at(SATURDAY, 14, 0));
        assertThat(first).extracting(Assignment::courtId).containsExactlyInAnyOrder(10L, 20L);
        // Cada jornada cae en sábados distintos, una semana después
        assertThat(r.assigned().get(2).start()).isEqualTo(at(SATURDAY.plusDays(7), 14, 0));
    }

    @Test
    void nuncaPoneDosPartidosEnLaMismaCanchaALaVez() {
        List<CourtSlots> courts = List.of(new CourtSlots(10, saturdays(8, 22), List.of()));
        Result r = CourtScheduler.schedule(roundRobin(6), courts, Map.of(),
                CourtScheduler.Options.of(SATURDAY, 7, 90, 0, ZONE));
        List<Assignment> sorted = new ArrayList<>(r.assigned());
        sorted.sort(Comparator.comparing(Assignment::start));
        for (int i = 1; i < sorted.size(); i++) {
            assertThat(Duration.between(sorted.get(i - 1).start(), sorted.get(i).start()).toMinutes())
                    .isGreaterThanOrEqualTo(90);
        }
        assertThat(r.unscheduled()).isEmpty();
    }

    @Test
    void respetaElDescansoMinimoDeCadaEquipo() {
        // Un solo día con mucho horario: el equipo 1 no puede jugar dos veces seguidas
        List<Request> requests = List.of(new Request(1, 1, 1L, 2L), new Request(2, 1, 1L, 3L));
        List<CourtSlots> courts = List.of(
                new CourtSlots(10, saturdays(8, 22), List.of()),
                new CourtSlots(20, saturdays(8, 22), List.of()));
        Result r = CourtScheduler.schedule(requests, courts, Map.of(),
                CourtScheduler.Options.of(SATURDAY, 7, 60, 240, ZONE));
        Instant a = r.assigned().get(0).start();
        Instant b = r.assigned().get(1).start();
        assertThat(Duration.between(a.plus(Duration.ofMinutes(60)), b).toMinutes()).isGreaterThanOrEqualTo(240);
    }

    @Test
    void evitaBloqueosYPartidosExistentes() {
        Instant blockStart = at(SATURDAY, 14, 0);
        List<CourtSlots> courts = List.of(new CourtSlots(10, saturdays(14, 18),
                List.of(new Interval(blockStart, at(SATURDAY, 16, 0)))));
        Result r = CourtScheduler.schedule(List.of(new Request(1, 1, 1L, 2L)), courts, Map.of(),
                CourtScheduler.Options.of(SATURDAY, 7, 120, 0, ZONE));
        assertThat(r.assigned().get(0).start()).isEqualTo(at(SATURDAY, 16, 0));
    }

    @Test
    void loQueNoCabeQuedaSinProgramar() {
        List<CourtSlots> courts = List.of(new CourtSlots(10, saturdays(14, 16), List.of()));
        CourtScheduler.Options opt = new CourtScheduler.Options(SATURDAY, 7, 120, 0, ZONE, 15, 1);
        Result r = CourtScheduler.schedule(
                List.of(new Request(1, 1, 1L, 2L), new Request(2, 1, 3L, 4L)), courts, Map.of(), opt);
        assertThat(r.assigned()).hasSize(1);
        assertThat(r.unscheduled()).containsExactly(2L);
    }

    @Test
    void siUnaJornadaSeCorreLasSiguientesNoSeAdelantan() {
        // Una cancha, un partido por sábado: la jornada 1 (2 partidos) ocupa dos sábados
        List<CourtSlots> courts = List.of(new CourtSlots(10, saturdays(14, 16), List.of()));
        List<Request> requests = List.of(new Request(1, 1, 1L, 2L), new Request(2, 1, 3L, 4L), new Request(3, 2, 1L, 3L));
        Result r = CourtScheduler.schedule(requests, courts, Map.of(), CourtScheduler.Options.of(SATURDAY, 7, 120, 0, ZONE));
        assertThat(r.assigned()).extracting(Assignment::start)
                .containsExactly(at(SATURDAY, 14, 0), at(SATURDAY.plusDays(7), 14, 0), at(SATURDAY.plusDays(14), 14, 0));
    }

    // ---------- Verificador de choques ----------

    @Test
    void detectaCanchaOcupadaFueraDeHorarioYFaltaDeDescanso() {
        List<Window> day = List.of(new Window(LocalTime.of(14, 0), LocalTime.of(20, 0)));
        Instant start = at(SATURDAY, 17, 0);
        List<Conflict> conflicts = ConflictChecker.check(start, 120, ZONE, day,
                List.of(new Busy(at(SATURDAY, 18, 0), at(SATURDAY, 20, 0), "Belén vs Castilla")),
                List.of(),
                List.of(new TeamAgenda("Bello", List.of(new Busy(at(SATURDAY, 14, 0), at(SATURDAY, 16, 0), "a las 2:00 p. m.")))),
                240);
        assertThat(conflicts).extracting(Conflict::type).containsExactlyInAnyOrder(Type.COURT_BUSY, Type.TEAM_REST);

        List<Conflict> late = ConflictChecker.check(at(SATURDAY, 19, 0), 120, ZONE, day, List.of(), List.of(), List.of(), 0);
        assertThat(late).extracting(Conflict::type).containsExactly(Type.OUTSIDE_HOURS);
    }

    @Test
    void sinProblemasNoReportaNada() {
        List<Window> day = List.of(new Window(LocalTime.of(14, 0), LocalTime.of(20, 0)));
        assertThat(ConflictChecker.check(at(SATURDAY, 14, 0), 120, ZONE, day, List.of(),
                List.of(new Busy(at(SATURDAY, 17, 0), at(SATURDAY, 18, 0), "mantenimiento")), List.of(), 0)).isEmpty();
    }
}
