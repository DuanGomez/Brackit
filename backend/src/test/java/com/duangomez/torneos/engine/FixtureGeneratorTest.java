package com.duangomez.torneos.engine;

import com.duangomez.torneos.engine.FixtureGenerator.Pairing;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.*;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FixtureGeneratorTest {

    private static List<Long> teams(int n) {
        return LongStream.rangeClosed(1, n).boxed().toList();
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 3, 4, 5, 6, 7, 8, 10, 16})
    void cadaParejaSeEnfrentaUnaVezYNadieJuegaDosVecesPorJornada(int n) {
        List<Pairing> fixture = FixtureGenerator.roundRobin(teams(n), false);

        assertThat(fixture).hasSize(n * (n - 1) / 2);

        Set<String> pairs = new HashSet<>();
        for (Pairing p : fixture) {
            String key = Math.min(p.home(), p.away()) + "-" + Math.max(p.home(), p.away());
            assertThat(pairs.add(key)).as("pareja repetida %s", key).isTrue();
        }

        Map<Integer, Set<Long>> byRound = new HashMap<>();
        for (Pairing p : fixture) {
            Set<Long> playing = byRound.computeIfAbsent(p.round(), r -> new HashSet<>());
            assertThat(playing.add(p.home())).isTrue();
            assertThat(playing.add(p.away())).isTrue();
        }
        int expectedRounds = n % 2 == 0 ? n - 1 : n;
        assertThat(byRound).hasSize(expectedRounds);
    }

    @ParameterizedTest
    @ValueSource(ints = {4, 6, 8, 5})
    void laLocaliaQuedaEquilibrada(int n) {
        List<Pairing> fixture = FixtureGenerator.roundRobin(teams(n), false);
        Map<Long, Integer> homes = new HashMap<>();
        fixture.forEach(p -> homes.merge(p.home(), 1, Integer::sum));
        int games = n % 2 == 0 ? n - 1 : n - 1;
        for (long t = 1; t <= n; t++) {
            int h = homes.getOrDefault(t, 0);
            assertThat(Math.abs(h - (games - h))).as("equipo %d", t).isLessThanOrEqualTo(2);
        }
    }

    @Test
    void conImparesCadaEquipoDescansaUnaJornada() {
        List<Pairing> fixture = FixtureGenerator.roundRobin(teams(5), false);
        Map<Long, Integer> played = new HashMap<>();
        fixture.forEach(p -> {
            played.merge(p.home(), 1, Integer::sum);
            played.merge(p.away(), 1, Integer::sum);
        });
        assertThat(played.values()).allMatch(v -> v == 4);
    }

    @Test
    void idaYVueltaInvierteLaLocalia() {
        List<Pairing> fixture = FixtureGenerator.roundRobin(teams(4), true);
        assertThat(fixture).hasSize(12);
        Set<String> directed = new HashSet<>();
        fixture.forEach(p -> assertThat(directed.add(p.home() + ">" + p.away())).isTrue());
        assertThat(fixture.stream().mapToInt(Pairing::round).max().orElseThrow()).isEqualTo(6);
    }

    @Test
    void rechazaMenosDeDosEquipos() {
        assertThatThrownBy(() -> FixtureGenerator.roundRobin(teams(1), false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void gruposEnSerpienteSegunSiembra() {
        List<List<Long>> groups = FixtureGenerator.snakeGroups(teams(8), 2);
        assertThat(groups.get(0)).containsExactly(1L, 4L, 5L, 8L);
        assertThat(groups.get(1)).containsExactly(2L, 3L, 6L, 7L);
    }
}
