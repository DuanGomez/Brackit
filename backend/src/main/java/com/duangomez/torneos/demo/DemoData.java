package com.duangomez.torneos.demo;

import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.sport.Sport;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/** Datos de los torneos de demostración (todos ficticios). */
public final class DemoData {

    public static final String EMAIL = "demo@brackit.app";
    public static final String PASSWORD = "demo1234";
    /** PIN de árbitro de todos los torneos demo; se muestra en la pantalla de ingreso. */
    public static final String REFEREE_PIN = "246810";

    /**
     * Un torneo demo. {@code daysAgo}: cuántos días antes de hoy fue la primera jornada;
     * {@code playedRounds}: jornadas/rondas que ya se jugaron al sembrar.
     */
    public record Spec(String slug, String name, Sport sport, TournamentFormat format, String location,
                       String description, List<String> teams, int groups, int advance,
                       int daysAgo, int daysBetweenRounds, int playedRounds, List<String> venues, int hour) {
    }

    private DemoData() {
    }

    public static List<Spec> tournaments() {
        return List.of(
                new Spec("liga-barrial-medellin", "Liga Barrial de Fútbol", Sport.FUTBOL, TournamentFormat.LEAGUE,
                        "Medellín", "Ocho equipos de barrio, todos contra todos. El primero de la tabla es el campeón.",
                        List.of("Atlético Robledo", "Deportivo Belén", "Club Laureles", "Independiente Castilla",
                                "Juventud Bello", "Estrella de Manrique", "Unión Itagüí", "Real Envigado Sur"),
                        0, 0, 28, 7, 4, List.of("Cancha Marte 1", "Unidad Deportiva Belén"), 15),
                new Spec("copa-antioquia-baloncesto", "Copa Antioquia de Baloncesto", Sport.BALONCESTO,
                        TournamentFormat.GROUPS_KNOCKOUT, "Coliseo Iván de Bedout, Medellín",
                        "Dos grupos de cuatro; los dos primeros de cada grupo juegan semifinales cruzadas.",
                        List.of("Titanes de Envigado", "Halcones de Rionegro", "Búhos de Sabaneta", "Cóndores del Norte",
                                "Piratas de Bello", "Leones de La Ceja", "Toros de Itagüí", "Pumas de Caldas"),
                        2, 2, 14, 7, 2, List.of("Coliseo Iván de Bedout"), 18),
                new Spec("copa-universitaria-voleibol", "Copa Universitaria de Voleibol", Sport.VOLEIBOL,
                        TournamentFormat.KNOCKOUT, "Ciudad Universitaria, Medellín",
                        "Eliminación directa a cinco sets entre selecciones universitarias.",
                        List.of("U. de Antioquia", "U. Nacional", "EAFIT", "U. Pontificia Bolivariana",
                                "U. de Medellín", "Tecnológico de Antioquia", "U. CES", "Politécnico JIC"),
                        0, 0, 7, 7, 1, List.of("Coliseo Universitario"), 16),
                new Spec("abierto-tenis-poblado", "Abierto de Tenis El Poblado", Sport.TENIS, TournamentFormat.KNOCKOUT,
                        "Club El Poblado", "Doce jugadores; los cuatro mejores sembrados pasan directo a octavos.",
                        List.of("Santiago Restrepo", "Mariana Ochoa", "Julián Zapata", "Valentina Arango",
                                "Andrés Cardona", "Daniela Mejía", "Camilo Gaviria", "Laura Henao",
                                "Sebastián Uribe", "Isabella Correa", "Tomás Villegas", "Sara Montoya"),
                        0, 0, 8, 4, 2, List.of("Cancha central", "Cancha 2"), 9),
                new Spec("liga-futbol-sala-empresarial", "Liga de Fútbol Sala Empresarial", Sport.FUTBOL_SALA,
                        TournamentFormat.LEAGUE, "Envigado", "Torneo entre empresas de la ciudad. Ya terminó: mira al campeón.",
                        List.of("Grupo Ciber", "Logística Andina", "Café Origen", "Textiles del Valle",
                                "Clínica Las Vegas", "Constructora Altos"),
                        0, 0, 40, 7, 5, List.of("Coliseo de Envigado"), 19),
                new Spec("relampago-padel", "Torneo Relámpago de Pádel", Sport.PADEL, TournamentFormat.KNOCKOUT,
                        "Pádel Club Llanogrande", "Cuatro parejas, semifinales y final en un solo fin de semana.",
                        List.of("Gómez / Restrepo", "Ochoa / Vélez", "Arango / Duque", "Mejía / Salazar"),
                        0, 0, 0, 1, 0, List.of("Pista 1", "Pista 2"), 10),
                new Spec("liga-balonmano-valle-aburra", "Liga de Balonmano del Valle de Aburrá", Sport.BALONMANO,
                        TournamentFormat.LEAGUE, "Itagüí", "Cinco clubes; cada jornada uno descansa.",
                        List.of("Balonmano Itagüí", "Club Sabaneta", "Atlético Copacabana", "Deportivo La Estrella",
                                "Girardota BM"),
                        0, 0, 21, 7, 3, List.of("Coliseo Ditaires"), 17));
    }

    private static final String[] FIRST = {"Juan", "Carlos", "Andrés", "Felipe", "Santiago", "Mateo", "Samuel",
            "David", "Alejandro", "Sebastián", "Daniel", "Nicolás", "Jhon", "Brayan", "Esteban", "Kevin",
            "Miguel", "Jerónimo", "Emmanuel", "Cristian", "Duván", "Yeison", "Luis", "Jorge"};
    private static final String[] LAST = {"Gómez", "Restrepo", "Zapata", "Cardona", "Mejía", "Arango", "Henao",
            "Ochoa", "Montoya", "Vélez", "Correa", "Uribe", "Gaviria", "Salazar", "Duque", "Rendón", "Valencia",
            "Ríos", "Osorio", "Muñoz", "Álvarez", "Londoño", "Echeverri", "Quintero"};

    /** Plantilla con nombres y dorsales. Tenis: un jugador; pádel: la pareja del nombre. */
    public static List<String[]> roster(Sport sport, String teamName, Random random) {
        List<String[]> players = new ArrayList<>();
        if (sport == Sport.TENIS) {
            players.add(new String[]{teamName, null});
            return players;
        }
        if (sport == Sport.PADEL) {
            for (String last : teamName.split(" / ")) {
                players.add(new String[]{FIRST[random.nextInt(FIRST.length)] + " " + last.trim(), null});
            }
            return players;
        }
        int size = switch (sport) {
            case FUTBOL -> 14;
            case FUTBOL_SALA -> 9;
            case BALONMANO -> 12;
            case BALONCESTO -> 10;
            default -> 12;
        };
        List<Integer> used = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            int number;
            do {
                number = i == 0 ? 1 : 2 + random.nextInt(sport == Sport.BALONCESTO ? 33 : 28);
            } while (used.contains(number));
            used.add(number);
            String name = FIRST[random.nextInt(FIRST.length)] + " " + LAST[random.nextInt(LAST.length)];
            players.add(new String[]{name, String.valueOf(number)});
        }
        return players;
    }
}
