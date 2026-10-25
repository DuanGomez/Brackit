package com.duangomez.torneos.web;

import com.duangomez.torneos.service.PublicService;
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

    private final PublicService publics;

    public PublicController(PublicService publics) {
        this.publics = publics;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/sports")
    public List<SportDto> sports() {
        return Arrays.stream(Sport.values()).map(TournamentViews::sport).toList();
    }

    @GetMapping("/public/orgs")
    public List<PublicOrgCardDto> organizations() {
        return publics.organizations();
    }

    @GetMapping("/public/orgs/{org}")
    public PublicOrgDto organization(@PathVariable String org) {
        return publics.organization(org);
    }

    @GetMapping("/public/orgs/{org}/tournaments/{slug}")
    public TournamentDto tournament(@PathVariable String org, @PathVariable String slug) {
        return publics.tournament(org, slug);
    }

    @GetMapping("/public/matches/{id}")
    public MatchDetailDto match(@PathVariable Long id) {
        return publics.match(id);
    }
}
