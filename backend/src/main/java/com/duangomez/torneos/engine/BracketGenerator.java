package com.duangomez.torneos.engine;

import java.util.ArrayList;
import java.util.List;

/**
 * Llaves de eliminación directa con siembra estándar (1 vs 16, 8 vs 9, ...): los mejores
 * sembrados solo pueden cruzarse en las últimas rondas. Si los equipos no completan una
 * potencia de 2, los primeros sembrados pasan directo ("bye").
 */
public final class BracketGenerator {

    /** Cruce de la primera ronda. {@code away} es nulo cuando {@code home} pasa directo. */
    public record Slot(int position, Long home, Long away) {
        public boolean bye() {
            return home == null || away == null;
        }
    }

    private BracketGenerator() {
    }

    public static int bracketSize(int teams) {
        int size = 1;
        while (size < teams) size *= 2;
        return size;
    }

    public static int totalRounds(int teams) {
        return Integer.numberOfTrailingZeros(bracketSize(teams));
    }

    /** Orden de siembras en la llave: [1, 8, 4, 5, 2, 7, 3, 6] para 8 equipos. */
    public static List<Integer> seedOrder(int size) {
        List<Integer> order = new ArrayList<>(List.of(1, 2));
        while (order.size() < size) {
            int next = order.size() * 2;
            List<Integer> expanded = new ArrayList<>();
            for (int seed : order) {
                expanded.add(seed);
                expanded.add(next + 1 - seed);
            }
            order = expanded;
        }
        return order;
    }

    /** Primera ronda a partir de la lista ordenada por siembra (índice 0 = mejor sembrado). */
    public static List<Slot> firstRound(List<Long> seededIds) {
        if (seededIds.size() < 2) throw new IllegalArgumentException("Se necesitan al menos 2 equipos");
        int size = bracketSize(seededIds.size());
        List<Integer> order = seedOrder(size);
        List<Slot> slots = new ArrayList<>();
        for (int i = 0; i < size; i += 2) {
            Long a = teamForSeed(seededIds, order.get(i));
            Long b = teamForSeed(seededIds, order.get(i + 1));
            // El mejor sembrado siempre de local; si uno falta, el otro pasa directo
            if (a == null) {
                a = b;
                b = null;
            }
            slots.add(new Slot(i / 2, a, b));
        }
        return slots;
    }

    /**
     * Cruces de la fase final desde grupos con 1 o 2 clasificados por grupo.
     * Con 2: A1-B2, B1-A2, C1-D2, D1-C2... ubicados para que los primeros de grupos
     * vecinos queden en mitades opuestas. Con 1: los ganadores se siembran en orden.
     */
    public static List<Slot> fromGroups(List<List<Long>> qualifiersByGroup, int advancePerGroup) {
        int groups = qualifiersByGroup.size();
        if (advancePerGroup == 1) {
            List<Long> winners = qualifiersByGroup.stream().map(q -> q.get(0)).toList();
            return firstRound(winners);
        }
        if (advancePerGroup != 2 || groups % 2 != 0) {
            throw new IllegalArgumentException("Configuración de grupos no soportada");
        }
        List<Slot> top = new ArrayList<>();
        List<Slot> bottom = new ArrayList<>();
        for (int g = 0; g < groups; g += 2) {
            List<Long> a = qualifiersByGroup.get(g);
            List<Long> b = qualifiersByGroup.get(g + 1);
            top.add(new Slot(0, a.get(0), b.get(1)));
            bottom.add(new Slot(0, b.get(0), a.get(1)));
        }
        List<Slot> ordered = new ArrayList<>(top);
        ordered.addAll(bottom);
        List<Slot> result = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) {
            result.add(new Slot(i, ordered.get(i).home(), ordered.get(i).away()));
        }
        return result;
    }

    private static Long teamForSeed(List<Long> seededIds, int seed) {
        return seed <= seededIds.size() ? seededIds.get(seed - 1) : null;
    }

    /** "Final", "Semifinal", "Cuartos de final", "Octavos de final" o "Ronda de 32". */
    public static String roundLabel(int round, int totalRounds) {
        int remaining = totalRounds - round;
        return switch (remaining) {
            case 0 -> "Final";
            case 1 -> "Semifinal";
            case 2 -> "Cuartos de final";
            case 3 -> "Octavos de final";
            default -> "Ronda de " + (1 << (remaining + 1));
        };
    }
}
