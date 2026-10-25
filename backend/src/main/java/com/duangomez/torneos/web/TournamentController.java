package com.duangomez.torneos.web;

import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.service.TournamentService;
import com.duangomez.torneos.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Torneos de una organización, sus equipos, jugadores y calendario. */
@RestController
@RequestMapping("/api/orgs/{org}")
public class TournamentController {

    private final TournamentService service;

    public TournamentController(TournamentService service) {
        this.service = service;
    }

    @GetMapping("/tournaments")
    public List<TournamentCardDto> list(@PathVariable String org, @AuthenticationPrincipal AuthPrincipal me) {
        return service.list(org, me);
    }

    @PostMapping("/tournaments")
    @ResponseStatus(HttpStatus.CREATED)
    public TournamentDto create(@PathVariable String org, @Valid @RequestBody CreateTournamentRequest req,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return service.create(org, req, me);
    }

    @GetMapping("/tournaments/{id}")
    public TournamentDto get(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return service.get(org, id, me);
    }

    @PutMapping("/tournaments/{id}")
    public TournamentDto update(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody UpdateTournamentRequest req,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return service.update(org, id, req, me);
    }

    @DeleteMapping("/tournaments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        service.delete(org, id, me);
    }

    @PostMapping("/tournaments/{id}/schedule")
    public ScheduleResult schedule(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody ScheduleRequest req,
                                   @AuthenticationPrincipal AuthPrincipal me) {
        return service.generateSchedule(org, id, req, me);
    }

    @PostMapping("/tournaments/{id}/place-pending")
    public ScheduleResult placePending(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return service.placePending(org, id, me);
    }

    @PostMapping("/tournaments/{id}/teams")
    @ResponseStatus(HttpStatus.CREATED)
    public TeamDto addTeam(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody TeamInput req,
                           @AuthenticationPrincipal AuthPrincipal me) {
        return service.addTeam(org, id, req, me);
    }

    @PutMapping("/teams/{id}")
    public TeamDto updateTeam(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody TeamInput req,
                              @AuthenticationPrincipal AuthPrincipal me) {
        return service.updateTeam(org, id, req, me);
    }

    @DeleteMapping("/teams/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTeam(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        service.deleteTeam(org, id, me);
    }

    @PostMapping("/teams/{id}/players")
    @ResponseStatus(HttpStatus.CREATED)
    public PlayerDto addPlayer(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody PlayerInput req,
                               @AuthenticationPrincipal AuthPrincipal me) {
        return service.addPlayer(org, id, req, me);
    }

    @PutMapping("/players/{id}")
    public PlayerDto updatePlayer(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody PlayerInput req,
                                  @AuthenticationPrincipal AuthPrincipal me) {
        return service.updatePlayer(org, id, req, me);
    }

    @DeleteMapping("/players/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlayer(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        service.deletePlayer(org, id, me);
    }
}
