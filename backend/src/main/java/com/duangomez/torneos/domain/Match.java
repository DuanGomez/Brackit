package com.duangomez.torneos.domain;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Partido. Se guarda en la tabla "fixture" porque MATCH es palabra reservada en SQL. */
@Entity
@Table(name = "fixture")
@Getter
@Setter
@NoArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id")
    private Tournament tournament;

    @Enumerated(EnumType.STRING)
    private Stage stage;

    /** Jornada en liga/grupos; ronda (1 = primera) en eliminación. */
    @Column(name = "round_number")
    private int roundNumber;

    @Column(name = "group_label")
    private String groupLabel;

    /** Posición dentro de la ronda de llaves; el ganador pasa a position/2 de la siguiente. */
    @Column(name = "bracket_position")
    private Integer bracketPosition;

    /** Nulo mientras la llave no tenga rival definido. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_team_id")
    private Team home;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "away_team_id")
    private Team away;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    private String venue;

    @Enumerated(EnumType.STRING)
    private MatchStatus status = MatchStatus.SCHEDULED;

    /** Periodo en curso: tiempo, cuarto o set (0 = sin empezar). */
    @Column(name = "period_number")
    private int period;

    @Column(name = "period_started_at")
    private Instant periodStartedAt;

    /** Velocidad del reloj de juego: 1 en partidos reales; mayor en la simulación de la demo. */
    @Column(name = "clock_speed")
    private double clockSpeed = 1;

    /** Goles o puntos; en deportes de sets, sets ganados. */
    @Column(name = "home_score")
    private int homeScore;

    @Column(name = "away_score")
    private int awayScore;

    @Column(name = "home_penalties")
    private Integer homePenalties;

    @Column(name = "away_penalties")
    private Integer awayPenalties;

    @Column(name = "winner_team_id")
    private Long winnerTeamId;

    /** Llave sin rival: el equipo pasa directo a la siguiente ronda. */
    private boolean bye;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    /** Bloqueo optimista: dos árbitros no pueden pisarse el marcador. */
    @Version
    private long version;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("setIndex ASC")
    private List<MatchSet> sets = new ArrayList<>();

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MatchEvent> events = new ArrayList<>();

    public boolean hasBothTeams() {
        return home != null && away != null;
    }

    public boolean involves(Long teamId) {
        return (home != null && home.getId().equals(teamId)) || (away != null && away.getId().equals(teamId));
    }

    public boolean isHome(Long teamId) {
        return home != null && home.getId().equals(teamId);
    }

    public Long homeId() {
        return home == null ? null : home.getId();
    }

    public Long awayId() {
        return away == null ? null : away.getId();
    }
}
