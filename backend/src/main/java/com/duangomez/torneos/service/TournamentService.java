package com.duangomez.torneos.service;

import com.duangomez.torneos.demo.DemoData;
import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.engine.BracketGenerator;
import com.duangomez.torneos.engine.FixtureGenerator;
import com.duangomez.torneos.repo.*;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.sport.Sport;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.*;

@Service
public class TournamentService {

    static final int MAX_TEAMS = 64;
    private static final String[] PALETTE = {
            "#0A84FF", "#FF453A", "#30D158", "#FF9F0A", "#BF5AF2", "#64D2FF", "#FFD60A", "#FF375F",
            "#5E5CE6", "#32ADE6", "#AC8E68", "#66D4CF", "#E5484D", "#2E8B57", "#8E8E93", "#1C1C1E"};
    private static final SecureRandom RANDOM = new SecureRandom();

    private final TournamentRepository tournaments;
    private final TeamRepository teams;
    private final PlayerRepository players;
    private final MatchRepository matches;
    private final UserRepository users;
    private final TournamentViews views;
    private final LiveBroadcaster broadcaster;
    private final PasswordEncoder encoder;

    public TournamentService(TournamentRepository tournaments, TeamRepository teams, PlayerRepository players,
                             MatchRepository matches, UserRepository users, TournamentViews views,
                             LiveBroadcaster broadcaster, PasswordEncoder encoder) {
        this.tournaments = tournaments;
        this.teams = teams;
        this.players = players;
        this.matches = matches;
        this.users = users;
        this.views = views;
        this.broadcaster = broadcaster;
        this.encoder = encoder;
    }

    // ---------- Lectura ----------

    @Transactional(readOnly = true)
    public List<TournamentCardDto> listPublic(Sport sport, String query) {
        String q = query == null ? "" : normalize(query);
        return tournaments.findByStatusInOrderByUpdatedAtDesc(List.of(TournamentStatus.IN_PROGRESS, TournamentStatus.FINISHED))
                .stream()
                .filter(t -> sport == null || t.getSport() == sport)
                .filter(t -> q.isEmpty() || normalize(t.getName()).contains(q)
                        || (t.getLocation() != null && normalize(t.getLocation()).contains(q)))
                .map(TournamentViews::card)
                .sorted(Comparator.comparing((TournamentCardDto c) -> c.liveCount() == 0)
                        .thenComparing(c -> !"IN_PROGRESS".equals(c.status())))
                .toList();
    }

    @Transactional(readOnly = true)
    public TournamentDto getPublic(String slug) {
        Tournament t = bySlug(slug);
        if (t.getStatus() == TournamentStatus.DRAFT) throw ApiException.notFound("Este torneo aún no está publicado");
        return views.full(t, false);
    }

    @Transactional(readOnly = true)
    public MatchDetailDto getMatch(Long matchId) {
        Match m = matches.findById(matchId).orElseThrow(() -> ApiException.notFound("Partido no encontrado"));
        if (m.getTournament().getStatus() == TournamentStatus.DRAFT) throw ApiException.notFound("Partido no encontrado");
        return TournamentViews.detail(m);
    }

    @Transactional(readOnly = true)
    public List<TournamentCardDto> listMine(AuthPrincipal principal) {
        return tournaments.findByOwnerIdOrderByCreatedAtDesc(principal.userId()).stream().map(TournamentViews::card).toList();
    }

    @Transactional(readOnly = true)
    public TournamentDto getForOwner(Long id, AuthPrincipal principal) {
        Tournament t = byId(id);
        Access.requireOwner(t, principal);
        return views.full(t, true);
    }

    // ---------- Torneo ----------

