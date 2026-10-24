package com.duangomez.torneos.engine;

import com.duangomez.torneos.engine.StandingsCalculator.Result;
import com.duangomez.torneos.engine.StandingsCalculator.Row;
import com.duangomez.torneos.engine.StandingsCalculator.TeamRef;
import com.duangomez.torneos.sport.Sport;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StandingsCalculatorTest {

    private static final List<TeamRef> FOUR = List.of(
            new TeamRef(1, "Atlético"), new TeamRef(2, "Boca"), new TeamRef(3, "Cóndor"), new TeamRef(4, "Deportivo"));

    private static List<Long> order(List<Row> rows) {
        return rows.stream().map(Row::teamId).toList();
    }

    @Test
    void futbolSumaTresUnoCeroYCalculaDiferencia() {
        List<Row> table = StandingsCalculator.compute(Sport.FUTBOL, FOUR, List.of(
                Result.of(1, 2, 2, 0),
                Result.of(3, 4, 1, 1)));

        Row first = table.get(0);
        assertThat(first.teamId()).isEqualTo(1);
        assertThat(first.points()).isEqualTo(3);
        assertThat(first.diff()).isEqualTo(2);
        assertThat(first.form()).containsExactly("G");
        Row draw = table.stream().filter(r -> r.teamId() == 3).findFirst().orElseThrow();
        assertThat(draw.points()).isEqualTo(1);
        assertThat(draw.drawn()).isEqualTo(1);
        assertThat(table.get(3).teamId()).isEqualTo(2);
    }

    @Test
    void futbolDesempataPorDiferenciaYLuegoGolesAFavor() {
        // 1 y 2 empatan en puntos (3) y diferencia (+1); 2 marcó más goles
        List<Row> table = StandingsCalculator.compute(Sport.FUTBOL, FOUR, List.of(
                Result.of(1, 3, 1, 0),
                Result.of(2, 4, 3, 2)));
        assertThat(order(table).subList(0, 2)).containsExactly(2L, 1L);
    }

    @Test
    void futbolUsaEnfrentamientoDirectoCuandoTodoLoDemasEmpata() {
        // 1 y 2: mismos puntos, diferencia y goles a favor; 2 le ganó a 1
        // 1: P 1-2, G 2-1, E 1-1 → 4 pts, 4:4 · 2: G 2-1, P 0-1, E 2-2 → 4 pts, 4:4
        List<Row> table = StandingsCalculator.compute(Sport.FUTBOL, FOUR, List.of(
                Result.of(1, 2, 1, 2),
                Result.of(1, 3, 2, 1),
                Result.of(1, 4, 1, 1),
                Result.of(2, 3, 0, 1),
                Result.of(2, 4, 2, 2),
                Result.of(3, 4, 0, 0)));
        Row r1 = table.stream().filter(r -> r.teamId() == 1).findFirst().orElseThrow();
        Row r2 = table.stream().filter(r -> r.teamId() == 2).findFirst().orElseThrow();
        assertThat(r1.points()).isEqualTo(r2.points());
        assertThat(r1.diff()).isEqualTo(r2.diff());
        assertThat(r1.scoreFor()).isEqualTo(r2.scoreFor());
        assertThat(order(table).indexOf(2L)).isLessThan(order(table).indexOf(1L));
    }

    @Test
    void baloncestoDosPorVictoriaUnoPorDerrotaYDirectoAntesQueDiferencia() {
        List<Row> table = StandingsCalculator.compute(Sport.BALONCESTO, FOUR, List.of(
                Result.of(1, 2, 70, 72),   // 2 gana el directo por 2
                Result.of(1, 3, 90, 50),   // 1 gana por paliza
                Result.of(2, 4, 60, 65),
                Result.of(3, 4, 40, 80)));
        Row r1 = table.stream().filter(r -> r.teamId() == 1).findFirst().orElseThrow();
        Row r2 = table.stream().filter(r -> r.teamId() == 2).findFirst().orElseThrow();
        assertThat(r1.points()).isEqualTo(3); // 1 victoria (2) + 1 derrota (1)
        assertThat(r2.points()).isEqualTo(3);
        assertThat(r1.diff()).isGreaterThan(r2.diff());
        // Aun con mejor diferencia, 1 queda detrás de 2 por el enfrentamiento directo
        assertThat(order(table).indexOf(2L)).isLessThan(order(table).indexOf(1L));
    }

    @Test
    void voleibolRepartePuntosEnTresDos() {
        List<Row> table = StandingsCalculator.compute(Sport.VOLEIBOL, FOUR, List.of(
                new Result(1, 2, 3, 2, 110, 104),
                new Result(3, 4, 3, 0, 75, 50)));
        assertThat(table.stream().filter(r -> r.teamId() == 1).findFirst().orElseThrow().points()).isEqualTo(2);
        assertThat(table.stream().filter(r -> r.teamId() == 2).findFirst().orElseThrow().points()).isEqualTo(1);
        assertThat(table.stream().filter(r -> r.teamId() == 3).findFirst().orElseThrow().points()).isEqualTo(3);
        assertThat(table.get(0).teamId()).isEqualTo(3);
    }

    @Test
    void voleibolDesempataPorCocienteDeSetsYLuegoDePuntos() {
        List<Row> table = StandingsCalculator.compute(Sport.VOLEIBOL, FOUR, List.of(
                new Result(1, 3, 3, 0, 75, 60),
                new Result(2, 4, 3, 0, 75, 40)));
        // Mismos puntos, victorias y sets: 2 tiene mejor cociente de puntos
        assertThat(order(table).subList(0, 2)).containsExactly(2L, 1L);
    }

    @Test
    void sinPartidosOrdenaAlfabeticamente() {
        List<Row> table = StandingsCalculator.compute(Sport.FUTBOL, List.of(
                new TeamRef(9, "Zeta"), new TeamRef(8, "alfa"), new TeamRef(7, "Beta")), List.of());
        assertThat(table).extracting(Row::name).containsExactly("alfa", "Beta", "Zeta");
    }

    @Test
    void rachaGuardaLosUltimosCinco() {
        List<TeamRef> two = List.of(new TeamRef(1, "A"), new TeamRef(2, "B"));
        List<Row> table = StandingsCalculator.compute(Sport.FUTBOL, two, List.of(
                Result.of(1, 2, 1, 0), Result.of(1, 2, 0, 1), Result.of(1, 2, 1, 1),
                Result.of(1, 2, 2, 0), Result.of(1, 2, 3, 0), Result.of(1, 2, 0, 2)));
        Row a = table.stream().filter(r -> r.teamId() == 1).findFirst().orElseThrow();
        assertThat(a.form()).containsExactly("P", "E", "G", "G", "P");
    }
}
