package com.duangomez.torneos.sport;

/** Acciones que el árbitro registra durante un partido. Cada deporte admite un subconjunto. */
public enum EventType {
    GOAL("Gol", 1),
    OWN_GOAL("Autogol", 1),
    YELLOW_CARD("Tarjeta amarilla", 0),
    RED_CARD("Tarjeta roja", 0),
    SUSPENSION("Exclusión 2 min", 0),
    POINT_1("Tiro libre", 1),
    POINT_2("Canasta de 2", 2),
    POINT_3("Triple", 3),
    FOUL("Falta personal", 0),
    POINT("Punto", 1);

    private final String label;
    private final int scoreValue;

    EventType(String label, int scoreValue) {
        this.label = label;
        this.scoreValue = scoreValue;
    }

    public String label() {
        return label;
    }

    /** Cuánto suma al marcador del equipo acreditado (0 para tarjetas y faltas). */
    public int scoreValue() {
        return scoreValue;
    }

    /** Si cuenta para la tabla de goleadores / anotadores. */
    public boolean countsForScorer() {
        return this == GOAL || this == POINT_1 || this == POINT_2 || this == POINT_3;
    }
}
