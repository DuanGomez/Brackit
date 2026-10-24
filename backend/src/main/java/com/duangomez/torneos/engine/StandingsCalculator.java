package com.duangomez.torneos.engine;

import com.duangomez.torneos.sport.ScoringType;
import com.duangomez.torneos.sport.Sport;

import java.util.*;
import java.util.function.Function;

/**
 * Tabla de posiciones con los criterios de desempate de cada deporte:
 * <ul>
 *   <li>Goles: puntos, diferencia de gol, goles a favor, enfrentamiento directo.</li>
 *   <li>Baloncesto: puntos, enfrentamiento directo, diferencia de puntos, puntos a favor.</li>
 *   <li>Sets: puntos, victorias, cociente de sets, cociente de puntos, enfrentamiento directo.</li>
 * </ul>
 * El enfrentamiento directo se calcula solo entre los equipos que siguen empatados (mini tabla).
 */
public final class StandingsCalculator {

    /** Resultado de un partido terminado. En deportes de sets, score = sets y setPoints = puntos/juegos. */
    public record Result(long homeId, long awayId, int homeScore, int awayScore, int homeSetPoints, int awaySetPoints) {
        public static Result of(long homeId, long awayId, int homeScore, int awayScore) {
            return new Result(homeId, awayId, homeScore, awayScore, 0, 0);
        }
    }

    public record TeamRef(long id, String name) {
    }

    public record Row(long teamId, String name, int played, int won, int drawn, int lost,
                      int scoreFor, int scoreAgainst, int setPointsFor, int setPointsAgainst,
                      int points, List<String> form) {
        public int diff() {
            return scoreFor - scoreAgainst;
        }
    }

    enum Criterion { POINTS, WINS, DIFF, FOR, SET_RATIO, POINT_RATIO, HEAD_TO_HEAD, NAME }

    private StandingsCalculator() {
    }

    static List<Criterion> criteriaFor(Sport sport) {
        return switch (sport.scoring()) {
            case GOALS -> List.of(Criterion.POINTS, Criterion.DIFF, Criterion.FOR, Criterion.HEAD_TO_HEAD, Criterion.NAME);
            case POINTS -> List.of(Criterion.POINTS, Criterion.HEAD_TO_HEAD, Criterion.DIFF, Criterion.FOR, Criterion.NAME);
            case SETS -> List.of(Criterion.POINTS, Criterion.WINS, Criterion.SET_RATIO, Criterion.POINT_RATIO,
                    Criterion.HEAD_TO_HEAD, Criterion.NAME);
        };
    }

    /** Calcula la tabla. Los resultados deben venir en orden cronológico (para la racha). */
    public static List<Row> compute(Sport sport, List<TeamRef> teams, List<Result> results) {
        Map<Long, Acc> acc = new LinkedHashMap<>();
        for (TeamRef t : teams) acc.put(t.id(), new Acc(t));

        for (Result r : results) {
            Acc home = acc.get(r.homeId());
            Acc away = acc.get(r.awayId());
            if (home == null || away == null) continue;
            home.add(sport, r.homeScore(), r.awayScore(), r.homeSetPoints(), r.awaySetPoints());
            away.add(sport, r.awayScore(), r.homeScore(), r.awaySetPoints(), r.homeSetPoints());
        }

        List<Row> rows = new ArrayList<>(acc.values().stream().map(Acc::toRow).toList());
        return rank(sport, rows, criteriaFor(sport), 0, results);
    }

