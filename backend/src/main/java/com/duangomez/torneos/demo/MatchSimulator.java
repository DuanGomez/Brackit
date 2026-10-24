package com.duangomez.torneos.demo;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Player;
import com.duangomez.torneos.domain.Team;
import com.duangomez.torneos.service.MatchService;
import com.duangomez.torneos.sport.EventType;
import com.duangomez.torneos.sport.ScoringType;
import com.duangomez.torneos.sport.Sport;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Juega partidos ficticios usando exactamente las mismas reglas que un árbitro
 * ({@link MatchService}): de un tirón para el historial de la demo, o paso a paso en vivo.
 */
@Component
public class MatchSimulator {

    /** Velocidad del reloj en vivo: un partido de fútbol dura unos 10 minutos reales. */
    static double liveClockSpeed(Sport sport) {
        return switch (sport.scoring()) {
            case GOALS -> sport.periodMinutes() >= 45 ? 9 : 4;
            case POINTS -> 4;
            case SETS -> 1;
        };
    }

    private final MatchService rules;

    public MatchSimulator(MatchService rules) {
        this.rules = rules;
    }

    /** Fortaleza estable por equipo (0.75–1.25) para que los resultados tengan algo de lógica. */
    static double strength(Team team) {
        return 0.75 + Math.floorMod(team.getName().hashCode(), 50) / 100.0;
    }

    // ---------- Partido completo de un tirón ----------

    public void playInstantly(Match m, Instant kickoff, Random random) {
        Sport sport = m.getTournament().getSport();
        rules.start(m, kickoff);
        switch (sport.scoring()) {
            case GOALS -> playGoals(m, sport, kickoff, random);
            case POINTS -> playPoints(m, sport, kickoff, random);
            case SETS -> playSets(m, kickoff, random);
        }
    }

    private void playGoals(Match m, Sport sport, Instant kickoff, Random random) {
        double base = sport == Sport.BALONMANO ? 13 : sport == Sport.FUTBOL_SALA ? 1.5 : 0.7; // goles por tiempo y equipo
        Instant periodStart = kickoff;
        for (int period = 1; period <= sport.periods(); period++) {
            List<double[]> plan = new ArrayList<>(); // [minuto, equipo(0/1), tipo]
            for (int side = 0; side < 2; side++) {
                Team team = side == 0 ? m.getHome() : m.getAway();
                int goals = poisson(base * strength(team) * (side == 0 ? 1.08 : 1), random);
                for (int g = 0; g < goals; g++) plan.add(new double[]{random.nextDouble() * sport.periodMinutes(), side, 0});
                if (sport != Sport.BALONMANO && random.nextDouble() < 0.5) {
                    plan.add(new double[]{random.nextDouble() * sport.periodMinutes(), side, 1});
                }
                if (sport == Sport.BALONMANO && random.nextDouble() < 0.6) {
                    plan.add(new double[]{random.nextDouble() * sport.periodMinutes(), side, 2});
                }
            }
            plan.sort(Comparator.comparingDouble(p -> p[0]));
            for (double[] p : plan) {
                Team team = p[1] == 0 ? m.getHome() : m.getAway();
                EventType type = p[2] == 0 ? EventType.GOAL : p[2] == 1 ? EventType.YELLOW_CARD : EventType.SUSPENSION;
                Instant at = periodStart.plusMillis((long) (p[0] * 60_000));
                rules.addEvent(m, type, team.getId(), randomPlayer(team, random), at);
            }
            Instant periodEnd = periodStart.plus(Duration.ofMinutes(sport.periodMinutes()));
            if (period < sport.periods()) {
                periodStart = periodEnd.plus(Duration.ofMinutes(15));
                rules.nextPeriod(m, periodStart);
            } else {
                finishGoals(m, periodEnd.plus(Duration.ofMinutes(2)), random);
            }
        }
    }

    private void playPoints(Match m, Sport sport, Instant kickoff, Random random) {
        Instant periodStart = kickoff;
        int period = 1;
        while (true) {
            int minutes = sport.minutesForPeriod(period);
            int possessions = minutes * 2;
            for (int i = 0; i < possessions; i++) {
                for (int side = 0; side < 2; side++) {
                    Team team = side == 0 ? m.getHome() : m.getAway();
                    EventType shot = basketShot(team, random, 0.47);
                    if (shot == null) continue;
                    Instant at = periodStart.plusMillis((long) ((i + random.nextDouble()) * 30_000));
                    rules.addEvent(m, shot, team.getId(), randomPlayer(team, random), at);
                }
            }
            Instant periodEnd = periodStart.plus(Duration.ofMinutes(minutes));
            if (period >= sport.periods() && m.getHomeScore() != m.getAwayScore()) {
                rules.finish(m, null, null, periodEnd.plus(Duration.ofMinutes(1)));
                return;
            }
            periodStart = periodEnd.plus(Duration.ofMinutes(2));
            rules.nextPeriod(m, periodStart);
            period++;
        }
    }

