package com.duangomez.torneos.demo;

import com.duangomez.torneos.domain.Enums.Plan;
import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.sport.Sport;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static com.duangomez.torneos.sport.Sport.*;

/** Organizaciones, sedes y torneos de demostración (todos ficticios). */
public final class DemoData {

    public static final String PASSWORD = "demo1234";
    public static final String ADMIN_EMAIL = "demo@brackit.app";
    public static final String COORDINATOR_EMAIL = "coordinadora@brackit.app";
    public static final String REFEREE_EMAIL = "arbitro@brackit.app";

    public record CourtSpec(String name, String surface, List<Sport> sports, int fromHour, int toHour) {
    }

    public record VenueSpec(String name, String address, List<CourtSpec> courts) {
    }

    /**
     * Un torneo demo. La primera jornada fue hace {@code daysAgo} días; con {@code daysBetween}
     * múltiplo de esa cifra, una jornada cae hoy y se juega en vivo.
     */
    public record TournamentSpec(String slug, String name, String category, Sport sport, TournamentFormat format,
                                 String description, List<String> teams, int groups, int advance, boolean thirdPlace,
                                 int daysAgo, int daysBetween, int minRestHours, List<String> courts) {
    }

    public record OrgSpec(String slug, String name, String shortName, String color, String city, String description,
                          Plan plan, boolean referee, List<VenueSpec> venues, List<TournamentSpec> tournaments) {
    }

    private DemoData() {
    }

    public static List<OrgSpec> organizations() {
        return List.of(
                new OrgSpec("liga-barrial", "Liga Barrial Medellín", "LB", "#18C46A", "Medellín",
                        "Fútbol de barrio con calendario, tabla y goleadores en vivo.", Plan.LIGA, true,
                        List.of(
                                new VenueSpec("Unidad Deportiva Belén", "Cra. 76 #18A-10, Medellín", List.of(
                                        new CourtSpec("Cancha 1", "Fútbol 11 · grama", List.of(FUTBOL), 14, 22),
                                        new CourtSpec("Cancha 2", "Fútbol 11 · sintética", List.of(FUTBOL), 14, 22),
                                        new CourtSpec("Cancha 3", "Fútbol 7", List.of(FUTBOL, FUTBOL_SALA), 14, 22))),
                                new VenueSpec("Coliseo de Envigado", "Cl. 38 Sur #40-50, Envigado", List.of(
                                        new CourtSpec("Cancha múltiple", "Coliseo cubierto", List.of(FUTBOL_SALA, BALONMANO), 15, 22)))),
                        List.of(
                                new TournamentSpec("liga-2026", "Liga Barrial 2026", "Mayores", FUTBOL, TournamentFormat.LEAGUE,
                                        "Ocho equipos de barrio, todos contra todos. El primero de la tabla es el campeón.",
                                        List.of("Atlético Robledo", "Deportivo Belén", "Club Laureles", "Independiente Castilla",
                                                "Juventud Bello", "Estrella de Manrique", "Unión Itagüí", "Real Envigado Sur"),
                                        0, 0, false, 35, 7, 48, List.of("Cancha 1", "Cancha 2")),
                                new TournamentSpec("relampago-futbol-sala", "Copa Relámpago de Fútbol Sala", "Empresarial",
                                        FUTBOL_SALA, TournamentFormat.LEAGUE, "Torneo entre empresas de la ciudad. Ya terminó: mira al campeón.",
                                        List.of("Grupo Ciber", "Logística Andina", "Café Origen", "Textiles del Valle",
                                                "Clínica Las Vegas", "Constructora Altos"),
                                        0, 0, false, 40, 7, 0, List.of("Cancha múltiple")),
                                new TournamentSpec("liga-balonmano", "Liga de Balonmano", "Abierta", BALONMANO, TournamentFormat.LEAGUE,
                                        "Cinco clubes; cada jornada uno descansa.",
                                        List.of("Balonmano Itagüí", "Club Sabaneta", "Atlético Copacabana", "Deportivo La Estrella", "Girardota BM"),
                                        0, 0, false, 21, 7, 0, List.of("Cancha múltiple")))),
                new OrgSpec("deportes-aburra", "Asociación Deportiva del Aburrá", "AD", "#1F5BFF", "Itagüí",
                        "Baloncesto y voleibol de la región, con fases y llaves en vivo.", Plan.CLUB, true,
                        List.of(
                                new VenueSpec("Coliseo Iván de Bedout", "Unidad Atanasio Girardot, Medellín", List.of(
                                        new CourtSpec("Cancha principal", "Madera", List.of(BALONCESTO, VOLEIBOL), 15, 22))),
                                new VenueSpec("Coliseo Universitario", "Ciudad Universitaria, Medellín", List.of(
                                        new CourtSpec("Cancha central", "Sintética", List.of(VOLEIBOL, BALONCESTO), 14, 21)))),
                        List.of(
                                new TournamentSpec("copa-antioquia", "Copa Antioquia de Baloncesto", "Mayores", BALONCESTO,
                                        TournamentFormat.GROUPS_KNOCKOUT, "Dos grupos de cuatro; los dos primeros juegan semifinales cruzadas.",
                                        List.of("Titanes de Envigado", "Halcones de Rionegro", "Búhos de Sabaneta", "Cóndores del Norte",
                                                "Piratas de Bello", "Leones de La Ceja", "Toros de Itagüí", "Pumas de Caldas"),
                                        2, 2, true, 14, 7, 24, List.of("Cancha principal")),
                                new TournamentSpec("copa-universitaria-voleibol", "Copa Universitaria de Voleibol", "Universitario",
                                        VOLEIBOL, TournamentFormat.KNOCKOUT, "Eliminación directa a cinco sets entre selecciones universitarias.",
                                        List.of("U. de Antioquia", "U. Nacional", "EAFIT", "U. Pontificia Bolivariana",
                                                "U. de Medellín", "Tecnológico de Antioquia", "U. CES", "Politécnico JIC"),
                                        0, 0, true, 7, 7, 0, List.of("Cancha central")))),
                new OrgSpec("club-raqueta", "Club Raqueta Poblado", "CR", "#FF7A1A", "Medellín",
                        "Torneos internos de tenis y pádel.", Plan.LIGA, false,
                        List.of(new VenueSpec("Sede El Poblado", "Cl. 10 #43-20, Medellín", List.of(
                                new CourtSpec("Cancha central", "Polvo de ladrillo", List.of(TENIS), 7, 21),
                                new CourtSpec("Cancha 2", "Dura", List.of(TENIS), 7, 21),
                                new CourtSpec("Pista 1", "Pádel · cristal", List.of(PADEL), 7, 22),
                                new CourtSpec("Pista 2", "Pádel · cristal", List.of(PADEL), 7, 22)))),
                        List.of(
                                new TournamentSpec("abierto-tenis", "Abierto de Tenis", "Libre", TENIS, TournamentFormat.KNOCKOUT,
                                        "Doce jugadores; los cuatro mejores sembrados pasan directo a octavos.",
                                        List.of("Santiago Restrepo", "Mariana Ochoa", "Julián Zapata", "Valentina Arango",
                                                "Andrés Cardona", "Daniela Mejía", "Camilo Gaviria", "Laura Henao",
                                                "Sebastián Uribe", "Isabella Correa", "Tomás Villegas", "Sara Montoya"),
                                        0, 0, false, 8, 4, 0, List.of("Cancha central", "Cancha 2")),
                                new TournamentSpec("relampago-padel", "Torneo Relámpago de Pádel", "Mixto", PADEL, TournamentFormat.KNOCKOUT,
                                        "Cuatro parejas, semifinales y final en un solo fin de semana.",
                                        List.of("Gómez / Restrepo", "Ochoa / Vélez", "Arango / Duque", "Mejía / Salazar"),
                                        0, 0, false, 0, 1, 0, List.of("Pista 1", "Pista 2")))));
    }

