package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.engine.ConflictChecker;
import com.duangomez.torneos.engine.ConflictChecker.Busy;
import com.duangomez.torneos.engine.ConflictChecker.Conflict;
import com.duangomez.torneos.engine.ConflictChecker.TeamAgenda;
import com.duangomez.torneos.engine.CourtScheduler;
import com.duangomez.torneos.engine.CourtScheduler.*;
import com.duangomez.torneos.repo.CourtRepository;
import com.duangomez.torneos.repo.MatchRepository;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Asigna cancha y hora a los partidos, a mano o automáticamente, sin choques. */
@Service
public class SchedulingService {

    /** Las organizaciones operan en hora de Colombia. */
    public static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.forLanguageTag("es-CO"));
    private static final DateTimeFormatter DAY_TIME = DateTimeFormatter.ofPattern("EEE d 'a las' h:mm a", Locale.forLanguageTag("es-CO"));

    private final MatchRepository matches;
    private final CourtRepository courts;

    public SchedulingService(MatchRepository matches, CourtRepository courts) {
        this.matches = matches;
        this.courts = courts;
    }

    /** Canchas aptas para el torneo: las elegidas o, si no eligió, todas las de la organización que admiten el deporte. */
    public List<Court> courtsFor(Tournament t) {
        List<Court> chosen = t.getCourts().isEmpty()
                ? courts.findByOrganization(t.getOrganization().getId())
                : new ArrayList<>(t.getCourts());
        return chosen.stream().filter(c -> c.supports(t.getSport())).toList();
    }

    /**
     * Programa los partidos dados a partir de {@code startDate}. Respeta lo que ya ocupa cada cancha
     * (también partidos de otros torneos de la organización) y el descanso de los equipos.
     * Devuelve cuántos quedaron sin cupo.
     */
    public int autoPlace(Tournament t, List<Match> toPlace, LocalDate startDate) {
        List<Match> pending = toPlace.stream().filter(m -> !m.isBye() && m.getStatus() == MatchStatus.SCHEDULED).toList();
        if (pending.isEmpty()) return 0;
        List<Court> available = courtsFor(t);
        if (available.isEmpty()) return pending.size();

        Set<Long> placing = new HashSet<>();
        pending.forEach(m -> { if (m.getId() != null) placing.add(m.getId()); });
        Instant from = startDate.atStartOfDay(ZONE).toInstant();
        Instant to = startDate.plusDays(400).atStartOfDay(ZONE).toInstant();
        Map<Long, List<Interval>> busyByCourt = new HashMap<>();
        for (Court c : available) busyByCourt.put(c.getId(), new ArrayList<>());
        for (Match other : matches.findOnCourts(busyByCourt.keySet(), from, to)) {
            if (placing.contains(other.getId())) continue;
            busyByCourt.get(other.getCourt().getId()).add(interval(other));
        }
        List<CourtSlots> slots = new ArrayList<>();
        for (Court c : available) {
            List<Interval> busy = busyByCourt.get(c.getId());
            c.getBlocks().forEach(b -> busy.add(new Interval(b.getStartsAt(), b.getEndsAt())));
            slots.add(new CourtSlots(c.getId(), weekly(c), busy));
        }

        // Agenda actual de cada equipo (partidos del torneo ya programados)
        Map<Long, List<Interval>> teamBusy = new HashMap<>();
        for (Match m : t.getMatches()) {
            if (m.getScheduledAt() == null || m.isBye() || pending.contains(m) || m.getStatus() == MatchStatus.CANCELLED) continue;
            Interval i = interval(m);
            if (m.getHome() != null) teamBusy.computeIfAbsent(m.getHome().getId(), k -> new ArrayList<>()).add(i);
            if (m.getAway() != null) teamBusy.computeIfAbsent(m.getAway().getId(), k -> new ArrayList<>()).add(i);
        }

        // La fase final va después de los grupos; el tercer puesto, junto con la final
        Map<Long, Match> byKey = new LinkedHashMap<>();
        List<Request> requests = new ArrayList<>();
        long key = 1;
        List<Match> ordered = new ArrayList<>(pending);
        ordered.sort(Comparator.comparingInt(SchedulingService::phaseOrder).thenComparing(Match::getRoundNumber)
                .thenComparing(m -> m.getStage() == Stage.THIRD_PLACE ? 0 : 1));
        for (Match m : ordered) {
            byKey.put(key, m);
            requests.add(new Request(key++, phaseOrder(m) * 1000 + m.getRoundNumber(), m.homeId(), m.awayId()));
        }

        CourtScheduler.Result result = CourtScheduler.schedule(requests, slots, teamBusy,
                CourtScheduler.Options.of(startDate, Math.max(1, t.getDaysBetween()), t.getBlockMinutes(),
                        t.getMinRestHours() * 60, ZONE));
        Map<Long, Court> courtById = new HashMap<>();
        available.forEach(c -> courtById.put(c.getId(), c));
        for (Assignment a : result.assigned()) {
            Match m = byKey.get(a.matchId());
            m.setCourt(courtById.get(a.courtId()));
            m.setScheduledAt(a.start());
        }
        return result.unscheduled().size();
    }

    private static int phaseOrder(Match m) {
        return m.getStage() == Stage.KNOCKOUT || m.getStage() == Stage.THIRD_PLACE ? 1 : 0;
    }

    /** Choques que tendría el partido en esa cancha y hora. */
    public List<Conflict> check(Match m, Court court, Instant start) {
        Tournament t = m.getTournament();
        LocalDate day = start.atZone(ZONE).toLocalDate();
        List<Window> windows = weekly(court).getOrDefault(day.getDayOfWeek(), List.of());
        Instant from = day.minusDays(2).atStartOfDay(ZONE).toInstant();
        Instant to = day.plusDays(3).atStartOfDay(ZONE).toInstant();

        List<Busy> courtMatches = matches.findOnCourts(List.of(court.getId()), from, to).stream()
                .filter(o -> !o.getId().equals(m.getId()))
                .map(o -> new Busy(o.getScheduledAt(), interval(o).end(), label(o) + " a las " + TIME.format(o.getScheduledAt().atZone(ZONE))))
                .toList();
        List<Busy> blocks = court.getBlocks().stream()
                .map(b -> new Busy(b.getStartsAt(), b.getEndsAt(), b.getReason() == null ? "sin motivo" : b.getReason()))
                .toList();
        List<TeamAgenda> teams = new ArrayList<>();
        for (Team team : List.of(Optional.ofNullable(m.getHome()), Optional.ofNullable(m.getAway())).stream()
                .flatMap(Optional::stream).toList()) {
            List<Busy> agenda = t.getMatches().stream()
                    .filter(o -> !o.getId().equals(m.getId()) && o.involves(team.getId()) && o.getScheduledAt() != null
                            && !o.isBye() && o.getStatus() != MatchStatus.CANCELLED)
                    .map(o -> new Busy(o.getScheduledAt(), interval(o).end(), DAY_TIME.format(o.getScheduledAt().atZone(ZONE))))
                    .toList();
            teams.add(new TeamAgenda(team.getName(), agenda));
        }
        List<Conflict> found = new ArrayList<>(ConflictChecker.check(start, t.getBlockMinutes(), ZONE, windows,
                courtMatches, blocks, teams, t.getMinRestHours() * 60));
        if (!court.supports(t.getSport())) {
            found.add(0, new Conflict(ConflictChecker.Type.OUTSIDE_HOURS, "La cancha no admite " + t.getSport().label().toLowerCase()));
        }
        return found;
    }

    public static Map<DayOfWeek, List<Window>> weekly(Court c) {
        Map<DayOfWeek, List<Window>> map = new EnumMap<>(DayOfWeek.class);
        for (CourtAvailability a : c.getAvailability()) {
            map.computeIfAbsent(DayOfWeek.of(a.getDayOfWeek()), d -> new ArrayList<>()).add(new Window(a.getStartTime(), a.getEndTime()));
        }
        return map;
    }

    public static Interval interval(Match m) {
        return new Interval(m.getScheduledAt(), m.getScheduledAt().plus(Duration.ofMinutes(m.getTournament().getBlockMinutes())));
    }

    private static String label(Match m) {
        String home = m.getHome() == null ? "por definir" : m.getHome().getName();
        String away = m.getAway() == null ? "por definir" : m.getAway().getName();
        return home + " vs " + away;
    }
}