    @Transactional
    public TournamentDto create(CreateTournamentRequest req, AuthPrincipal principal) {
        AppUser owner = users.findById(principal.userId()).orElseThrow(() -> ApiException.forbidden("Cuenta no encontrada"));
        validateFormat(req.format(), req.groupsCount(), req.advancePerGroup());

        Tournament t = new Tournament();
        t.setOwner(owner);
        t.setName(req.name().trim());
        t.setSlug(uniqueSlug(req.name()));
        t.setSport(req.sport());
        t.setFormat(req.format());
        t.setDescription(blankToNull(req.description()));
        t.setLocation(blankToNull(req.location()));
        t.setStartDate(req.startDate());
        t.setDoubleRound(req.format() == TournamentFormat.LEAGUE && req.doubleRound());
        t.setGroupsCount(req.format() == TournamentFormat.GROUPS_KNOCKOUT ? req.groupsCount() : 0);
        t.setAdvancePerGroup(req.format() == TournamentFormat.GROUPS_KNOCKOUT ? req.advancePerGroup() : 0);
        if (req.teams() != null) {
            for (TeamInput input : req.teams()) addTeamTo(t, input);
        }
        tournaments.save(t);
        return views.full(t, true);
    }

    @Transactional
    public TournamentDto update(Long id, UpdateTournamentRequest req, AuthPrincipal principal) {
        Tournament t = byId(id);
        Access.requireOwner(t, principal);
        t.setName(req.name().trim());
        t.setDescription(blankToNull(req.description()));
        t.setLocation(blankToNull(req.location()));
        t.setStartDate(req.startDate());
        broadcaster.tournamentChanged(t);
        return views.full(t, true);
    }

    @Transactional
    public void delete(Long id, AuthPrincipal principal) {
        Tournament t = byId(id);
        Access.requireOwner(t, principal);
        if (t.isDemo()) throw ApiException.forbidden("Los torneos de demostración no se pueden borrar (se reinician solos)");
        tournaments.delete(t);
    }

    // ---------- Equipos y jugadores ----------

    @Transactional
    public TeamDto addTeam(Long tournamentId, TeamInput input, AuthPrincipal principal) {
        Tournament t = byId(tournamentId);
        Access.requireOwner(t, principal);
        requireDraft(t, "Ya hay calendario: no se pueden agregar equipos");
        Team team = addTeamTo(t, input);
        teams.save(team);
        return TournamentViews.team(team);
    }

    @Transactional
    public TeamDto updateTeam(Long teamId, TeamInput input, AuthPrincipal principal) {
        Team team = teamById(teamId);
        Access.requireOwner(team.getTournament(), principal);
        team.setName(input.name().trim());
        team.setShortName(shortName(input.shortName(), input.name()));
        if (input.color() != null) team.setColor(input.color().toUpperCase());
        broadcaster.tournamentChanged(team.getTournament());
        return TournamentViews.team(team);
    }

    @Transactional
    public void deleteTeam(Long teamId, AuthPrincipal principal) {
        Team team = teamById(teamId);
        Tournament t = team.getTournament();
        Access.requireOwner(t, principal);
        requireDraft(t, "Ya hay calendario: no se pueden quitar equipos");
        t.getTeams().remove(team);
        int seed = 1;
        for (Team other : t.getTeams()) other.setSeed(seed++);
    }

    @Transactional
    public PlayerDto addPlayer(Long teamId, PlayerInput input, AuthPrincipal principal) {
        Team team = teamById(teamId);
        Access.requireOwner(team.getTournament(), principal);
        if (team.getPlayers().size() >= 40) throw ApiException.badRequest("Máximo 40 jugadores por equipo");
        Player p = new Player();
        p.setTeam(team);
        p.setName(input.name().trim());
        p.setShirtNumber(input.number());
        team.getPlayers().add(p);
        players.save(p);
        broadcaster.tournamentChanged(team.getTournament());
        return new PlayerDto(p.getId(), p.getName(), p.getShirtNumber());
    }

    @Transactional
    public void deletePlayer(Long playerId, AuthPrincipal principal) {
        Player p = players.findById(playerId).orElseThrow(() -> ApiException.notFound("Jugador no encontrado"));
        Access.requireOwner(p.getTeam().getTournament(), principal);
        p.getTeam().getPlayers().remove(p);
        broadcaster.tournamentChanged(p.getTeam().getTournament());
    }

