package com.duangomez.torneos.web;

import com.duangomez.torneos.service.TournamentService;
import com.duangomez.torneos.service.TournamentViews;
import com.duangomez.torneos.sport.Sport;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Lo que ve cualquier persona, sin iniciar sesión. */
@RestController
@RequestMapping("/api")
public class PublicController {

    private final TournamentService tournaments;

    public PublicController(TournamentService tournaments) {
        this.tournaments = tournaments;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/sports")
    public List<SportDto> sports() {
        return Arrays.stream(Sport.values()).map(TournamentViews::sport).toList();
    }

    @GetMapping("/public/tournaments")
    public List<TournamentCardDto> list(@RequestParam(required = false) Sport sport,
                                        @RequestParam(required = false) String q) {
        return tournaments.listPublic(sport, q);
    }

    @GetMapping("/public/tournaments/{slug}")
    public TournamentDto tournament(@PathVariable String slug) {
        return tournaments.getPublic(slug);
    }

    @GetMapping("/public/matches/{id}")
    public MatchDetailDto match(@PathVariable Long id) {
        return tournaments.getMatch(id);
    }
}
