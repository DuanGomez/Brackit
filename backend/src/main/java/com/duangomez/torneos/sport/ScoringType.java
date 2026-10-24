package com.duangomez.torneos.sport;

/** Cómo se lleva el marcador de un deporte. */
public enum ScoringType {
    /** Se suman goles; el empate es posible en liga (fútbol, fútbol sala, balonmano). */
    GOALS,
    /** Canastas de 1, 2 o 3 puntos; nunca termina empatado (baloncesto). */
    POINTS,
    /** El partido se gana por sets; cada set tiene su propia regla de cierre (voleibol, tenis, pádel). */
    SETS
}
