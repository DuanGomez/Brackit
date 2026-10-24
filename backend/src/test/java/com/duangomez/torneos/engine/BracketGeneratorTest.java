package com.duangomez.torneos.engine;

import com.duangomez.torneos.engine.BracketGenerator.Slot;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;

class BracketGeneratorTest {

    private static List<Long> seeds(int n) {
        return LongStream.rangeClosed(1, n).boxed().toList();
    }

    @Test
    void ordenDeSiembraEstandar() {
        assertThat(BracketGenerator.seedOrder(8)).containsExactly(1, 8, 4, 5, 2, 7, 3, 6);
        assertThat(BracketGenerator.seedOrder(4)).containsExactly(1, 4, 2, 3);
    }

    @Test
    void ochoEquiposSinByes() {
        List<Slot> round = BracketGenerator.firstRound(seeds(8));
        assertThat(round).extracting(Slot::home).containsExactly(1L, 4L, 2L, 3L);
        assertThat(round).extracting(Slot::away).containsExactly(8L, 5L, 7L, 6L);
        assertThat(round).noneMatch(Slot::bye);
    }

    @Test
    void seisEquiposLosDosMejoresPasanDirecto() {
        List<Slot> round = BracketGenerator.firstRound(seeds(6));
        assertThat(round).hasSize(4);
        assertThat(round.stream().filter(Slot::bye).map(Slot::home).toList()).containsExactlyInAnyOrder(1L, 2L);
        assertThat(round).filteredOn(s -> !s.bye()).hasSize(2);
    }

    @Test
    void losDosMejoresSoloSeCruzanEnLaFinal() {
        List<Slot> round = BracketGenerator.firstRound(seeds(16));
        int pos1 = round.stream().filter(s -> s.home() == 1L).findFirst().orElseThrow().position();
        int pos2 = round.stream().filter(s -> s.home() == 2L).findFirst().orElseThrow().position();
        assertThat(pos1 < 4).isNotEqualTo(pos2 < 4); // mitades opuestas de la llave
    }

    @Test
    void rondasYNombres() {
        assertThat(BracketGenerator.totalRounds(8)).isEqualTo(3);
        assertThat(BracketGenerator.totalRounds(5)).isEqualTo(3);
        assertThat(BracketGenerator.roundLabel(3, 3)).isEqualTo("Final");
        assertThat(BracketGenerator.roundLabel(2, 3)).isEqualTo("Semifinal");
        assertThat(BracketGenerator.roundLabel(1, 3)).isEqualTo("Cuartos de final");
        assertThat(BracketGenerator.roundLabel(1, 5)).isEqualTo("Ronda de 32");
    }

    @Test
    void cruceDeGruposPrimerosContraSegundos() {
        // Grupos A..D con [primero, segundo]
        List<List<Long>> q = List.of(List.of(11L, 12L), List.of(21L, 22L), List.of(31L, 32L), List.of(41L, 42L));
        List<Slot> round = BracketGenerator.fromGroups(q, 2);
        assertThat(round).extracting(s -> s.home() + "-" + s.away())
                .containsExactly("11-22", "31-42", "21-12", "41-32");
        // Los dos clasificados de un mismo grupo quedan en mitades opuestas
        assertThat(round.subList(0, 2)).extracting(Slot::home).contains(11L);
        assertThat(round.subList(2, 4)).extracting(Slot::away).contains(12L);
    }
}