    private static final String[] FIRST = {"Juan", "Carlos", "Andrés", "Felipe", "Santiago", "Mateo", "Samuel",
            "David", "Alejandro", "Sebastián", "Daniel", "Nicolás", "Jhon", "Brayan", "Esteban", "Kevin",
            "Miguel", "Jerónimo", "Emmanuel", "Cristian", "Duván", "Yeison", "Luis", "Jorge"};
    private static final String[] LAST = {"Gómez", "Restrepo", "Zapata", "Cardona", "Mejía", "Arango", "Henao",
            "Ochoa", "Montoya", "Vélez", "Correa", "Uribe", "Gaviria", "Salazar", "Duque", "Rendón", "Valencia",
            "Ríos", "Osorio", "Muñoz", "Álvarez", "Londoño", "Echeverri", "Quintero"};

    /** Plantilla: nombre, dorsal y documento. Tenis: un jugador; pádel: la pareja del nombre. */
    public static List<String[]> roster(Sport sport, String teamName, Random random) {
        List<String[]> players = new ArrayList<>();
        if (sport == TENIS) {
            players.add(new String[]{teamName, null, document(random)});
            return players;
        }
        if (sport == PADEL) {
            for (String last : teamName.split(" / ")) {
                players.add(new String[]{FIRST[random.nextInt(FIRST.length)] + " " + last.trim(), null, document(random)});
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
                number = i == 0 ? 1 : 2 + random.nextInt(sport == BALONCESTO ? 33 : 28);
            } while (used.contains(number));
            used.add(number);
            String name = FIRST[random.nextInt(FIRST.length)] + " " + LAST[random.nextInt(LAST.length)];
            players.add(new String[]{name, String.valueOf(number), document(random)});
        }
        return players;
    }

    private static String document(Random random) {
        return String.valueOf(1_000_000_000L + (long) (random.nextDouble() * 99_000_000));
    }
}
