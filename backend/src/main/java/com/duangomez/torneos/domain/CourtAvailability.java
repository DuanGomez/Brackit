package com.duangomez.torneos.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

/** Franja semanal en que una cancha se puede usar (1 = lunes … 7 = domingo). */
@Entity
@Table(name = "court_availability")
@Getter
@Setter
@NoArgsConstructor
public class CourtAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "court_id")
    private Court court;

    @Column(name = "day_of_week")
    private int dayOfWeek;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    public CourtAvailability(Court court, int dayOfWeek, LocalTime startTime, LocalTime endTime) {
        this.court = court;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
    }
}
