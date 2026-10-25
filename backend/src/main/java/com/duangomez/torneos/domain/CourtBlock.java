package com.duangomez.torneos.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Bloqueo puntual de una cancha: mantenimiento, evento o clima. */
@Entity
@Table(name = "court_block")
@Getter
@Setter
@NoArgsConstructor
public class CourtBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "court_id")
    private Court court;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    private String reason;

    public CourtBlock(Court court, Instant startsAt, Instant endsAt, String reason) {
        this.court = court;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.reason = reason;
    }
}
