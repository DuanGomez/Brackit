package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.engine.BracketGenerator;
import com.duangomez.torneos.engine.StandingsCalculator;
import com.duangomez.torneos.engine.StandingsCalculator.Result;
import com.duangomez.torneos.engine.StandingsCalculator.Row;
import com.duangomez.torneos.engine.StandingsCalculator.TeamRef;
import com.duangomez.torneos.repo.MatchEventRepository;
import com.duangomez.torneos.sport.EventType;
import com.duangomez.torneos.sport.ScoringType;
import com.duangomez.torneos.sport.Sport;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/** Convierte entidades en las vistas de la API y calcula tablas y goleadores. */
@Component
public class TournamentViews {

    private static final List<EventType> SCORER_TYPES = List.of(
            EventType.GOAL, EventType.POINT_1, EventType.POINT_2, EventType.POINT_3);

    private final MatchEventRepository events;

    public TournamentViews(MatchEventRepository events) {
        this.events = events;
    }

    public static SportDto sport(Sport s) {
        return new SportDto(s.name(), s.label(), s.scoring().name(), s.periods(), s.periodMinutes(),
                s.setsToWin(), s.setTarget(), s.lastSetTarget(), s.allowsDraw(),
                s.winPoints(), s.drawPoints(), s.lossPoints(),
                s.scorersTitle(), s.scoreUnit(), s.participantLabel(),
                s.events().stream().map(e -> new EventTypeDto(e.name(), e.label(), e.scoreValue())).toList());
    }

    public static TeamDto team(Team t) {
        return new TeamDto(t.getId(), t.getName(), t.getShortName(), t.getColor(), t.getGroupLabel(), t.getSeed(),
                t.getPlayers().stream().map(p -> new PlayerDto(p.getId(), p.getName(), p.getShirtNumber())).toList());
    }

    public static int knockoutRounds(Tournament t) {
        return t.getMatches().stream()
                .filter(m -> m.getStage() == Stage.KNOCKOUT)
                .mapToInt(Match::getRoundNumber).max().orElse(0);
    }

    public static MatchDto match(Match m, int knockoutRounds) {
        Sport sport = m.getTournament().getSport();
        String roundLabel = m.getStage() == Stage.KNOCKOUT
                ? BracketGenerator.roundLabel(m.getRoundNumber(), knockoutRounds)
                : "Jornada " + m.getRoundNumber();
        return new MatchDto(m.getId(), m.getStage().name(), m.getRoundNumber(), roundLabel, m.getGroupLabel(),
                m.getBracketPosition(), m.homeId(), m.awayId(), m.getScheduledAt(), m.getVenue(),
                m.getStatus().name(), m.getPeriod(), sport.periodLabel(m.getPeriod()), m.getPeriodStartedAt(),
                m.getClockSpeed(), m.getHomeScore(), m.getAwayScore(), m.getHomePenalties(), m.getAwayPenalties(),
                m.getSets().stream().map(s -> new SetDto(s.getHome(), s.getAway(), s.isFinished())).toList(),
                m.getWinnerTeamId(), m.isBye());
    }

    public static EventDto event(MatchEvent e) {
        Player p = e.getPlayer();
        return new EventDto(e.getId(), e.getType().name(), e.getType().label(), e.getTeam().getId(),
                p == null ? null : p.getId(), p == null ? null : p.getName(),
                e.getPeriod(), e.getMinute(), e.getSetIndex(), e.getCreatedAt());
    }

    /** Tabla general (liga) o una por grupo. En eliminación directa no hay tabla. */
    public List<StandingsGroupDto> standings(Tournament t) {
        if (t.getFormat() == TournamentFormat.KNOCKOUT) return List.of();
        Stage stage = t.getFormat() == TournamentFormat.LEAGUE ? Stage.LEAGUE : Stage.GROUP;

        Set<Long> live = new HashSet<>();
        t.getMatches().stream()
                .filter(m -> m.getStatus() == MatchStatus.LIVE && m.getStage() == stage)
                .forEach(m -> {
                    live.add(m.homeId());
                    live.add(m.awayId());
                });

        if (stage == Stage.LEAGUE) {
            return List.of(new StandingsGroupDto(null, table(t, t.getTeams(), stage, null, live)));
        }
        Map<String, List<Team>> byGroup = new TreeMap<>();
        for (Team team : t.getTeams()) {
            if (team.getGroupLabel() != null) byGroup.computeIfAbsent(team.getGroupLabel(), g -> new ArrayList<>()).add(team);
        }
        List<StandingsGroupDto> groups = new ArrayList<>();
        byGroup.forEach((label, teams) -> groups.add(new StandingsGroupDto(label, table(t, teams, stage, label, live))));
        return groups;
    }

