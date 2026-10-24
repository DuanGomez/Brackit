package com.duangomez.torneos.domain;

/** Enumeraciones del dominio agrupadas en un solo archivo para leerlas de un vistazo. */
public final class Enums {

    private Enums() {
    }

    public enum TournamentFormat {
        /** Todos contra todos (una o dos vueltas). */
        LEAGUE,
        /** Eliminación directa con llaves. */
        KNOCKOUT,
        /** Fase de grupos y luego eliminación directa. */
        GROUPS_KNOCKOUT
    }

    public enum TournamentStatus {
        /** Inscribiendo equipos; aún sin calendario. */
        DRAFT,
        IN_PROGRESS,
        FINISHED
    }

    public enum Stage {
        LEAGUE,
        GROUP,
        KNOCKOUT
    }

    public enum MatchStatus {
        SCHEDULED,
        LIVE,
        FINISHED
    }
}
