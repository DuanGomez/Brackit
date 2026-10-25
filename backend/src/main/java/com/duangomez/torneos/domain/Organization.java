package com.duangomez.torneos.domain;

import com.duangomez.torneos.domain.Enums.Plan;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Tenant: una liga, club o empresa con su propio espacio aislado. */
@Entity
@Table(name = "organization")
@Getter
@Setter
@NoArgsConstructor
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador en la URL pública: /l/{slug}. */
    private String slug;

    private String name;

    /** Iniciales para el escudo (hasta 3 letras). */
    @Column(name = "short_name")
    private String shortName;

    /** Color de marca de la organización (#RRGGBB). */
    private String color;

    private String city;

    private String description;

    @Enumerated(EnumType.STRING)
    private Plan plan = Plan.FREE;

    /** Organización de demostración: se reinicia sola y no se puede borrar. */
    private boolean demo;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
