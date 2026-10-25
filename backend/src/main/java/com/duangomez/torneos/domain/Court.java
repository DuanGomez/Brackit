package com.duangomez.torneos.domain;

import com.duangomez.torneos.sport.Sport;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/** Cancha dentro de una sede, con su horario de disponibilidad y sus bloqueos. */
@Entity
@Table(name = "court")
@Getter
@Setter
@NoArgsConstructor
public class Court {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id")
    private Venue venue;

    private String name;

    /** Descripción corta: "Fútbol 11 · grama sintética". */
    private String surface;

    /** Deportes que admite, separados por coma. Vacío = todos. */
    private String sports;

    private int position;

    @OneToMany(mappedBy = "court", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayOfWeek ASC, startTime ASC")
    private List<CourtAvailability> availability = new ArrayList<>();

    @OneToMany(mappedBy = "court", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("startsAt ASC")
    private List<CourtBlock> blocks = new ArrayList<>();

    public List<Sport> sportList() {
        if (sports == null || sports.isBlank()) return List.of();
        return Arrays.stream(sports.split(",")).map(String::trim).filter(s -> !s.isEmpty()).map(Sport::valueOf).toList();
    }

    public void setSportList(List<Sport> list) {
        this.sports = list == null || list.isEmpty() ? null : list.stream().map(Enum::name).collect(Collectors.joining(","));
    }

    public boolean supports(Sport sport) {
        List<Sport> list = sportList();
        return list.isEmpty() || list.contains(sport);
    }
}