    // ---------- Calendario ----------

    /** Genera todos los partidos según el formato y publica el torneo. */
    @Transactional
    public TournamentDto generateSchedule(Long id, ScheduleRequest req, AuthPrincipal principal) {
        Tournament t = byId(id);
        Access.requireOwner(t, principal);
        requireDraft(t, "El calendario ya fue generado");
        ScheduleBuilder.Plan plan = new ScheduleBuilder.Plan(req.startDate(), req.firstMatchTime(),
                req.daysBetweenRounds(), req.minutesBetweenMatches(), req.venues(), zone(req.timeZone()));
        buildSchedule(t, plan);
        if (t.getStartDate() == null) t.setStartDate(req.startDate());
        tournaments.saveAndFlush(t); // los partidos nuevos necesitan id antes de responder
        return views.full(t, true);
    }

    /** Crea los partidos (también lo usa la demo). */
    public void buildSchedule(Tournament t, ScheduleBuilder.Plan plan) {
        List<Team> roster = t.getTeams();
        validateTeamCount(t, roster.size());
        List<Match> created;
        switch (t.getFormat()) {
            case LEAGUE -> created = ScheduleBuilder.roundRobin(t, roster, Stage.LEAGUE, null, t.isDoubleRound());
            case KNOCKOUT -> {
                Map<Long, Team> byId = new HashMap<>();
                roster.forEach(team -> byId.put(team.getId(), team));
                created = ScheduleBuilder.knockout(t,
                        BracketGenerator.firstRound(roster.stream().map(Team::getId).toList()), byId);
            }
            default -> {
                List<List<Long>> groups = FixtureGenerator.snakeGroups(roster.stream().map(Team::getId).toList(), t.getGroupsCount());
                Map<Long, Team> byId = new HashMap<>();
                roster.forEach(team -> byId.put(team.getId(), team));
                created = new ArrayList<>();
                for (int g = 0; g < groups.size(); g++) {
                    String label = FixtureGenerator.groupLabel(g);
                    List<Team> groupTeams = groups.get(g).stream().map(byId::get).toList();
                    groupTeams.forEach(team -> team.setGroupLabel(label));
                    created.addAll(ScheduleBuilder.roundRobin(t, groupTeams, Stage.GROUP, label, false));
                }
            }
        }
        ScheduleBuilder.assignDates(created, plan, 0);
        t.getMatches().addAll(created);
        t.setStatus(TournamentStatus.IN_PROGRESS);
    }

    @Transactional
    public MatchDto scheduleMatch(Long matchId, MatchScheduleRequest req, AuthPrincipal principal) {
        Match m = matches.findById(matchId).orElseThrow(() -> ApiException.notFound("Partido no encontrado"));
        Access.requireOwner(m.getTournament(), principal);
        if (m.getStatus() != MatchStatus.SCHEDULED) throw ApiException.badRequest("Solo se reprograman partidos sin empezar");
        m.setScheduledAt(req.scheduledAt());
        m.setVenue(blankToNull(req.venue()));
        broadcaster.matchChanged(m, false);
        return TournamentViews.match(m, TournamentViews.knockoutRounds(m.getTournament()));
    }

    // ---------- Árbitros ----------

    /** Nuevo PIN de 6 dígitos. Se devuelve una sola vez; se guarda cifrado. */
    @Transactional
    public PinResponse regeneratePin(Long id, AuthPrincipal principal) {
        Tournament t = byId(id);
        Access.requireOwner(t, principal);
        // En la demo el PIN es público y fijo: regenerarlo dejaría sin acceso al resto de visitantes
        if (t.isDemo()) return new PinResponse(DemoData.REFEREE_PIN);
        String pin = String.format("%06d", RANDOM.nextInt(1_000_000));
        t.setRefereePinHash(encoder.encode(pin));
        return new PinResponse(pin);
    }