    /** Filas ordenadas (sin DTO) para decidir campeón o clasificados. */
    public static List<Row> rows(Tournament t, List<Team> teams, Stage stage, String group) {
        List<TeamRef> refs = teams.stream().map(team -> new TeamRef(team.getId(), team.getName())).toList();
        List<Result> results = t.getMatches().stream()
                .filter(m -> m.getStage() == stage && m.getStatus() == MatchStatus.FINISHED && !m.isBye()
                        && m.hasBothTeams() && Objects.equals(m.getGroupLabel(), group))
                .sorted(Comparator.comparing(Match::getFinishedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(TournamentViews::result)
                .toList();
        return StandingsCalculator.compute(t.getSport(), refs, results);
    }

    private static Result result(Match m) {
        int homeSetPoints = m.getSets().stream().mapToInt(MatchSet::getHome).sum();
        int awaySetPoints = m.getSets().stream().mapToInt(MatchSet::getAway).sum();
        return new Result(m.homeId(), m.awayId(), m.getHomeScore(), m.getAwayScore(), homeSetPoints, awaySetPoints);
    }

    private static List<StandingRowDto> table(Tournament t, List<Team> teams, Stage stage, String group, Set<Long> live) {
        return rows(t, teams, stage, group).stream()
                .map(r -> new StandingRowDto(r.teamId(), r.played(), r.won(), r.drawn(), r.lost(), r.scoreFor(),
                        r.scoreAgainst(), r.diff(), r.setPointsFor(), r.setPointsAgainst(), r.points(), r.form(),
                        live.contains(r.teamId())))
                .toList();
    }

    /** Goleadores (cuenta goles) o anotadores (suma puntos). No aplica a deportes de sets. */
    public List<ScorerDto> scorers(Tournament t) {
        if (t.getSport().scoring() == ScoringType.SETS || t.getId() == null) return List.of();
        Map<Long, int[]> totals = new HashMap<>();
        Map<Long, MatchEvent> sample = new HashMap<>();
        for (MatchEvent e : events.findScoringEvents(t.getId(), SCORER_TYPES)) {
            Long playerId = e.getPlayer().getId();
            totals.computeIfAbsent(playerId, k -> new int[1])[0] += e.getType().scoreValue();
            sample.putIfAbsent(playerId, e);
        }
        return totals.entrySet().stream()
                .map(en -> {
                    MatchEvent e = sample.get(en.getKey());
                    return new ScorerDto(en.getKey(), e.getPlayer().getName(), e.getTeam().getId(), en.getValue()[0]);
                })
                .sorted(Comparator.comparingInt(ScorerDto::value).reversed().thenComparing(ScorerDto::player))
                .limit(20)
                .toList();
    }

    public TournamentDto full(Tournament t, boolean forOwner) {
        int rounds = knockoutRounds(t);
        return new TournamentDto(t.getId(), t.getSlug(), t.getName(), sport(t.getSport()), t.getFormat().name(),
                t.getStatus().name(), t.getDescription(), t.getLocation(), t.getStartDate(), t.getOwner().getName(),
                t.isDoubleRound(), t.getGroupsCount(), t.getAdvancePerGroup(), t.getChampionTeamId(), t.isDemo(),
                forOwner ? t.getRefereePinHash() != null : null,
                t.getTeams().stream().map(TournamentViews::team).toList(),
                t.getMatches().stream().map(m -> match(m, rounds)).toList(),
                standings(t), scorers(t), Instant.now());
    }

    public static TournamentCardDto card(Tournament t) {
        List<Match> real = t.getMatches().stream().filter(m -> !m.isBye()).toList();
        int played = (int) real.stream().filter(m -> m.getStatus() == MatchStatus.FINISHED).count();
        int live = (int) real.stream().filter(m -> m.getStatus() == MatchStatus.LIVE).count();
        String champion = t.getTeams().stream()
                .filter(team -> team.getId().equals(t.getChampionTeamId()))
                .map(Team::getName).findFirst().orElse(null);
        return new TournamentCardDto(t.getId(), t.getSlug(), t.getName(), t.getSport().name(), t.getFormat().name(),
                t.getStatus().name(), t.getLocation(), t.getStartDate(), t.getOwner().getName(), t.getTeams().size(),
                played, real.size(), live, t.getChampionTeamId(), champion, t.isDemo());
    }

    public static MatchDetailDto detail(Match m) {
        Tournament t = m.getTournament();
        return new MatchDetailDto(match(m, knockoutRounds(t)),
                new TournamentSummaryDto(t.getId(), t.getSlug(), t.getName(), t.getSport().name(), t.getStatus().name()),
                sport(t.getSport()),
                m.getHome() == null ? null : team(m.getHome()),
                m.getAway() == null ? null : team(m.getAway()),
                m.getEvents().stream().map(TournamentViews::event).toList(),
                Instant.now());
    }

    public LiveUpdate liveUpdate(Tournament t, Match m) {
        return new LiveUpdate("match", match(m, knockoutRounds(t)), standings(t), scorers(t),
                t.getStatus().name(), t.getChampionTeamId(), Instant.now());
    }

    public static LiveUpdate refresh(Tournament t) {
        return new LiveUpdate("refresh", null, null, null, t.getStatus().name(), t.getChampionTeamId(), Instant.now());
    }
}
