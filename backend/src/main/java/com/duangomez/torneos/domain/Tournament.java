package com.duangomez.torneos.domain;

import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.sport.Sport;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "tournament")
@Getter
@Setter
@NoArgsConstructor
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    /** Único dentro de la organización: /l/{org}/{slug}. */
    private String slug;

    private String name;

    /** Categoría libre: "Mayores", "Sub-15", "Femenino". */
    private String category;

    @Enumerated(EnumType.STRING)
    private Sport sport;

    @Enumerated(EnumType.STRING)
    private TournamentFormat format;

    @Enumerated(EnumType.STRING)
    private TournamentStatus status = TournamentStatus.DRAFT;

    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "double_round")
    private boolean doubleRound;

    @Column(name = "groups_count")
    private int groupsCount;

    @Column(name = "advance_per_group")
    private int advancePerGroup;

    /** Partido por el tercer puesto entre los perdedores de semifinales. */
    @Column(name = "third_place")
    private boolean thirdPlace;

    /** Minutos que ocupa un partido en la cancha (juego + descansos + cambio de equipos). */
    @Column(name = "block_minutes")
    private int blockMinutes;

    /** Horas mínimas entre dos partidos de un mismo equipo. */
    @Column(name = "min_rest_hours")
    private int minRestHours;

    /** Días entre jornadas al programar. */
    @Column(name = "days_between")
    private int daysBetween = 7;

    @Column(name = "champion_team_id")
    private Long championTeamId;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    /** Canchas donde se puede programar este torneo. */
    @ManyToMany
    @JoinTable(name = "tournament_court",
            joinColumns = @JoinColumn(name = "tournament_id"),
            inverseJoinColumns = @JoinColumn(name = "court_id"))
    private Set<Court> courts = new LinkedHashSet<>();

    @OneToMany(mappedBy = "tournament", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seed ASC")
    private List<Team> teams = new ArrayList<>();

    @OneToMany(mappedBy = "tournament", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("roundNumber ASC, id ASC")
    private List<Match> matches = new ArrayList<>();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public boolean belongsTo(Organization org) {
        return organization != null && organization.getId().equals(org.getId());
    }
}
