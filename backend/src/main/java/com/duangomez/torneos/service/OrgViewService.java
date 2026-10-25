package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Role;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.repo.CourtRepository;
import com.duangomez.torneos.repo.MatchRepository;
import com.duangomez.torneos.repo.TournamentRepository;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

/** Vistas de una organización: panel de inicio, calendario de canchas y lista de partidos. */
@Service
public class OrgViewService {

    private static final ZoneId ZONE = SchedulingService.ZONE;

    private final MatchRepository matches;
    private final TournamentRepository tournaments;
    private final CourtRepository courts;
    private final OrgAccess access;

    public OrgViewService(MatchRepository matches, TournamentRepository tournaments, CourtRepository courts, OrgAccess access) {
        this.matches = matches;
        this.tournaments = tournaments;
        this.courts = courts;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public DashboardDto dashboard(String org, AuthPrincipal principal) {
        Organization o = access.require(org, principal).getOrganization();
        LocalDate today = LocalDate.now(ZONE);
        Instant from = today.atStartOfDay(ZONE).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(ZONE).toInstant();

        List<Match> todays = new ArrayList<>(matches.findScheduled(o.getId(), from, to));
        List<Match> live = matches.findByOrganizationAndStatus(o.getId(), List.of(MatchStatus.LIVE));
        for (Match m : live) if (!todays.contains(m)) todays.add(m);
        todays.sort(Comparator.comparing(Match::getScheduledAt, Comparator.nullsLast(Comparator.naturalOrder())));

        List<Tournament> all = tournaments.findByOrganizationIdOrderByCreatedAtDesc(o.getId());
        List<Tournament> active = all.stream().filter(t -> t.getStatus() != TournamentStatus.FINISHED).toList();
        int teams = active.stream().mapToInt(t -> t.getTeams().size()).sum();
        List<Court> orgCourts = courts.findByOrganization(o.getId());

        return new DashboardDto(todays.stream().map(TournamentViews::card).toList(), live.size(),
                (int) active.stream().filter(t -> t.getStatus() == TournamentStatus.IN_PROGRESS).count(), teams,
                orgCourts.size(), pending(o, active), active.stream().limit(6).map(TournamentViews::tournamentCard).toList(),
                orgCourts.stream().map(c -> calendarCourt(c, today)).toList(), Instant.now());
    }

    /** Lo que alguien del equipo organizador debería revisar. */
    private List<PendingDto> pending(Organization o, List<Tournament> active) {
        List<PendingDto> out = new ArrayList<>();
        Instant now = Instant.now();
        Instant soon = now.plus(Duration.ofHours(48));
        long noReferee = matches.findScheduled(o.getId(), now, soon).stream()
                .filter(m -> m.getStatus() == MatchStatus.SCHEDULED && m.getReferee() == null).count();
        if (noReferee > 0) {
            out.add(new PendingDto("NO_REFEREE", "warning", noReferee == 1
                    ? "1 partido de las próximas 48 h sin árbitro asignado"
                    : noReferee + " partidos de las próximas 48 h sin árbitro asignado", null, null));
        }
        int unplaced = matches.findUnplaced(o.getId()).size();
        if (unplaced > 0) {
            out.add(new PendingDto("UNPLACED", "warning", unplaced == 1 ? "1 partido sin cancha u hora"
                    : unplaced + " partidos sin cancha u hora", null, null));
        }
        int shown = 0;
        for (Tournament t : active) {
            for (Team team : t.getTeams()) {
                long missing = team.getPlayers().stream().filter(p -> p.getDocument() == null).count();
                if (missing > 0 && shown < 3) {
                    out.add(new PendingDto("NO_DOCUMENT", "error", team.getName() + " tiene " + missing
                            + (missing == 1 ? " jugador sin documento" : " jugadores sin documento"), t.getId(), null));
                    shown++;
                }
            }
            if (t.getStatus() == TournamentStatus.DRAFT) {
                out.add(new PendingDto("DRAFT", "info", t.getName() + ": falta generar el calendario", t.getId(), null));
            }
        }
        return out;
    }

    @Transactional(readOnly = true)
    public CalendarDto calendar(String org, LocalDate date, Long venueId, AuthPrincipal principal) {
        Organization o = access.require(org, principal).getOrganization();
        LocalDate day = date == null ? LocalDate.now(ZONE) : date;
        Instant from = day.atStartOfDay(ZONE).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(ZONE).toInstant();
        List<Court> list = courts.findByOrganization(o.getId()).stream()
                .filter(c -> venueId == null || c.getVenue().getId().equals(venueId)).toList();
        Set<Long> courtIds = new HashSet<>();
        list.forEach(c -> courtIds.add(c.getId()));
        List<MatchCardDto> dayMatches = matches.findScheduled(o.getId(), from, to).stream()
                .filter(m -> venueId == null || (m.getCourt() != null && courtIds.contains(m.getCourt().getId())))
                .map(TournamentViews::card).toList();
        List<MatchCardDto> unscheduled = matches.findUnplaced(o.getId()).stream().map(TournamentViews::card).toList();
        return new CalendarDto(day, list.stream().map(c -> calendarCourt(c, day)).toList(), dayMatches, unscheduled, Instant.now());
    }

    /** Partidos de un rango de fechas; {@code mine} = los del árbitro que consulta (y los que no tienen árbitro). */
    @Transactional(readOnly = true)
    public List<MatchCardDto> matches(String org, LocalDate from, LocalDate to, String status, Long tournamentId,
                                      boolean mine, AuthPrincipal principal) {
        Membership me = access.require(org, principal);
        Organization o = me.getOrganization();
        LocalDate start = from == null ? LocalDate.now(ZONE) : from;
        LocalDate end = to == null ? start.plusDays(7) : to;
        boolean onlyMine = mine || me.getRole() == Role.REFEREE;
        List<Match> list = new ArrayList<>(matches.findScheduled(o.getId(), start.atStartOfDay(ZONE).toInstant(),
                end.plusDays(1).atStartOfDay(ZONE).toInstant()));
        for (Match m : matches.findByOrganizationAndStatus(o.getId(), List.of(MatchStatus.LIVE))) {
            if (!list.contains(m)) list.add(0, m);
        }
        return list.stream()
                .filter(m -> status == null || m.getStatus().name().equals(status))
                .filter(m -> tournamentId == null || m.getTournament().getId().equals(tournamentId))
                .filter(m -> !onlyMine || m.getReferee() == null || m.getReferee().getId().equals(principal.userId()))
                .filter(m -> m.hasBothTeams())
                .map(TournamentViews::card)
                .toList();
    }

    static CalendarCourtDto calendarCourt(Court c, LocalDate day) {
        int dow = day.getDayOfWeek().getValue();
        Instant from = day.atStartOfDay(ZONE).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(ZONE).toInstant();
        return new CalendarCourtDto(c.getId(), c.getName(), c.getSurface(), c.getVenue().getId(), c.getVenue().getName(),
                c.getAvailability().stream().filter(a -> a.getDayOfWeek() == dow).map(TournamentViews::window).toList(),
                c.getBlocks().stream().filter(b -> b.getStartsAt().isBefore(to) && b.getEndsAt().isAfter(from))
                        .map(TournamentViews::block).toList());
    }
}
