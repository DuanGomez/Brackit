package com.duangomez.torneos.demo;

import com.duangomez.torneos.demo.DemoData.CourtSpec;
import com.duangomez.torneos.demo.DemoData.OrgSpec;
import com.duangomez.torneos.demo.DemoData.TournamentSpec;
import com.duangomez.torneos.demo.DemoData.VenueSpec;
import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.MembershipStatus;
import com.duangomez.torneos.domain.Enums.Role;
import com.duangomez.torneos.repo.*;
import com.duangomez.torneos.service.SchedulingService;
import com.duangomez.torneos.service.TournamentProgress;
import com.duangomez.torneos.service.TournamentService;
import com.duangomez.torneos.web.Dtos.TeamInput;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.*;
import java.util.*;

/** Si la base está vacía, crea las organizaciones demo con sus sedes, miembros y torneos con historial. */
@Component
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true")
public class DemoSeeder implements ApplicationRunner {

    private static final ZoneId ZONE = SchedulingService.ZONE;
    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);

    private final UserRepository users;
    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;
    private final VenueRepository venues;
    private final TournamentRepository tournaments;
    private final TournamentService tournamentService;
    private final SchedulingService scheduling;
    private final TournamentProgress progress;
    private final MatchSimulator simulator;
    private final PasswordEncoder encoder;
    private final TransactionTemplate tx;

    public DemoSeeder(UserRepository users, OrganizationRepository organizations, MembershipRepository memberships,
                      VenueRepository venues, TournamentRepository tournaments, TournamentService tournamentService,
                      SchedulingService scheduling, TournamentProgress progress, MatchSimulator simulator,
                      PasswordEncoder encoder, TransactionTemplate tx) {
        this.users = users;
        this.organizations = organizations;
        this.memberships = memberships;
        this.venues = venues;
        this.tournaments = tournaments;
        this.tournamentService = tournamentService;
        this.scheduling = scheduling;
        this.progress = progress;
        this.simulator = simulator;
        this.encoder = encoder;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() > 0) return;
        tx.executeWithoutResult(status -> {
            AppUser admin = user("Duan Gómez", DemoData.ADMIN_EMAIL);
            AppUser coordinator = user("Laura Montoya", DemoData.COORDINATOR_EMAIL);
            AppUser referee = user("Carlos Henao", DemoData.REFEREE_EMAIL);
            for (OrgSpec spec : DemoData.organizations()) {
                Organization org = new Organization();
                org.setSlug(spec.slug());
                org.setName(spec.name());
                org.setShortName(spec.shortName());
                org.setColor(spec.color());
                org.setCity(spec.city());
                org.setDescription(spec.description());
                org.setPlan(spec.plan());
                org.setDemo(true);
                organizations.save(org);
                memberships.save(new Membership(org, admin, admin.getEmail(), Role.ADMIN, MembershipStatus.ACTIVE));
                if (spec.slug().equals("liga-barrial")) {
                    memberships.save(new Membership(org, coordinator, coordinator.getEmail(), Role.COORDINATOR, MembershipStatus.ACTIVE));
                }
                if (spec.referee()) {
                    memberships.save(new Membership(org, referee, referee.getEmail(), Role.REFEREE, MembershipStatus.ACTIVE));
                }
                for (VenueSpec vs : spec.venues()) createVenue(org, vs);
                for (TournamentSpec ts : spec.tournaments()) seed(org, ts, spec.referee() ? referee : null);
            }
            blockForMaintenance();
        });
        log.info("Demo lista: {} / {}", DemoData.ADMIN_EMAIL, DemoData.PASSWORD);
    }

    /** Borra y vuelve a crear un torneo demo con el mismo enlace. */
    public Tournament reseed(Tournament old) {
        Organization org = old.getOrganization();
        TournamentSpec spec = DemoData.organizations().stream()
                .filter(o -> o.slug().equals(org.getSlug()))
                .flatMap(o -> o.tournaments().stream())
                .filter(ts -> ts.slug().equals(old.getSlug()))
                .findFirst().orElse(null);
        if (spec == null) return old;
        AppUser referee = users.findByEmailIgnoreCase(DemoData.REFEREE_EMAIL)
                .filter(u -> memberships.findByOrganizationIdAndUserIdAndStatus(org.getId(), u.getId(), MembershipStatus.ACTIVE).isPresent())
                .orElse(null);
        tournaments.delete(old);
        tournaments.flush(); // el slug es único: el borrado debe llegar antes que la nueva inserción
        return seed(org, spec, referee);
    }

    Tournament seed(Organization org, TournamentSpec spec, AppUser referee) {
        Random random = new Random(spec.slug().hashCode() ^ System.nanoTime());
        LocalDate start = LocalDate.now(ZONE).minusDays(spec.daysAgo());

        Tournament t = new Tournament();
        t.setOrganization(org);
        t.setSlug(spec.slug());
        t.setName(spec.name());
        t.setCategory(spec.category());
        t.setSport(spec.sport());
        t.setFormat(spec.format());
        t.setDescription(spec.description());
        t.setStartDate(start);
        t.setGroupsCount(spec.groups());
        t.setAdvancePerGroup(spec.advance());
        t.setThirdPlace(spec.thirdPlace());
        t.setBlockMinutes(spec.sport().defaultBlockMinutes());
        t.setMinRestHours(spec.minRestHours());
        t.setDaysBetween(spec.daysBetween());
        Map<String, Court> courtsByName = new HashMap<>();
        venues.findByOrganizationIdOrderByNameAsc(org.getId()).forEach(v -> v.getCourts().forEach(c -> courtsByName.put(c.getName(), c)));
        spec.courts().forEach(name -> t.getCourts().add(courtsByName.get(name)));

        for (String name : spec.teams()) {
            Team team = tournamentService.addTeamTo(t, new TeamInput(name, null, null));
            List<String[]> roster = DemoData.roster(spec.sport(), name, random);
            for (int i = 0; i < roster.size(); i++) {
                String[] p = roster.get(i);
                Player player = new Player();
                player.setTeam(team);
                player.setName(p[0]);
                player.setShirtNumber(p[1] == null ? null : Integer.valueOf(p[1]));
                // Una planilla incompleta para que el panel muestre algo por revisar
                player.setDocument(name.equals("Unión Itagüí") && i >= roster.size() - 2 ? null : p[2]);
                team.getPlayers().add(player);
            }
        }
        tournaments.saveAndFlush(t);

        List<Match> created = tournamentService.buildSchedule(t);
        tournaments.flush();
        scheduling.autoPlace(t, created, start);
        tournaments.flush();

        playPast(t, random);
        assignReferee(t, referee);
        tournaments.flush();
        return t;
    }

    /** Juega, en orden cronológico, todo lo programado antes de ahora. */
    private void playPast(Tournament t, Random random) {
        Instant now = Instant.now();
        while (true) {
            Match next = t.getMatches().stream()
                    .filter(m -> m.getStatus() == MatchStatus.SCHEDULED && m.isPlaced() && m.hasBothTeams()
                            && m.getScheduledAt().plus(Duration.ofMinutes(t.getBlockMinutes())).isBefore(now))
                    .min(Comparator.comparing(Match::getScheduledAt))
                    .orElse(null);
            if (next == null) return;
            simulator.playInstantly(next, next.getScheduledAt(), random);
            progress.onFinished(next, null);
            tournaments.flush();
        }
    }

    /** El árbitro demo dirige uno de cada dos partidos pendientes; el resto queda por asignar. */
    private static void assignReferee(Tournament t, AppUser referee) {
        if (referee == null) return;
        List<Match> pending = t.getMatches().stream()
                .filter(m -> m.getStatus() == MatchStatus.SCHEDULED && m.isPlaced())
                .sorted(Comparator.comparing(Match::getScheduledAt)).toList();
        for (int i = 0; i < pending.size(); i += 2) pending.get(i).setReferee(referee);
    }

    private void createVenue(Organization org, VenueSpec spec) {
        Venue v = new Venue();
        v.setOrganization(org);
        v.setName(spec.name());
        v.setAddress(spec.address());
        int position = 0;
        for (CourtSpec cs : spec.courts()) {
            Court c = new Court();
            c.setVenue(v);
            c.setName(cs.name());
            c.setSurface(cs.surface());
            c.setSportList(cs.sports());
            c.setPosition(position++);
            for (int day = 1; day <= 7; day++) {
                c.getAvailability().add(new CourtAvailability(c, day, LocalTime.of(cs.fromHour(), 0), LocalTime.of(cs.toHour(), 0)));
            }
            v.getCourts().add(c);
        }
        venues.saveAndFlush(v);
    }

    /** Cancha 3 de la Liga Barrial en mantenimiento esta tarde (se ve en el calendario). */
    private void blockForMaintenance() {
        organizations.findBySlug("liga-barrial").ifPresent(org -> venues.findByOrganizationIdOrderByNameAsc(org.getId()).stream()
                .flatMap(v -> v.getCourts().stream())
                .filter(c -> c.getName().equals("Cancha 3"))
                .findFirst()
                .ifPresent(c -> {
                    LocalDate today = LocalDate.now(ZONE);
                    c.getBlocks().add(new CourtBlock(c, today.atTime(14, 0).atZone(ZONE).toInstant(),
                            today.atTime(17, 0).atZone(ZONE).toInstant(), "Mantenimiento de la grama"));
                }));
    }

    private AppUser user(String name, String email) {
        return users.save(new AppUser(name, email, encoder.encode(DemoData.PASSWORD)));
    }
}
