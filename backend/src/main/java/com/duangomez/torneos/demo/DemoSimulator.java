package com.duangomez.torneos.demo;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.repo.TournamentRepository;
import com.duangomez.torneos.service.LiveBroadcaster;
import com.duangomez.torneos.service.MatchService;
import com.duangomez.torneos.service.TournamentProgress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Random;

/**
 * Mantiene un partido en vivo por torneo demo: lo inicia, lo avanza cada pocos segundos y,
 * cuando el torneo termina, lo reinicia unos minutos después. Así cualquiera que abra la
 * demo ve el marcador cambiar en tiempo real.
 */
@Component
@ConditionalOnProperty(name = "app.demo.simulator", havingValue = "true")
public class DemoSimulator {

    private static final Logger log = LoggerFactory.getLogger(DemoSimulator.class);
    private static final Duration PAUSE_BETWEEN_MATCHES = Duration.ofSeconds(30);
    private static final Duration SHOW_CHAMPION_FOR = Duration.ofMinutes(5);

    private final TournamentRepository tournaments;
    private final MatchService rules;
    private final MatchSimulator simulator;
    private final TournamentProgress progress;
    private final LiveBroadcaster broadcaster;
    private final DemoSeeder seeder;
    private final TransactionTemplate tx;
    private final Random random = new Random();

    public DemoSimulator(TournamentRepository tournaments, MatchService rules, MatchSimulator simulator,
                         TournamentProgress progress, LiveBroadcaster broadcaster, DemoSeeder seeder,
                         TransactionTemplate tx) {
        this.tournaments = tournaments;
        this.rules = rules;
        this.simulator = simulator;
        this.progress = progress;
        this.broadcaster = broadcaster;
        this.seeder = seeder;
        this.tx = tx;
    }

    @Scheduled(fixedDelayString = "${app.demo.tick-ms}", initialDelayString = "${app.demo.tick-ms}")
    public void tick() {
        List<Long> ids = tx.execute(s -> tournaments.findByOrganizationDemoTrue().stream().map(Tournament::getId).toList());
        for (Long id : ids) {
            try {
                tx.executeWithoutResult(s -> tournaments.findById(id).ifPresent(this::advance));
            } catch (RuntimeException e) {
                // Un choque con un árbitro humano (bloqueo optimista) no debe detener la demo
                log.debug("Simulación omitida en el torneo {}: {}", id, e.getMessage());
            }
        }
    }

    private void advance(Tournament t) {
        Instant now = Instant.now();
        if (t.getStatus() == TournamentStatus.FINISHED) {
            if (finishedLive(t, now)) broadcaster.tournamentChanged(seeder.reseed(t));
            return;
        }
        if (t.getStatus() != TournamentStatus.IN_PROGRESS) return;

        List<Match> live = t.getMatches().stream().filter(m -> m.getStatus() == MatchStatus.LIVE).toList();
        if (live.isEmpty()) {
            startNext(t, now);
            return;
        }
        for (Match m : live) {
            boolean finished = simulator.step(m, now, random);
            boolean structural = finished && progress.onFinished(m, null);
            broadcaster.matchChanged(m, structural);
        }
    }

    private void startNext(Tournament t, Instant now) {
        Instant lastFinish = lastFinish(t);
        if (lastFinish != null && lastFinish.plus(PAUSE_BETWEEN_MATCHES).isAfter(now)) return;
        t.getMatches().stream()
                .filter(m -> m.getStatus() == MatchStatus.SCHEDULED && m.hasBothTeams() && m.isPlaced())
                .min(Comparator.comparing(Match::getScheduledAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Match::getId))
                .ifPresent(m -> {
                    m.setClockSpeed(MatchSimulator.liveClockSpeed(t.getSport()));
                    rules.start(m, now);
                    broadcaster.matchChanged(m, false);
                });
    }

    /** Terminó jugando en vivo (no sembrado ya terminado) y ya se mostró el campeón un rato. */
    private static boolean finishedLive(Tournament t, Instant now) {
        Instant last = lastFinish(t);
        return last != null && last.isAfter(t.getCreatedAt()) && last.plus(SHOW_CHAMPION_FOR).isBefore(now);
    }

    private static Instant lastFinish(Tournament t) {
        return t.getMatches().stream().map(Match::getFinishedAt).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
    }
}
