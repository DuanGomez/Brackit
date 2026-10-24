package com.duangomez.torneos.web;

import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.service.TournamentService;
import com.duangomez.torneos.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Panel del organizador: sus torneos, equipos, jugadores, calendario y PIN de árbitros. */
@RestController
@RequestMapping("/api")
public class TournamentController {

    private final TournamentService service;

    public TournamentController(TournamentService service) {
        this.service = service;
    }

    @GetMapping("/tournaments")
    public List<TournamentCardDto> mine(@AuthenticationPrincipal AuthPrincipal me) {
        return service.listMine(me);
    }

    @PostMapping("/tournaments")
    @ResponseStatus(HttpStatus.CREATED)
    public TournamentDto create(@Valid @RequestBody CreateTournamentRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return service.create(req, me);
    }

    @GetMapping("/tournaments/{id}")
    public TournamentDto get(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return service.getForOwner(id, me);
    }

    @PutMapping("/tournaments/{id}")
    public TournamentDto update(@PathVariable Long id, @Valid @RequestBody UpdateTournamentRequest req,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return service.update(id, req, me);
    }

    @DeleteMapping("/tournaments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        service.delete(id, me);
    }

    @PostMapping("/tournaments/{id}/teams")
    @ResponseStatus(HttpStatus.CREATED)
    public TeamDto addTeam(@PathVariable Long id, @Valid @RequestBody TeamInput req, @AuthenticationPrincipal AuthPrincipal me) {
        return service.addTeam(id, req, me);
    }

    @PutMapping("/teams/{id}")
    public TeamDto updateTeam(@PathVariable Long id, @Valid @RequestBody TeamInput req, @AuthenticationPrincipal AuthPrincipal me) {
        return service.updateTeam(id, req, me);
    }

    @DeleteMapping("/teams/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTeam(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        service.deleteTeam(id, me);
    }

    @PostMapping("/teams/{id}/players")
    @ResponseStatus(HttpStatus.CREATED)
    public PlayerDto addPlayer(@PathVariable Long id, @Valid @RequestBody PlayerInput req, @AuthenticationPrincipal AuthPrincipal me) {
        return service.addPlayer(id, req, me);
    }

    @DeleteMapping("/players/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlayer(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        service.deletePlayer(id, me);
    }

    @PostMapping("/tournaments/{id}/schedule")
    public TournamentDto schedule(@PathVariable Long id, @Valid @RequestBody ScheduleRequest req,
                                  @AuthenticationPrincipal AuthPrincipal me) {
        return service.generateSchedule(id, req, me);
    }

    @PostMapping("/tournaments/{id}/referee-pin")
    public PinResponse pin(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return service.regeneratePin(id, me);
    }
}
