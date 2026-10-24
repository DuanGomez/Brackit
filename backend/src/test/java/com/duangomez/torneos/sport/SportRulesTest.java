package com.duangomez.torneos.sport;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SportRulesTest {

    @Test
    void voleibolCierraSetsA25ConDosDeDiferenciaYElQuintoA15() {
        assertThat(Sport.VOLEIBOL.isSetFinished(0, 25, 23)).isTrue();
        assertThat(Sport.VOLEIBOL.isSetFinished(0, 25, 24)).isFalse();
        assertThat(Sport.VOLEIBOL.isSetFinished(0, 27, 25)).isTrue();
        assertThat(Sport.VOLEIBOL.isSetFinished(4, 15, 13)).isTrue();
        assertThat(Sport.VOLEIBOL.isSetFinished(4, 15, 14)).isFalse();
        assertThat(Sport.VOLEIBOL.maxSets()).isEqualTo(5);
    }

    @Test
    void tenisCierraA6ConDosDeDiferenciaOEnElTieBreak() {
        assertThat(Sport.TENIS.isSetFinished(0, 6, 4)).isTrue();
        assertThat(Sport.TENIS.isSetFinished(0, 6, 5)).isFalse();
        assertThat(Sport.TENIS.isSetFinished(0, 7, 5)).isTrue();
        assertThat(Sport.TENIS.isSetFinished(0, 6, 6)).isFalse();
        assertThat(Sport.TENIS.isSetFinished(0, 7, 6)).isTrue();
        assertThat(Sport.PADEL.maxSets()).isEqualTo(3);
    }

    @Test
    void puntosDeTablaPorDeporte() {
        assertThat(Sport.FUTBOL.tablePoints(1, 1)).isEqualTo(1);
        assertThat(Sport.BALONMANO.tablePoints(30, 28)).isEqualTo(2);
        assertThat(Sport.BALONCESTO.tablePoints(70, 80)).isEqualTo(1);
        assertThat(Sport.VOLEIBOL.tablePoints(3, 1)).isEqualTo(3);
        assertThat(Sport.VOLEIBOL.tablePoints(2, 3)).isEqualTo(1);
        assertThat(Sport.TENIS.tablePoints(1, 2)).isZero();
    }

    @Test
    void periodosYMinutos() {
        assertThat(Sport.FUTBOL.periodLabel(2)).isEqualTo("2T");
        assertThat(Sport.BALONCESTO.periodLabel(5)).isEqualTo("Prórroga 1");
        assertThat(Sport.BALONCESTO.minutesBeforePeriod(5)).isEqualTo(40);
        assertThat(Sport.BALONCESTO.minutesForPeriod(5)).isEqualTo(5);
        assertThat(Sport.FUTBOL.minutesBeforePeriod(2)).isEqualTo(45);
        assertThat(Sport.VOLEIBOL.periodLabel(3)).isEqualTo("Set 3");
    }
}
