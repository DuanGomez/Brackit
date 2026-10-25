package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.repo.CourtRepository;
import com.duangomez.torneos.repo.VenueRepository;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

/** Sedes, canchas, su horario semanal y sus bloqueos. */
@Service
public class VenueService {

    private final VenueRepository venues;
    private final CourtRepository courts;
    private final OrgAccess access;

    public VenueService(VenueRepository venues, CourtRepository courts, OrgAccess access) {
        this.venues = venues;
        this.courts = courts;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<VenueDto> list(String org, AuthPrincipal principal) {
        Membership m = access.require(org, principal);
        return venues.findByOrganizationIdOrderByNameAsc(m.getOrganization().getId()).stream().map(TournamentViews::venue).toList();
    }

    @Transactional
    public VenueDto create(String org, VenueInput input, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        if (venues.countByOrganizationId(o.getId()) >= o.getPlan().maxVenues()) {
            throw ApiException.forbidden("Tu plan permite " + o.getPlan().maxVenues() + " sede(s). Escríbenos para ampliarlo.");
        }
        Venue v = new Venue();
        v.setOrganization(o);
        v.setName(input.name().trim());
        v.setAddress(blankToNull(input.address()));
        venues.save(v);
        return TournamentViews.venue(v);
    }

    @Transactional
    public VenueDto update(String org, Long venueId, VenueInput input, AuthPrincipal principal) {
        Venue v = venue(org, venueId, principal);
        v.setName(input.name().trim());
        v.setAddress(blankToNull(input.address()));
        return TournamentViews.venue(v);
    }

    @Transactional
    public void delete(String org, Long venueId, AuthPrincipal principal) {
        venues.delete(venue(org, venueId, principal));
    }

    @Transactional
    public CourtDto addCourt(String org, Long venueId, CourtInput input, AuthPrincipal principal) {
        Venue v = venue(org, venueId, principal);
        Court c = new Court();
        c.setVenue(v);
        c.setPosition(v.getCourts().size());
        apply(c, input);
        // Horario inicial razonable: todos los días de 8 a. m. a 10 p. m.
        for (int day = 1; day <= 7; day++) c.getAvailability().add(new CourtAvailability(c, day, LocalTime.of(8, 0), LocalTime.of(22, 0)));
        v.getCourts().add(c);
        courts.save(c);
        return TournamentViews.court(c);
    }

    @Transactional
    public CourtDto updateCourt(String org, Long courtId, CourtInput input, AuthPrincipal principal) {
        Court c = court(org, courtId, principal);
        apply(c, input);
        return TournamentViews.court(c);
    }

    @Transactional
    public void deleteCourt(String org, Long courtId, AuthPrincipal principal) {
        Court c = court(org, courtId, principal);
        c.getVenue().getCourts().remove(c);
    }

    /** Reemplaza el horario semanal de la cancha. */
    @Transactional
    public CourtDto setAvailability(String org, Long courtId, List<AvailabilityInput> windows, AuthPrincipal principal) {
        Court c = court(org, courtId, principal);
        c.getAvailability().clear();
        for (AvailabilityInput w : windows) {
            LocalTime start = LocalTime.parse(w.start());
            LocalTime end = LocalTime.parse(w.end());
            if (!end.isAfter(start)) throw ApiException.badRequest("La hora final debe ser posterior a la inicial");
            c.getAvailability().add(new CourtAvailability(c, w.dayOfWeek(), start, end));
        }
        return TournamentViews.court(c);
    }

    @Transactional
    public CourtDto addBlock(String org, Long courtId, BlockInput input, AuthPrincipal principal) {
        Court c = court(org, courtId, principal);
        if (!input.endsAt().isAfter(input.startsAt())) throw ApiException.badRequest("El bloqueo debe terminar después de empezar");
        c.getBlocks().add(new CourtBlock(c, input.startsAt(), input.endsAt(), blankToNull(input.reason())));
        courts.flush();
        return TournamentViews.court(c);
    }

    @Transactional
    public CourtDto removeBlock(String org, Long courtId, Long blockId, AuthPrincipal principal) {
        Court c = court(org, courtId, principal);
        c.getBlocks().removeIf(b -> b.getId().equals(blockId));
        return TournamentViews.court(c);
    }

    private static void apply(Court c, CourtInput input) {
        c.setName(input.name().trim());
        c.setSurface(blankToNull(input.surface()));
        c.setSportList(input.sports());
    }

    private Venue venue(String org, Long id, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        Venue v = venues.findById(id).orElseThrow(() -> ApiException.notFound("Sede no encontrada"));
        if (!v.getOrganization().getId().equals(o.getId())) throw ApiException.notFound("Sede no encontrada");
        return v;
    }

    Court court(String org, Long id, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        return courtOf(o, id);
    }

    Court courtOf(Organization o, Long id) {
        Court c = courts.findById(id).orElseThrow(() -> ApiException.notFound("Cancha no encontrada"));
        if (!c.getVenue().getOrganization().getId().equals(o.getId())) throw ApiException.notFound("Cancha no encontrada");
        return c;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
