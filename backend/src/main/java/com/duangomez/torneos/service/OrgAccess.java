package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.Enums.MembershipStatus;
import com.duangomez.torneos.domain.Enums.Role;
import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Membership;
import com.duangomez.torneos.domain.Organization;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.repo.MembershipRepository;
import com.duangomez.torneos.repo.OrganizationRepository;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.web.ApiException;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Aislamiento entre organizaciones: toda operación privada pasa por aquí. Resuelve la
 * organización de la URL y exige que quien llama sea miembro activo con un rol permitido.
 * Además, cada recurso que se toca debe pertenecer a esa misma organización.
 */
@Component
public class OrgAccess {

    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;

    public OrgAccess(OrganizationRepository organizations, MembershipRepository memberships) {
        this.organizations = organizations;
        this.memberships = memberships;
    }

    public Organization organization(String slug) {
        return organizations.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Organización no encontrada"));
    }

    /** Miembro activo con cualquiera de los roles dados (sin roles = cualquier miembro). */
    public Membership require(String orgSlug, AuthPrincipal principal, Role... allowed) {
        if (principal == null) throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar");
        Organization org = organization(orgSlug);
        Membership m = memberships.findByOrganizationIdAndUserIdAndStatus(org.getId(), principal.userId(), MembershipStatus.ACTIVE)
                // Mismo mensaje que "no existe": no revela qué organizaciones hay
                .orElseThrow(() -> ApiException.notFound("Organización no encontrada"));
        if (allowed.length > 0 && Arrays.stream(allowed).noneMatch(r -> r == m.getRole())) {
            throw ApiException.forbidden("Tu rol en esta organización no permite esta acción");
        }
        return m;
    }

    /** Administrador o coordinador. */
    public Membership requireManager(String orgSlug, AuthPrincipal principal) {
        return require(orgSlug, principal, Role.ADMIN, Role.COORDINATOR);
    }

    public static void sameOrg(Tournament t, Organization org) {
        if (!t.belongsTo(org)) throw ApiException.notFound("Torneo no encontrado");
    }

    public static void sameOrg(Match m, Organization org) {
        if (!m.getTournament().belongsTo(org)) throw ApiException.notFound("Partido no encontrado");
    }

    /**
     * Quién puede dirigir un partido: administrador o coordinador siempre; un árbitro, si el
     * partido no tiene árbitro o es el suyo.
     */
    public static void canOperate(Match m, Membership member) {
        if (member.getRole().canManage()) return;
        if (m.getReferee() != null && !m.getReferee().getId().equals(member.getUser().getId())) {
            throw ApiException.forbidden("Este partido está asignado a otro árbitro");
        }
    }
}
