package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Organization;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.repo.MatchRepository;
import com.duangomez.torneos.repo.OrganizationRepository;
import com.duangomez.torneos.repo.TournamentRepository;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Lo que ve el público sin iniciar sesión: la página de cada organización y sus torneos. */
@Service
public class PublicService {

    private static final ZoneId ZONE = SchedulingService.ZONE;
    private static final List<TournamentStatus> VISIBLE = List.of(TournamentStatus.IN_PROGRESS, TournamentStatus.FINISHED);

    private final OrganizationRepository organizations;
    private final TournamentRepository tournaments;
    private final MatchRepository matches;
    private final TournamentViews views;

    public PublicService(OrganizationRepository organizations, TournamentRepository tournaments, MatchRepository matches,
                         TournamentViews views) {
        this.organizations = organizations;
        this.tournaments = tournaments;
        this.matches = matches;
        this.views = views;
    }

    /** Organizaciones con torneos publicados (para "Ligas en vivo" en el sitio). */
    @Transactional(readOnly = true)
    public List<PublicOrgCardDto> organizations() {
        List<PublicOrgCardDto> out = new ArrayList<>();
        for (Organization o : organizations.findAllByOrderByNameAsc()) {
            List<Tournament> visible = tournaments.findByOrganizationIdAndStatusInOrderByCreatedAtDesc(o.getId(), VISIBLE);
            if (visible.isEmpty()) continue;
            int live = matches.findByOrganizationAndStatus(o.getId(), List.of(MatchStatus.LIVE)).size();
            out.add(new PublicOrgCardDto(TournamentViews.org(o), visible.size(), live));
        }
        out.sort(Comparator.comparingInt(PublicOrgCardDto::liveCount).reversed());
        return out;
    }

    @Transactional(readOnly = true)
    public PublicOrgDto organization(String slug) {
        Organization o = organizations.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Organización no encontrada"));
        List<Tournament> visible = tournaments.findByOrganizationIdAndStatusInOrderByCreatedAtDesc(o.getId(), VISIBLE);
        LocalDate today = LocalDate.now(ZONE);
        List<Match> todays = new ArrayList<>(matches.findScheduled(o.getId(), today.atStartOfDay(ZONE).toInstant(),
                today.plusDays(1).atStartOfDay(ZONE).toInstant()));
        List<Match> live = matches.findByOrganizationAndStatus(o.getId(), List.of(MatchStatus.LIVE));
        for (Match m : live) if (!todays.contains(m)) todays.add(m);
        todays.removeIf(m -> m.getTournament().getStatus() == TournamentStatus.DRAFT || !m.hasBothTeams());
        todays.sort(Comparator.comparing(Match::getScheduledAt, Comparator.nullsLast(Comparator.naturalOrder())));
        Match featured = live.stream().findFirst().orElse(null);
        return new PublicOrgDto(TournamentViews.org(o), o.getDescription(),
                visible.stream().map(TournamentViews::tournamentCard).toList(),
                featured == null ? null : TournamentViews.card(featured),
                todays.stream().map(TournamentViews::card).toList(), Instant.now());
    }

    @Transactional(readOnly = true)
    public TournamentDto tournament(String orgSlug, String slug) {
        Organization o = organizations.findBySlug(orgSlug).orElseThrow(() -> ApiException.notFound("Organización no encontrada"));
        Tournament t = tournaments.findByOrganizationIdAndSlug(o.getId(), slug)
                .filter(x -> x.getStatus() != TournamentStatus.DRAFT)
                .orElseThrow(() -> ApiException.notFound("Torneo no encontrado"));
        return views.full(t);
    }

    @Transactional(readOnly = true)
    public MatchDetailDto match(Long id) {
        Match m = matches.findById(id)
                .filter(x -> x.getTournament().getStatus() != TournamentStatus.DRAFT)
                .orElseThrow(() -> ApiException.notFound("Partido no encontrado"));
        return TournamentViews.detail(m);
    }
}
