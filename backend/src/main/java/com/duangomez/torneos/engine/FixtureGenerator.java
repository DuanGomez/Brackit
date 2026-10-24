package com.duangomez.torneos.engine;

import java.util.ArrayList;
import java.util.List;

/**
 * Calendario todos contra todos con el método del círculo: un equipo queda fijo y el resto rota.
 * Con un número impar de equipos se agrega un "descanso": quien lo enfrenta no juega esa jornada.
 */
public final class FixtureGenerator {

    public record Pairing(int round, long home, long away) {
    }

    private FixtureGenerator() {
    }

    public static List<Pairing> roundRobin(List<Long> teamIds, boolean doubleRound) {
        if (teamIds.size() < 2) throw new IllegalArgumentException("Se necesitan al menos 2 equipos");

        List<Long> slots = new ArrayList<>(teamIds);
        if (slots.size() % 2 == 1) slots.add(null); // descanso
        int n = slots.size();
        int rounds = n - 1;
        List<Pairing> firstLeg = new ArrayList<>();

        for (int round = 0; round < rounds; round++) {
            for (int i = 0; i < n / 2; i++) {
                Long a = slots.get(i);
                Long b = slots.get(n - 1 - i);
                if (a == null || b == null) continue;
                // Alterna localía: el equipo fijo cambia cada jornada y los demás según su posición
                boolean swap = (i == 0) ? round % 2 == 1 : i % 2 == 1;
                firstLeg.add(swap ? new Pairing(round + 1, b, a) : new Pairing(round + 1, a, b));
            }
            // Rotación: el primero queda fijo, el último pasa a la segunda posición
            slots.add(1, slots.remove(n - 1));
        }

        if (!doubleRound) return firstLeg;

        List<Pairing> all = new ArrayList<>(firstLeg);
        for (Pairing p : firstLeg) {
            all.add(new Pairing(p.round() + rounds, p.away(), p.home()));
        }
        return all;
    }

    /** Reparte equipos en grupos en "serpiente" según la siembra: A B C D D C B A ... */
    public static List<List<Long>> snakeGroups(List<Long> seededIds, int groups) {
        List<List<Long>> result = new ArrayList<>();
        for (int g = 0; g < groups; g++) result.add(new ArrayList<>());
        for (int i = 0; i < seededIds.size(); i++) {
            int lap = i / groups;
            int pos = i % groups;
            int group = lap % 2 == 0 ? pos : groups - 1 - pos;
            result.get(group).add(seededIds.get(i));
        }
        return result;
    }

    public static String groupLabel(int index) {
        return String.valueOf((char) ('A' + index));
    }
}
