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
import java.util.List;

@Entity
@Table(name = "tournament")
@Getter
@Setter
@NoArgsConstructor
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador público para la URL (/t/{slug}) y para el ingreso de árbitros. */
    private String slug;

    private String name;

    @Enumerated(EnumType.STRING)
    private Sport sport;

    @Enumerated(EnumType.STRING)
    private TournamentFormat format;

    @Enumerated(EnumType.STRING)
    private TournamentStatus status = TournamentStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private AppUser owner;

    private String description;

    private String location;

    @Column(name = "start_date")
    private LocalDate startDate;

    /** Liga a dos vueltas (ida y vuelta). */
    @Column(name = "double_round")
    private boolean doubleRound;

    @Column(name = "groups_count")
    private int groupsCount;

    @Column(name = "advance_per_group")
    private int advancePerGroup;

    /** PIN de árbitros guardado con BCrypt: solo se muestra al generarlo. */
    @Column(name = "referee_pin_hash")
    private String refereePinHash;

    @Column(name = "champion_team_id")
    private Long championTeamId;

    /** Torneo de demostración: no se puede borrar y se reinicia solo. */
    private boolean demo;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

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

    public boolean isOwnedBy(Long userId) {
        return owner != null && owner.getId().equals(userId);
    }
}