    private static List<Row> rank(Sport sport, List<Row> rows, List<Criterion> criteria, int index, List<Result> results) {
        if (rows.size() <= 1 || index >= criteria.size()) return rows;
        Criterion criterion = criteria.get(index);

        if (criterion == Criterion.NAME) {
            List<Row> sorted = new ArrayList<>(rows);
            sorted.sort(Comparator.comparing(Row::name, String.CASE_INSENSITIVE_ORDER));
            return sorted;
        }

        Function<Row, double[]> key = criterion == Criterion.HEAD_TO_HEAD
                ? headToHeadKey(sport, rows, results)
                : row -> new double[]{simpleKey(criterion, row)};

        Map<Long, double[]> keys = new HashMap<>();
        for (Row row : rows) keys.put(row.teamId(), key.apply(row));

        List<Row> sorted = new ArrayList<>(rows);
        sorted.sort((a, b) -> compareDesc(keys.get(a.teamId()), keys.get(b.teamId())));

        // Los que siguen empatados se desempatan con el siguiente criterio
        List<Row> out = new ArrayList<>();
        int i = 0;
        while (i < sorted.size()) {
            int j = i + 1;
            while (j < sorted.size()
                    && compareDesc(keys.get(sorted.get(i).teamId()), keys.get(sorted.get(j).teamId())) == 0) j++;
            out.addAll(rank(sport, sorted.subList(i, j), criteria, index + 1, results));
            i = j;
        }
        return out;
    }

    private static double simpleKey(Criterion criterion, Row row) {
        return switch (criterion) {
            case POINTS -> row.points();
            case WINS -> row.won();
            case DIFF -> row.diff();
            case FOR -> row.scoreFor();
            case SET_RATIO -> ratio(row.scoreFor(), row.scoreAgainst());
            case POINT_RATIO -> ratio(row.setPointsFor(), row.setPointsAgainst());
            default -> 0;
        };
    }

    /** Cociente a favor / en contra; sin nada en contra cuenta como "infinito" pero sigue ordenando por a favor. */
    private static double ratio(int scored, int conceded) {
        if (conceded == 0) return scored == 0 ? 0 : 1_000_000 + scored;
        return (double) scored / conceded;
    }

    /** Mini tabla entre los equipos empatados: puntos y luego diferencia en esos partidos. */
    private static Function<Row, double[]> headToHeadKey(Sport sport, List<Row> tied, List<Result> results) {
        Set<Long> ids = new HashSet<>();
        for (Row r : tied) ids.add(r.teamId());
        Map<Long, int[]> mini = new HashMap<>();
        for (Long id : ids) mini.put(id, new int[2]);
        for (Result r : results) {
            if (!ids.contains(r.homeId()) || !ids.contains(r.awayId())) continue;
            int[] home = mini.get(r.homeId());
            int[] away = mini.get(r.awayId());
            home[0] += sport.tablePoints(r.homeScore(), r.awayScore());
            away[0] += sport.tablePoints(r.awayScore(), r.homeScore());
            home[1] += r.homeScore() - r.awayScore();
            away[1] += r.awayScore() - r.homeScore();
        }
        return row -> {
            int[] m = mini.get(row.teamId());
            return new double[]{m[0], m[1]};
        };
    }

    private static int compareDesc(double[] a, double[] b) {
        for (int i = 0; i < a.length; i++) {
            int c = Double.compare(b[i], a[i]);
            if (c != 0) return c;
        }
        return 0;
    }

    private static final class Acc {
        final TeamRef team;
        int played, won, drawn, lost, scoreFor, scoreAgainst, setFor, setAgainst, points;
        final Deque<String> form = new ArrayDeque<>();

        Acc(TeamRef team) {
            this.team = team;
        }

        void add(Sport sport, int own, int rival, int ownSetPoints, int rivalSetPoints) {
            played++;
            scoreFor += own;
            scoreAgainst += rival;
            if (sport.scoring() == ScoringType.SETS) {
                setFor += ownSetPoints;
                setAgainst += rivalSetPoints;
            }
            points += sport.tablePoints(own, rival);
            String letter;
            if (own > rival) {
                won++;
                letter = "G";
            } else if (own < rival) {
                lost++;
                letter = "P";
            } else {
                drawn++;
                letter = "E";
            }
            form.addLast(letter);
            if (form.size() > 5) form.removeFirst();
        }

        Row toRow() {
            return new Row(team.id(), team.name(), played, won, drawn, lost, scoreFor, scoreAgainst,
                    setFor, setAgainst, points, List.copyOf(form));
        }
    }
}
