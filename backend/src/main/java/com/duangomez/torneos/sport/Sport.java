package com.duangomez.torneos.sport;

import java.util.List;

import static com.duangomez.torneos.sport.EventType.*;

/**
 * Catálogo de deportes con sus reglas. Toda la lógica que cambia entre deportes
 * (marcador, puntos en la tabla, periodos, cierre de sets) sale de aquí.
 */
public enum Sport {
    FUTBOL("Fútbol", ScoringType.GOALS, 2, 45, 3, 1, 0,
            0, 0, 0, 0, 0, "Goleadores", "Goles", "Equipo",
            List.of(GOAL, OWN_GOAL, YELLOW_CARD, RED_CARD)),
    FUTBOL_SALA("Fútbol sala", ScoringType.GOALS, 2, 20, 3, 1, 0,
            0, 0, 0, 0, 0, "Goleadores", "Goles", "Equipo",
            List.of(GOAL, OWN_GOAL, YELLOW_CARD, RED_CARD)),
    BALONMANO("Balonmano", ScoringType.GOALS, 2, 30, 2, 1, 0,
            0, 0, 0, 0, 0, "Goleadores", "Goles", "Equipo",
            List.of(GOAL, SUSPENSION, YELLOW_CARD, RED_CARD)),
    BALONCESTO("Baloncesto", ScoringType.POINTS, 4, 10, 2, 0, 1,
            0, 0, 0, 0, 0, "Anotadores", "Puntos", "Equipo",
            List.of(POINT_1, POINT_2, POINT_3, FOUL)),
    VOLEIBOL("Voleibol", ScoringType.SETS, 0, 0, 3, 0, 0,
            3, 25, 15, 2, 0, "Puntos por equipo", "Puntos", "Equipo",
            List.of(POINT)),
    TENIS("Tenis", ScoringType.SETS, 0, 0, 2, 0, 0,
            2, 6, 6, 2, 7, "Juegos ganados", "Juegos", "Jugador",
            List.of(POINT)),
    PADEL("Pádel", ScoringType.SETS, 0, 0, 2, 0, 0,
            2, 6, 6, 2, 7, "Juegos ganados", "Juegos", "Pareja",
            List.of(POINT));

    private final String label;
    private final ScoringType scoring;
    private final int periods;
    private final int periodMinutes;
    private final int winPoints;
    private final int drawPoints;
    private final int lossPoints;
    private final int setsToWin;
    private final int setTarget;
    private final int lastSetTarget;
    private final int winBy;
    private final int setCap;
    private final String scorersTitle;
    private final String scoreUnit;
    private final String participantLabel;
    private final List<EventType> events;

    Sport(String label, ScoringType scoring, int periods, int periodMinutes,
          int winPoints, int drawPoints, int lossPoints,
          int setsToWin, int setTarget, int lastSetTarget, int winBy, int setCap,
          String scorersTitle, String scoreUnit, String participantLabel, List<EventType> events) {
        this.label = label;
        this.scoring = scoring;
        this.periods = periods;
        this.periodMinutes = periodMinutes;
        this.winPoints = winPoints;
        this.drawPoints = drawPoints;
        this.lossPoints = lossPoints;
        this.setsToWin = setsToWin;
        this.setTarget = setTarget;
        this.lastSetTarget = lastSetTarget;
        this.winBy = winBy;
        this.setCap = setCap;
        this.scorersTitle = scorersTitle;
        this.scoreUnit = scoreUnit;
        this.participantLabel = participantLabel;
        this.events = events;
    }

    public String label() { return label; }
    public ScoringType scoring() { return scoring; }
    public int periods() { return periods; }
    public int periodMinutes() { return periodMinutes; }
    public int winPoints() { return winPoints; }
    public int drawPoints() { return drawPoints; }
    public int lossPoints() { return lossPoints; }
    public int setsToWin() { return setsToWin; }
    public int setTarget() { return setTarget; }
    public int lastSetTarget() { return lastSetTarget; }
    public int winBy() { return winBy; }
    public int setCap() { return setCap; }
    public String scorersTitle() { return scorersTitle; }
    public String scoreUnit() { return scoreUnit; }
    public String participantLabel() { return participantLabel; }
    public List<EventType> events() { return events; }

    /** Minutos de cancha por partido por defecto: juego, descansos y cambio de equipos. */
    public int defaultBlockMinutes() {
        return switch (this) {
            case FUTBOL, TENIS -> 120;
            case FUTBOL_SALA -> 60;
            case BALONCESTO -> 105;
            case BALONMANO, VOLEIBOL, PADEL -> 90;
        };
    }

    public boolean allowsDraw() {
        return scoring == ScoringType.GOALS;
    }

    public int maxSets() {
        return setsToWin * 2 - 1;
    }

    public boolean supports(EventType type) {
        return events.contains(type);
    }

    /** Puntos de tabla por partido según el resultado. En voleibol, 3-2 reparte 2 y 1. */
    public int tablePoints(int ownScore, int rivalScore) {
        if (ownScore == rivalScore) return drawPoints;
        boolean won = ownScore > rivalScore;
        if (this == VOLEIBOL && Math.min(ownScore, rivalScore) == setsToWin - 1) {
            return won ? 2 : 1;
        }
        return won ? winPoints : lossPoints;
    }

    /** Puntos (o juegos) necesarios para cerrar el set {@code setIndex} (base 0). */
    public int targetForSet(int setIndex) {
        return setIndex == maxSets() - 1 ? lastSetTarget : setTarget;
    }

    /**
     * ¿El set terminó con este marcador? Regla general: llegar al objetivo con
     * {@code winBy} de diferencia. Con tope (tenis/pádel), llegar al tope cierra el set (7-6).
     */
    public boolean isSetFinished(int setIndex, int home, int away) {
        if (scoring != ScoringType.SETS) return false;
        int high = Math.max(home, away);
        if (setCap > 0 && high >= setCap) return true;
        return high >= targetForSet(setIndex) && Math.abs(home - away) >= winBy;
    }

    /** Nombre del periodo para mostrar: 1T/2T, C1..C4 y prórrogas, o Set n. */
    public String periodLabel(int period) {
        if (period <= 0) return "";
        return switch (scoring) {
            case GOALS -> period <= periods ? period + "T" : "Prórroga";
            case POINTS -> period <= periods ? "C" + period : "Prórroga " + (period - periods);
            case SETS -> "Set " + period;
        };
    }

    /** Duración del periodo en minutos de juego (prórroga de baloncesto: 5). */
    public int minutesForPeriod(int period) {
        if (scoring == ScoringType.POINTS && period > periods) return 5;
        return periodMinutes;
    }

    /** Minutos de juego acumulados antes de empezar el periodo dado. */
    public int minutesBeforePeriod(int period) {
        int total = 0;
        for (int p = 1; p < period; p++) total += minutesForPeriod(p);
        return total;
    }
}
