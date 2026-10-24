package com.duangomez.torneos.demo;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.repo.TournamentRepository;
import com.duangomez.torneos.repo.UserRepository;
import com.duangomez.torneos.service.ScheduleBuilder;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/** Si la base está vacía, crea el organizador demo y un torneo por deporte con historial jugado. */
@Component
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true")
public class DemoSeeder implements ApplicationRunner {

    static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);

    private final UserRepository users;
    private final TournamentRepository tournaments;
    private final TournamentService tournamentService;
    private final TournamentProgress progress;
    private final MatchSimulator simulator;
    private final PasswordEncoder encoder;
    private final TransactionTemplate tx;

    public DemoSeeder(UserRepository users, TournamentRepository tournaments, TournamentService tournamentService,
                      TournamentProgress progress, MatchSimulator simulator, PasswordEncoder encoder, TransactionTemplate tx) {
        this.users = users;
        this.tournaments = tournaments;
        this.tournamentService = tournamentService;
        this.progress = progress;
        this.simulator = simulator;
        this.encoder = encoder;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() > 0) return;
        tx.executeWithoutResult(status -> {
            AppUser owner = users.save(new AppUser("Organizador demo", DemoData.EMAIL, encoder.encode(DemoData.PASSWORD)));
            DemoData.tournaments().forEach(spec -> seed(spec, owner));
        });
        log.info("Demo lista: {} / {} · PIN de árbitro {}", DemoData.EMAIL, DemoData.PASSWORD, DemoData.REFEREE_PIN);
    }

    /** Borra y vuelve a crear un torneo demo con el mismo enlace. */
    public Tournament reseed(Tournament old) {
        DemoData.Spec spec = DemoData.tournaments().stream()
                .filter(s -> s.slug().equals(old.getSlug())).findFirst().orElse(null);
        if (spec == null) return old;
        AppUser owner = old.getOwner();
        tournaments.delete(old);
        tournaments.flush(); // el slug es único: el borrado debe llegar antes que la nueva inserción
        return seed(spec, owner);
    }

    Tournament seed(DemoData.Spec spec, AppUser owner) {
        Random random = new Random(spec.slug().hashCode() ^ System.nanoTime());
        LocalDate today = LocalDate.now(ZONE);

        Tournament t = new Tournament();
        t.setOwner(owner);
        t.setSlug(spec.slug());
        t.setName(spec.name());
        t.setSport(spec.sport());
        t.setFormat(spec.format());
        t.setLocation(spec.location());
        t.setDescription(spec.description());
        t.setStartDate(today.minusDays(spec.daysAgo()));
        t.setGroupsCount(spec.groups());
        t.setAdvancePerGroup(spec.advance());
        t.setDemo(true);
        t.setRefereePinHash(encoder.encode(DemoData.REFEREE_PIN));

        for (String name : spec.teams()) {
            Team team = tournamentService.addTeamTo(t, new TeamInput(name, null, null));
            for (String[] p : DemoData.roster(spec.sport(), name, random)) {
                Player player = new Player();
                player.setTeam(team);
                player.setName(p[0]);
                player.setShirtNumber(p[1] == null ? null : Integer.valueOf(p[1]));
                team.getPlayers().add(player);
            }
        }
        tournaments.saveAndFlush(t);

        int minutesBetween = switch (spec.sport().scoring()) {
            case GOALS -> 120;
            case POINTS -> 105;
            case SETS -> 90;
        };
        tournamentService.buildSchedule(t, new ScheduleBuilder.Plan(today.minusDays(spec.daysAgo()),
                LocalTime.of(spec.hour(), 0), spec.daysBetweenRounds(), minutesBetween, spec.venues(), ZONE));
        tournaments.saveAndFlush(t);

        for (int round = 1; round <= spec.playedRounds(); round++) {
            int r = round;
            List<Match> toPlay = t.getMatches().stream()
                    .filter(m -> m.getRoundNumber() == r && m.getStatus() == MatchStatus.SCHEDULED && m.hasBothTeams())
                    .sorted(Comparator.comparing(Match::getScheduledAt))
                    .toList();
            for (Match m : toPlay) {
                simulator.playInstantly(m, m.getScheduledAt(), random);
                progress.onFinished(m, null);
            }
            tournaments.saveAndFlush(t);
        }
        return t;
    }
}
