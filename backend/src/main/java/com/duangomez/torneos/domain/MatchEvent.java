package com.duangomez.torneos.domain;

import com.duangomez.torneos.sport.EventType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Acción registrada por el árbitro. El equipo es siempre el acreditado (en un autogol, el que suma). */
@Entity
@Table(name = "fixture_event")
@Getter
@Setter
@NoArgsConstructor
public class MatchEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fixture_id")
    private Match match;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private EventType type;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    private Player player;

    @Column(name = "period_number")
    private int period;

    @Column(name = "game_minute")
    private Integer minute;

    @Column(name = "set_index")
    private Integer setIndex;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
