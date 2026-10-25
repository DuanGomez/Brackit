package com.duangomez.torneos.web;

import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.service.MatchService;
import com.duangomez.torneos.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Programación y operación en vivo de los partidos de una organización. */
@RestController
@RequestMapping("/api/orgs/{org}/matches/{id}")
public class MatchController {

    private final MatchService matches;

    public MatchController(MatchService matches) {
        this.matches = matches;
    }

    @GetMapping
    public MatchDetailDto get(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.get(org, id, me);
    }

    @PostMapping("/check")
    public List<ConflictDto> check(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody PlaceRequest req,
                                   @AuthenticationPrincipal AuthPrincipal me) {
        return matches.check(org, id, req, me);
    }

    @PutMapping("/place")
    public MatchCardDto place(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody PlaceRequest req,
                              @AuthenticationPrincipal AuthPrincipal me) {
        return matches.place(org, id, req, me);
    }

    @DeleteMapping("/place")
    public MatchCardDto unplace(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.unplace(org, id, me);
    }

    @PutMapping("/referee")
    public MatchCardDto referee(@PathVariable String org, @PathVariable Long id, @RequestBody RefereeRequest req,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return matches.assignReferee(org, id, req, me);
    }

    @PostMapping("/cancel")
    public MatchCardDto cancel(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody(required = false) CancelRequest req,
                               @AuthenticationPrincipal AuthPrincipal me) {
        return matches.cancel(org, id, req, me);
    }

    @PostMapping("/restore")
    public MatchCardDto restore(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.restore(org, id, me);
    }

    @PostMapping("/start")
    public MatchDetailDto start(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.start(org, id, me);
    }

    @PostMapping("/events")
    public MatchDetailDto event(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody EventRequest req,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return matches.addEvent(org, id, req, me);
    }

    @PostMapping("/points")
    public MatchDetailDto point(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody PointRequest req,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return matches.addPoint(org, id, req, me);
    }

    @PostMapping("/period")
    public MatchDetailDto period(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.nextPeriod(org, id, me);
    }

    @PostMapping("/undo")
    public MatchDetailDto undo(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        return matches.undo(org, id, me);
    }

    @PostMapping("/finish")
    public MatchDetailDto finish(@PathVariable String org, @PathVariable Long id, @RequestBody(required = false) FinishRequest req,
                                 @AuthenticationPrincipal AuthPrincipal me) {
        return matches.finish(org, id, req, me);
    }

    @PutMapping("/result")
    public MatchDetailDto result(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody ResultRequest req,
                                 @AuthenticationPrincipal AuthPrincipal me) {
        return matches.setResult(org, id, req, me);
    }
}
