package com.duangomez.torneos.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Marcador de un set (puntos en voleibol, juegos en tenis y pádel). */
@Entity
@Table(name = "fixture_set")
@Getter
@Setter
@NoArgsConstructor
public class MatchSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fixture_id")
    private Match match;

    @Column(name = "set_index")
    private int setIndex;

    private int home;

    private int away;

    private boolean finished;

    public MatchSet(Match match, int setIndex) {
        this.match = match;
        this.setIndex = setIndex;
    }
}