    private void playSets(Match m, Instant kickoff, Random random) {
        double pHome = strength(m.getHome()) / (strength(m.getHome()) + strength(m.getAway()));
        Instant at = kickoff;
        boolean done = false;
        while (!done) {
            at = at.plusSeconds(25 + random.nextInt(20));
            Team team = random.nextDouble() < pHome ? m.getHome() : m.getAway();
            done = rules.addPoint(m, team.getId(), at);
        }
    }

    // ---------- Paso a paso en vivo ----------

    /**
     * Avanza un partido en vivo según el reloj real. Devuelve true si terminó.
     */
    public boolean step(Match m, Instant now, Random random) {
        if (m.getStatus() != MatchStatus.LIVE) return false;
        Sport sport = m.getTournament().getSport();
        if (sport.scoring() == ScoringType.SETS) {
            int points = sport == Sport.VOLEIBOL ? 2 : 1;
            double pHome = strength(m.getHome()) / (strength(m.getHome()) + strength(m.getAway()));
            for (int i = 0; i < points; i++) {
                Team team = random.nextDouble() < pHome ? m.getHome() : m.getAway();
                if (rules.addPoint(m, team.getId(), now)) return true;
            }
            return false;
        }

        int minute = MatchService.gameMinute(m, now);
        int periodEnd = sport.minutesBeforePeriod(m.getPeriod()) + sport.minutesForPeriod(m.getPeriod());
        if (minute > periodEnd) {
            boolean lastRegular = m.getPeriod() >= sport.periods();
            if (sport.scoring() == ScoringType.POINTS && lastRegular && m.getHomeScore() == m.getAwayScore()) {
                rules.nextPeriod(m, now); // prórroga
                return false;
            }
            if (!lastRegular) {
                rules.nextPeriod(m, now);
                return false;
            }
            if (sport.scoring() == ScoringType.POINTS) rules.finish(m, null, null, now);
            else finishGoals(m, now, random);
            return true;
        }

        // Probabilidades por paso de 6 s con el reloj acelerado
        double minutesPerStep = 6 / 60.0 * m.getClockSpeed();
        for (int side = 0; side < 2; side++) {
            Team team = side == 0 ? m.getHome() : m.getAway();
            if (sport.scoring() == ScoringType.POINTS) {
                int attempts = (int) Math.round(minutesPerStep * 2);
                for (int i = 0; i < attempts; i++) {
                    EventType shot = basketShot(team, random, 0.47);
                    if (shot != null) rules.addEvent(m, shot, team.getId(), randomPlayer(team, random), now);
                }
            } else {
                double perMinute = (sport == Sport.BALONMANO ? 26 : sport == Sport.FUTBOL_SALA ? 3 : 1.4)
                        / (sport.periods() * sport.periodMinutes()) * strength(team);
                if (random.nextDouble() < perMinute * minutesPerStep) {
                    rules.addEvent(m, EventType.GOAL, team.getId(), randomPlayer(team, random), now);
                } else if (sport != Sport.BALONMANO && random.nextDouble() < 0.012 * minutesPerStep) {
                    rules.addEvent(m, EventType.YELLOW_CARD, team.getId(), randomPlayer(team, random), now);
                }
            }
        }
        return false;
    }

    // ---------- Apoyo ----------

    private void finishGoals(Match m, Instant at, Random random) {
        Integer homePen = null, awayPen = null;
        if (m.getStage() == Stage.KNOCKOUT && m.getHomeScore() == m.getAwayScore()) {
            homePen = 3 + random.nextInt(3);
            do {
                awayPen = 2 + random.nextInt(4);
            } while (awayPen.equals(homePen));
        }
        rules.finish(m, homePen, awayPen, at);
    }

    private static EventType basketShot(Team team, Random random, double hitRate) {
        if (random.nextDouble() > hitRate * strength(team)) return null;
        double r = random.nextDouble();
        return r < 0.62 ? EventType.POINT_2 : r < 0.86 ? EventType.POINT_3 : EventType.POINT_1;
    }

    private static Long randomPlayer(Team team, Random random) {
        List<Player> players = team.getPlayers();
        if (players.isEmpty()) return null;
        // Los primeros de la plantilla (titulares) participan más
        int pool = Math.min(players.size(), 11);
        int index = random.nextDouble() < 0.85 ? 1 + random.nextInt(Math.max(1, pool - 1)) : random.nextInt(players.size());
        return players.get(Math.min(index, players.size() - 1)).getId();
    }

    private static int poisson(double lambda, Random random) {
        double l = Math.exp(-lambda), p = 1;
        int k = 0;
        do {
            k++;
            p *= random.nextDouble();
        } while (p > l);
        return k - 1;
    }
}
