package com.duangomez.torneos.security;

/**
 * Quién hace la petición. Un organizador tiene {@code userId}; un árbitro no tiene cuenta y
 * su token solo vale para un torneo ({@code tournamentId}).
 */
public record AuthPrincipal(Long userId, String name, Role role, Long tournamentId) {

    public enum Role {
        ORGANIZER,
        REFEREE
    }

    public static AuthPrincipal organizer(Long userId, String name) {
        return new AuthPrincipal(userId, name, Role.ORGANIZER, null);
    }

    public static AuthPrincipal referee(Long tournamentId) {
        return new AuthPrincipal(null, "Árbitro", Role.REFEREE, tournamentId);
    }

    public boolean isOrganizer() {
        return role == Role.ORGANIZER;
    }
}
