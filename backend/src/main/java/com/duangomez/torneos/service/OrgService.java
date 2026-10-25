package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.AppUser;
import com.duangomez.torneos.domain.Enums.MembershipStatus;
import com.duangomez.torneos.domain.Enums.Plan;
import com.duangomez.torneos.domain.Enums.Role;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.domain.Membership;
import com.duangomez.torneos.domain.Organization;
import com.duangomez.torneos.repo.*;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

/** Organizaciones (tenants) y sus miembros. */
@Service
public class OrgService {

    static final List<TournamentStatus> ACTIVE = List.of(TournamentStatus.DRAFT, TournamentStatus.IN_PROGRESS);
    private static final String[] PALETTE = {"#1F5BFF", "#18C46A", "#FF7A1A", "#8E44AD", "#E5484D", "#0EA5E9", "#D4A017"};

    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;
    private final UserRepository users;
    private final TournamentRepository tournaments;
    private final VenueRepository venues;
    private final OrgAccess access;

    public OrgService(OrganizationRepository organizations, MembershipRepository memberships, UserRepository users,
                      TournamentRepository tournaments, VenueRepository venues, OrgAccess access) {
        this.organizations = organizations;
        this.memberships = memberships;
        this.users = users;
        this.tournaments = tournaments;
        this.venues = venues;
        this.access = access;
    }

    /** Cualquier persona con cuenta puede crear su organización (plan Gratis) y queda como administradora. */
    @Transactional
    public OrgDto create(CreateOrgRequest req, AuthPrincipal principal) {
        AppUser user = users.findById(principal.userId()).orElseThrow(() -> ApiException.notFound("Cuenta no encontrada"));
        Organization org = new Organization();
        org.setName(req.name().trim());
        org.setSlug(uniqueSlug(req.name()));
        org.setShortName(initials(req.name()));
        org.setCity(blankToNull(req.city()));
        org.setColor(req.color() != null ? req.color().toUpperCase(Locale.ROOT)
                : PALETTE[(int) (organizations.count() % PALETTE.length)]);
        org.setPlan(Plan.FREE);
        organizations.save(org);
        memberships.save(new Membership(org, user, user.getEmail(), Role.ADMIN, MembershipStatus.ACTIVE));
        return dto(org, Role.ADMIN);
    }

    @Transactional(readOnly = true)
    public OrgDto get(String slug, AuthPrincipal principal) {
        Membership m = access.require(slug, principal);
        return dto(m.getOrganization(), m.getRole());
    }

    @Transactional
    public OrgDto update(String slug, UpdateOrgRequest req, AuthPrincipal principal) {
        Membership m = access.require(slug, principal, Role.ADMIN);
        Organization org = m.getOrganization();
        org.setName(req.name().trim());
        if (req.shortName() != null && !req.shortName().isBlank()) org.setShortName(req.shortName().trim().toUpperCase(Locale.ROOT));
        org.setCity(blankToNull(req.city()));
        org.setDescription(blankToNull(req.description()));
        if (req.color() != null) org.setColor(req.color().toUpperCase(Locale.ROOT));
        return dto(org, m.getRole());
    }

    // ---------- Miembros ----------

    @Transactional(readOnly = true)
    public List<MemberDto> members(String slug, AuthPrincipal principal) {
        Membership me = access.require(slug, principal);
        return memberships.findByOrganizationIdOrderByCreatedAtAsc(me.getOrganization().getId()).stream().map(OrgService::member).toList();
    }

    /** Invita por correo. Si la persona ya tiene cuenta queda activa; si no, al registrarse. */
    @Transactional
    public MemberDto invite(String slug, InviteRequest req, AuthPrincipal principal) {
        Membership me = access.require(slug, principal, Role.ADMIN);
        Organization org = me.getOrganization();
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (memberships.findByOrganizationIdAndEmailIgnoreCase(org.getId(), email).isPresent()) {
            throw ApiException.conflict("Esa persona ya es miembro o tiene una invitación");
        }
        AppUser user = users.findByEmailIgnoreCase(email).orElse(null);
        Membership m = new Membership(org, user, email, req.role(), user == null ? MembershipStatus.INVITED : MembershipStatus.ACTIVE);
        memberships.save(m);
        return member(m);
    }

    @Transactional
    public MemberDto changeRole(String slug, Long memberId, RoleRequest req, AuthPrincipal principal) {
        Membership me = access.require(slug, principal, Role.ADMIN);
        Membership target = memberOf(me.getOrganization(), memberId);
        if (target.getRole() == Role.ADMIN && req.role() != Role.ADMIN) requireAnotherAdmin(me.getOrganization());
        target.setRole(req.role());
        return member(target);
    }

    @Transactional
    public void remove(String slug, Long memberId, AuthPrincipal principal) {
        Membership me = access.require(slug, principal, Role.ADMIN);
        Membership target = memberOf(me.getOrganization(), memberId);
        if (target.getRole() == Role.ADMIN) requireAnotherAdmin(me.getOrganization());
        memberships.delete(target);
    }

    private void requireAnotherAdmin(Organization org) {
        if (memberships.countByOrganizationIdAndRoleAndStatus(org.getId(), Role.ADMIN, MembershipStatus.ACTIVE) <= 1) {
            throw ApiException.badRequest("La organización necesita al menos un administrador");
        }
    }

    private Membership memberOf(Organization org, Long id) {
        Membership m = memberships.findById(id).orElseThrow(() -> ApiException.notFound("Miembro no encontrado"));
        if (!m.getOrganization().getId().equals(org.getId())) throw ApiException.notFound("Miembro no encontrado");
        return m;
    }

    // ---------- Apoyo ----------

    OrgDto dto(Organization org, Role role) {
        LimitsDto limits = new LimitsDto(org.getPlan().maxActiveTournaments(), org.getPlan().maxVenues(),
                tournaments.countByOrganizationIdAndStatusIn(org.getId(), ACTIVE), venues.countByOrganizationId(org.getId()));
        return new OrgDto(org.getId(), org.getSlug(), org.getName(), org.getShortName(), org.getColor(), org.getCity(),
                org.getDescription(), org.getPlan().name(), org.isDemo(), role == null ? null : role.name(), limits);
    }

    static MemberDto member(Membership m) {
        return new MemberDto(m.getId(), m.getUser() == null ? null : m.getUser().getId(),
                m.getUser() == null ? null : m.getUser().getName(), m.getEmail(), m.getRole().name(), m.getStatus().name());
    }

    public String uniqueSlug(String name) {
        String base = slugify(name);
        if (base.length() > 40) base = base.substring(0, 40).replaceAll("-$", "");
        if (base.isEmpty()) base = "liga";
        String slug = base;
        int n = 2;
        while (organizations.existsBySlug(slug) || RESERVED.contains(slug)) slug = base + "-" + n++;
        return slug;
    }

    /** Rutas propias de la app que no pueden ser el nombre de una organización. */
    private static final List<String> RESERVED = List.of("app", "api", "ingresar", "registro", "panel", "precios", "arbitro", "ligas");

    public static String slugify(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    public static String initials(String name) {
        String[] words = slugify(name).toUpperCase(Locale.ROOT).split("-");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty() && sb.length() < 2 && !List.of("DE", "LA", "EL", "DEL", "Y", "LOS", "LAS").contains(w)) sb.append(w.charAt(0));
        }
        if (sb.length() == 0) return "OR";
        if (sb.length() == 1 && words[0].length() > 1) sb.append(words[0].charAt(1));
        return sb.toString();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