    // ---------- Apoyo ----------

    Tournament byId(Long id) {
        return tournaments.findById(id).orElseThrow(() -> ApiException.notFound("Torneo no encontrado"));
    }

    Tournament bySlug(String slug) {
        return tournaments.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Torneo no encontrado"));
    }

    private Team teamById(Long id) {
        return teams.findById(id).orElseThrow(() -> ApiException.notFound("Equipo no encontrado"));
    }

    public Team addTeamTo(Tournament t, TeamInput input) {
        if (t.getTeams().size() >= MAX_TEAMS) throw ApiException.badRequest("Máximo " + MAX_TEAMS + " equipos");
        String name = input.name().trim();
        boolean duplicated = t.getTeams().stream().anyMatch(other -> other.getName().equalsIgnoreCase(name));
        if (duplicated) throw ApiException.badRequest("Ya hay un equipo llamado " + name);
        Team team = new Team();
        team.setTournament(t);
        team.setName(name);
        team.setShortName(shortName(input.shortName(), name));
        team.setColor(input.color() != null ? input.color().toUpperCase() : PALETTE[t.getTeams().size() % PALETTE.length]);
        team.setSeed(t.getTeams().size() + 1);
        t.getTeams().add(team);
        return team;
    }

    private static void validateFormat(TournamentFormat format, int groups, int advance) {
        if (format != TournamentFormat.GROUPS_KNOCKOUT) return;
        if (groups != 2 && groups != 4 && groups != 8) throw ApiException.badRequest("Elige 2, 4 u 8 grupos");
        if (advance != 1 && advance != 2) throw ApiException.badRequest("Clasifican 1 o 2 por grupo");
        if (groups * advance < 2) throw ApiException.badRequest("La fase final necesita al menos 2 clasificados");
    }

    private static void validateTeamCount(Tournament t, int count) {
        if (count < 2) throw ApiException.badRequest("Inscribe al menos 2 equipos");
        if (t.getFormat() == TournamentFormat.LEAGUE && count > 30) throw ApiException.badRequest("Una liga admite hasta 30 equipos");
        if (t.getFormat() == TournamentFormat.GROUPS_KNOCKOUT) {
            int perGroup = count / t.getGroupsCount();
            if (perGroup < t.getAdvancePerGroup() + 1) {
                throw ApiException.badRequest("Con " + t.getGroupsCount() + " grupos necesitas al menos "
                        + t.getGroupsCount() * (t.getAdvancePerGroup() + 1) + " equipos");
            }
        }
    }

    private static void requireDraft(Tournament t, String message) {
        if (t.getStatus() != TournamentStatus.DRAFT) throw ApiException.badRequest(message);
    }

    private String uniqueSlug(String name) {
        String base = normalize(name).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.length() > 60) base = base.substring(0, 60).replaceAll("-$", "");
        if (base.isEmpty()) base = "torneo";
        String slug;
        do {
            slug = base + "-" + randomCode(4);
        } while (tournaments.existsBySlug(slug));
        return slug;
    }

    private static String randomCode(int length) {
        String alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return sb.toString();
    }

    static String normalize(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }

    private static String shortName(String requested, String name) {
        if (requested != null && !requested.isBlank()) return requested.trim().toUpperCase(Locale.ROOT);
        String[] words = normalize(name).toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9 ]", "").trim().split("\\s+");
        String result = words.length >= 2
                ? words.length >= 3 ? "" + words[0].charAt(0) + words[1].charAt(0) + words[2].charAt(0)
                : words[0].substring(0, Math.min(2, words[0].length())) + words[1].charAt(0)
                : words[0].substring(0, Math.min(3, words[0].length()));
        return result.isEmpty() ? "EQ" : result;
    }

    private static ZoneId zone(String id) {
        try {
            return id == null || id.isBlank() ? ZoneId.of("America/Bogota") : ZoneId.of(id);
        } catch (DateTimeException e) {
            return ZoneId.of("America/Bogota");
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
