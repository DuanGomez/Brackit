package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.web.ApiException;

/** Reglas de autorización por recurso (además del rol que exige SecurityConfig). */
public final class Access {

    private Access() {
    }

    /** Solo el organizador dueño del torneo. */
    public static void requireOwner(Tournament t, AuthPrincipal principal) {
        if (principal == null || !principal.isOrganizer() || !t.isOwnedBy(principal.userId())) {
            throw ApiException.forbidden("Este torneo pertenece a otro organizador");
        }
    }

    /** El dueño o un árbitro con acceso a este torneo pueden operar los partidos. */
    public static void requireOperator(Tournament t, AuthPrincipal principal) {
        if (principal == null) throw ApiException.forbidden("No tienes acceso a este torneo");
        boolean owner = principal.isOrganizer() && t.isOwnedBy(principal.userId());
        boolean referee = !principal.isOrganizer() && t.getId().equals(principal.tournamentId());
        if (!owner && !referee) throw ApiException.forbidden("No tienes acceso a este torneo");
    }
}
