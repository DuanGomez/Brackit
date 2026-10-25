package com.duangomez.torneos.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** Participante del torneo: un equipo, un jugador (tenis) o una pareja (pádel). */
@Entity
@Table(name = "team")
@Getter
@Setter
@NoArgsConstructor
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id")
    private Tournament tournament;

    private String name;

    @Column(name = "short_name")
    private String shortName;

    private String color;

    /** Color secundario del escudo generado. */
    private String color2;

    /** Foto del escudo subida por la organización (data URL de PNG, JPEG o WebP). */
    @Column(length = 400000)
    private String logo;

    /** Estilo del escudo generado cuando no hay foto. */
    @Column(name = "crest_style")
    private int crestStyle;

    /** Cambia cuando cambia el escudo, para que el navegador no muestre uno viejo de su caché. */
    public String logoVersion() {
        return Integer.toHexString(java.util.Objects.hash(logo, crestStyle, color, color2, shortName));
    }

    @Column(name = "group_label")
    private String groupLabel;

    /** Orden de inscripción; sirve de siembra para llaves y grupos. */
    private int seed;

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("shirtNumber ASC, id ASC")
    private List<Player> players = new ArrayList<>();
}
