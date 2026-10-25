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
        KNOCKOUT,
        THIRD_PLACE
    }

    public enum MatchStatus {
        SCHEDULED,
        LIVE,
        FINISHED,
        CANCELLED
    }

    /** Plan de suscripción de la organización. */
    public enum Plan {
        FREE(1, 1),
        LIGA(Integer.MAX_VALUE, 5),
        CLUB(Integer.MAX_VALUE, Integer.MAX_VALUE);

        private final int maxActiveTournaments;
        private final int maxVenues;

        Plan(int maxActiveTournaments, int maxVenues) {
            this.maxActiveTournaments = maxActiveTournaments;
            this.maxVenues = maxVenues;
        }

        public int maxActiveTournaments() {
            return maxActiveTournaments;
        }

        public int maxVenues() {
            return maxVenues;
        }
    }

    /** Rol de una persona dentro de una organización. */
    public enum Role {
        /** Todo: miembros, plan, ajustes y lo demás. */
        ADMIN,
        /** Torneos, equipos, calendario y resultados. */
        COORDINATOR,
        /** Dirige partidos en vivo. */
        REFEREE;

        public boolean canManage() {
            return this == ADMIN || this == COORDINATOR;
        }
    }

    public enum MembershipStatus {
        /** Invitada por correo; se activa al registrarse con ese correo. */
        INVITED,
        ACTIVE
    }
}
