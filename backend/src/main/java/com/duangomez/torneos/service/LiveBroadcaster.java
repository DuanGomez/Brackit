package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.Match;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.repo.MatchRepository;
import com.duangomez.torneos.repo.TournamentRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

/**
 * Publica los cambios por WebSocket (STOMP) cuando la transacción ya se confirmó,
 * para que nadie vea en vivo un marcador que luego se revierte.
 * <ul>
 *   <li>/topic/matches/{id}: detalle del partido con su línea de tiempo.</li>
 *   <li>/topic/tournaments/{id}: el partido, la tabla y los goleadores; o "refresh" si cambió la estructura.</li>
 *   <li>/topic/orgs/{slug}: aviso para que el panel y el calendario de la organización se recarguen.</li>
 * </ul>
 */
@Component
public class LiveBroadcaster {

    /** Evento interno: un partido cambió. {@code structural} = llaves, fase final o campeón. */
    public record MatchChanged(Long tournamentId, Long matchId, boolean structural) {
    }

    /** Aviso del canal de la organización. */
    public record OrgChanged(String type, Long tournamentId, Instant at) {
    }

    /** Evento interno: cambió el torneo completo (equipos, calendario, programación). */
    public record TournamentChanged(Long tournamentId) {
    }

    private final SimpMessagingTemplate messaging;
    private final TournamentRepository tournaments;
    private final MatchRepository matches;
    private final TournamentViews views;
    private final ApplicationEventPublisher publisher;

    public LiveBroadcaster(SimpMessagingTemplate messaging, TournamentRepository tournaments, MatchRepository matches,
                           TournamentViews views, ApplicationEventPublisher publisher) {
        this.messaging = messaging;
        this.tournaments = tournaments;
        this.matches = matches;
        this.views = views;
        this.publisher = publisher;
    }

    public void matchChanged(Match match, boolean structural) {
        publisher.publishEvent(new MatchChanged(match.getTournament().getId(), match.getId(), structural));
    }

    public void tournamentChanged(Tournament tournament) {
        publisher.publishEvent(new TournamentChanged(tournament.getId()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onMatchChanged(MatchChanged event) {
        Match match = matches.findById(event.matchId()).orElse(null);
        Tournament tournament = tournaments.findById(event.tournamentId()).orElse(null);
        if (match == null || tournament == null) return;

        messaging.convertAndSend("/topic/matches/" + match.getId(), TournamentViews.detail(match));
        String topic = "/topic/tournaments/" + tournament.getId();
        messaging.convertAndSend(topic, views.liveUpdate(tournament, match));
        if (event.structural()) messaging.convertAndSend(topic, TournamentViews.refresh(tournament));
        notifyOrg(tournament);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onTournamentChanged(TournamentChanged event) {
        tournaments.findById(event.tournamentId()).ifPresent(t -> {
            messaging.convertAndSend("/topic/tournaments/" + t.getId(), TournamentViews.refresh(t));
            notifyOrg(t);
        });
    }

    private void notifyOrg(Tournament t) {
        messaging.convertAndSend("/topic/orgs/" + t.getOrganization().getSlug(), new OrgChanged("changed", t.getId(), Instant.now()));
    }
}
