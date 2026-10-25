package com.duangomez.torneos.web;

import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.service.VenueService;
import com.duangomez.torneos.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Sedes y canchas de la organización. */
@RestController
@RequestMapping("/api/orgs/{org}")
public class VenueController {

    private final VenueService venues;

    public VenueController(VenueService venues) {
        this.venues = venues;
    }

    @GetMapping("/venues")
    public List<VenueDto> list(@PathVariable String org, @AuthenticationPrincipal AuthPrincipal me) {
        return venues.list(org, me);
    }

    @PostMapping("/venues")
    @ResponseStatus(HttpStatus.CREATED)
    public VenueDto create(@PathVariable String org, @Valid @RequestBody VenueInput req, @AuthenticationPrincipal AuthPrincipal me) {
        return venues.create(org, req, me);
    }

    @PutMapping("/venues/{id}")
    public VenueDto update(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody VenueInput req,
                           @AuthenticationPrincipal AuthPrincipal me) {
        return venues.update(org, id, req, me);
    }

    @DeleteMapping("/venues/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        venues.delete(org, id, me);
    }

    @PostMapping("/venues/{id}/courts")
    @ResponseStatus(HttpStatus.CREATED)
    public CourtDto addCourt(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody CourtInput req,
                             @AuthenticationPrincipal AuthPrincipal me) {
        return venues.addCourt(org, id, req, me);
    }

    @PutMapping("/courts/{id}")
    public CourtDto updateCourt(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody CourtInput req,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return venues.updateCourt(org, id, req, me);
    }

    @DeleteMapping("/courts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCourt(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        venues.deleteCourt(org, id, me);
    }

    @PutMapping("/courts/{id}/availability")
    public CourtDto availability(@PathVariable String org, @PathVariable Long id,
                                 @Valid @RequestBody List<AvailabilityInput> req, @AuthenticationPrincipal AuthPrincipal me) {
        return venues.setAvailability(org, id, req, me);
    }

    @PostMapping("/courts/{id}/blocks")
    public CourtDto addBlock(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody BlockInput req,
                             @AuthenticationPrincipal AuthPrincipal me) {
        return venues.addBlock(org, id, req, me);
    }

    @DeleteMapping("/courts/{id}/blocks/{blockId}")
    public CourtDto removeBlock(@PathVariable String org, @PathVariable Long id, @PathVariable Long blockId,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return venues.removeBlock(org, id, blockId, me);
    }
}
