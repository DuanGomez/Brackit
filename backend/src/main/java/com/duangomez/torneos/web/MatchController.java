package com.duangomez.torneos.web;

import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.service.MatchService;
import com.duangomez.torneos.service.TournamentService;
import com.duangomez.torneos.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Control del partido: lo usan el árbitro (con PIN) y el organizador. */
@RestController
@RequestMapping("/api/matches/{id}")
public class MatchController {

    private final MatchService matches;
    private final TournamentService tournaments;

    public MatchController(MatchService matches, TournamentService tournaments) {
        this.matches = matches;
        this.tournaments = tournaments;
    }

    @PostMapping("/start")
    public MatchDetailDto start(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.start(id, me);
    }

    @PostMapping("/events")
    public MatchDetailDto event(@PathVariable Long id, @Valid @RequestBody EventRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.addEvent(id, req, me);
    }

    @PostMapping("/points")
    public MatchDetailDto point(@PathVariable Long id, @Valid @RequestBody PointRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.addPoint(id, req, me);
    }

    @PostMapping("/period")
    public MatchDetailDto period(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.nextPeriod(id, me);
    }

    @PostMapping("/undo")
    public MatchDetailDto undo(@PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.undo(id, me);
    }

    @PostMapping("/finish")
    public MatchDetailDto finish(@PathVariable Long id, @RequestBody(required = false) FinishRequest req,
                                 @AuthenticationPrincipal AuthPrincipal me) {
        return matches.finish(id, req, me);
    }

    @PutMapping("/result")
    public MatchDetailDto result(@PathVariable Long id, @Valid @RequestBody ResultRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.setResult(id, req, me);
    }

    @PutMapping("/schedule")
    public MatchDto schedule(@PathVariable Long id, @Valid @RequestBody MatchScheduleRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return tournaments.scheduleMatch(id, req, me);
    }
}
