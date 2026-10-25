package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.engine.BracketGenerator;
import com.duangomez.torneos.engine.FixtureGenerator;
import com.duangomez.torneos.repo.*;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.*;

/** Torneos de una organización: datos, equipos, jugadores y calendario. */
@Service
public class TournamentService {

    static final int MAX_TEAMS = 64;
    private static final String[] PALETTE = {
            "#1F5BFF", "#FF3B30", "#18C46A", "#FF9F0A", "#AF52DE", "#32ADE6", "#FFCC00", "#FF2D55",
            "#5856D6", "#00C7BE", "#A2845E", "#30B0C7", "#E5484D", "#2E8B57", "#8E8E93", "#1C1C1E"};
    private static final SecureRandom RANDOM = new SecureRandom();

    private final TournamentRepository tournaments;
    private final TeamRepository teams;
    private final PlayerRepository players;
    private final CourtRepository courts;
    private final TournamentViews views;
    private final LiveBroadcaster broadcaster;
    private final SchedulingService scheduling;
    private final OrgAccess access;

    public TournamentService(TournamentRepository tournaments, TeamRepository teams, PlayerRepository players,
                             CourtRepository courts, TournamentViews views, LiveBroadcaster broadcaster,
                             SchedulingService scheduling, OrgAccess access) {
        this.tournaments = tournaments;
        this.teams = teams;
        this.players = players;
        this.courts = courts;
        this.views = views;
        this.broadcaster = broadcaster;
        this.scheduling = scheduling;
        this.access = access;
    }

    // ---------- Lectura ----------

    @Transactional(readOnly = true)
    public List<TournamentCardDto> list(String org, AuthPrincipal principal) {
        Organization o = access.require(org, principal).getOrganization();
        return tournaments.findByOrganizationIdOrderByCreatedAtDesc(o.getId()).stream().map(TournamentViews::tournamentCard).toList();
    }

    @Transactional(readOnly = true)
    public TournamentDto get(String org, Long id, AuthPrincipal principal) {
        Organization o = access.require(org, principal).getOrganization();
        return views.full(byId(o, id));
    }

    // ---------- Torneo ----------

    @Transactional
    public TournamentDto create(String org, CreateTournamentRequest req, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        long active = tournaments.countByOrganizationIdAndStatusIn(o.getId(), OrgService.ACTIVE);
        if (active >= o.getPlan().maxActiveTournaments()) {
            throw ApiException.forbidden("Tu plan Gratis permite 1 torneo activo. Escríbenos para pasarte al plan Liga.");
        }
        validateFormat(req.format(), req.groupsCount(), req.advancePerGroup());

        Tournament t = new Tournament();
        t.setOrganization(o);
        t.setName(req.name().trim());
        t.setSlug(uniqueSlug(o, req.name()));
        t.setCategory(blankToNull(req.category()));
        t.setSport(req.sport());
        t.setFormat(req.format());
        t.setDescription(blankToNull(req.description()));
        t.setStartDate(req.startDate());
        t.setDoubleRound(req.format() == TournamentFormat.LEAGUE && req.doubleRound());
        t.setGroupsCount(req.format() == TournamentFormat.GROUPS_KNOCKOUT ? req.groupsCount() : 0);
        t.setAdvancePerGroup(req.format() == TournamentFormat.GROUPS_KNOCKOUT ? req.advancePerGroup() : 0);
        t.setThirdPlace(req.format() != TournamentFormat.LEAGUE && req.thirdPlace());
        t.setBlockMinutes(req.blockMinutes() >= 15 ? req.blockMinutes() : req.sport().defaultBlockMinutes());
        t.setMinRestHours(req.minRestHours());
        t.setDaysBetween(req.daysBetween() >= 1 ? req.daysBetween() : 7);
        setCourts(t, o, req.courtIds());
        if (req.teams() != null) {
            for (TeamInput input : req.teams()) addTeamTo(t, input);
        }
        tournaments.save(t);
        return views.full(t);
    }

    @Transactional
    public TournamentDto update(String org, Long id, UpdateTournamentRequest req, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        Tournament t = byId(o, id);
        t.setName(req.name().trim());
        t.setCategory(blankToNull(req.category()));
        t.setDescription(blankToNull(req.description()));
        t.setStartDate(req.startDate());
        t.setBlockMinutes(req.blockMinutes());
        t.setMinRestHours(req.minRestHours());
        t.setDaysBetween(req.daysBetween());
        if (req.courtIds() != null) setCourts(t, o, req.courtIds());
        broadcaster.tournamentChanged(t);
        return views.full(t);
    }

    @Transactional
    public void delete(String org, Long id, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        if (o.isDemo()) throw ApiException.forbidden("En la demo no se borran torneos (se reinician solos)");
        tournaments.delete(byId(o, id));
    }

    // ---------- Equipos y jugadores ----------

    @Transactional
    public TeamDto addTeam(String org, Long tournamentId, TeamInput input, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        Tournament t = byId(o, tournamentId);
        requireDraft(t, "Ya hay calendario: no se pueden agregar equipos");
        Team team = addTeamTo(t, input);
        teams.save(team);
        return TournamentViews.team(team);
    }

    @Transactional
    public TeamDto updateTeam(String org, Long teamId, TeamInput input, AuthPrincipal principal) {
        Team team = team(org, teamId, principal);
        team.setName(input.name().trim());
        team.setShortName(shortName(input.shortName(), input.name()));
        if (input.color() != null) team.setColor(input.color().toUpperCase(Locale.ROOT));
        broadcaster.tournamentChanged(team.getTournament());
        return TournamentViews.team(team);
    }

    @Transactional
    public void deleteTeam(String org, Long teamId, AuthPrincipal principal) {
        Team team = team(org, teamId, principal);
        Tournament t = team.getTournament();
        requireDraft(t, "Ya hay calendario: no se pueden quitar equipos");
        t.getTeams().remove(team);
        int seed = 1;
        for (Team other : t.getTeams()) other.setSeed(seed++);
    }

    @Transactional
    public PlayerDto addPlayer(String org, Long teamId, PlayerInput input, AuthPrincipal principal) {
        Team team = team(org, teamId, principal);
        if (team.getPlayers().size() >= 40) throw ApiException.badRequest("Máximo 40 jugadores por equipo");
        Player p = new Player();
        p.setTeam(team);
        p.setName(input.name().trim());
        p.setShirtNumber(input.number());
        p.setDocument(blankToNull(input.document()));
        team.getPlayers().add(p);
        players.save(p);
        broadcaster.tournamentChanged(team.getTournament());
        return new PlayerDto(p.getId(), p.getName(), p.getShirtNumber(), p.getDocument());
    }

    @Transactional
    public PlayerDto updatePlayer(String org, Long playerId, PlayerInput input, AuthPrincipal principal) {
        Player p = player(org, playerId, principal);
        p.setName(input.name().trim());
        p.setShirtNumber(input.number());
        p.setDocument(blankToNull(input.document()));
        return new PlayerDto(p.getId(), p.getName(), p.getShirtNumber(), p.getDocument());
    }

    @Transactional
    public void deletePlayer(String org, Long playerId, AuthPrincipal principal) {
        Player p = player(org, playerId, principal);
        p.getTeam().getPlayers().remove(p);
        broadcaster.tournamentChanged(p.getTeam().getTournament());
    }

    // ---------- Calendario ----------

    /** Crea todos los partidos según el formato y los programa en las canchas del torneo. */
    @Transactional
    public ScheduleResult generateSchedule(String org, Long id, ScheduleRequest req, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        Tournament t = byId(o, id);
        requireDraft(t, "El calendario ya fue generado");
        List<Match> created = buildSchedule(t);
        if (t.getStartDate() == null) t.setStartDate(req.startDate());
        // flush y no save: un save (merge) sobre una entidad gestionada reemplaza los partidos nuevos por copias
        tournaments.flush();
        int unplaced = scheduling.autoPlace(t, created, req.startDate());
        tournaments.flush();
        broadcaster.tournamentChanged(t);
        int real = (int) created.stream().filter(m -> !m.isBye()).count();
        return new ScheduleResult(real, real - unplaced, unplaced);
    }

    /** Vuelve a intentar programar los partidos que quedaron sin cancha u hora (desde mañana). */
    @Transactional
    public ScheduleResult placePending(String org, Long id, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        Tournament t = byId(o, id);
        List<Match> pending = t.getMatches().stream()
                .filter(m -> !m.isBye() && m.getStatus() == MatchStatus.SCHEDULED && !m.isPlaced()).toList();
        int unplaced = scheduling.autoPlace(t, pending, LocalDate.now(SchedulingService.ZONE).plusDays(1));
        broadcaster.tournamentChanged(t);
        return new ScheduleResult(pending.size(), pending.size() - unplaced, unplaced);
    }

    /** Crea los partidos (también lo usa la demo). La cancha y la hora se asignan aparte. */
    public List<Match> buildSchedule(Tournament t) {
        List<Team> roster = t.getTeams();
        validateTeamCount(t, roster.size());
        Map<Long, Team> byId = new HashMap<>();
        roster.forEach(team -> byId.put(team.getId(), team));
        List<Match> created;
        switch (t.getFormat()) {
            case LEAGUE -> created = ScheduleBuilder.roundRobin(t, roster, Stage.LEAGUE, null, t.isDoubleRound());
            case KNOCKOUT -> created = ScheduleBuilder.knockout(t,
                    BracketGenerator.firstRound(roster.stream().map(Team::getId).toList()), byId);
            default -> {
                List<List<Long>> groups = FixtureGenerator.snakeGroups(roster.stream().map(Team::getId).toList(), t.getGroupsCount());
                created = new ArrayList<>();
                for (int g = 0; g < groups.size(); g++) {
                    String label = FixtureGenerator.groupLabel(g);
                    List<Team> groupTeams = groups.get(g).stream().map(byId::get).toList();
                    groupTeams.forEach(team -> team.setGroupLabel(label));
                    created.addAll(ScheduleBuilder.roundRobin(t, groupTeams, Stage.GROUP, label, false));
                }
            }
        }
        t.getMatches().addAll(created);
        t.setStatus(TournamentStatus.IN_PROGRESS);
        return created;
    }

    // ---------- Apoyo ----------

    Tournament byId(Organization o, Long id) {
        Tournament t = tournaments.findById(id).orElseThrow(() -> ApiException.notFound("Torneo no encontrado"));
        OrgAccess.sameOrg(t, o);
        return t;
    }

    private Team team(String org, Long id, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        Team team = teams.findById(id).orElseThrow(() -> ApiException.notFound("Equipo no encontrado"));
        OrgAccess.sameOrg(team.getTournament(), o);
        return team;
    }

    private Player player(String org, Long id, AuthPrincipal principal) {
        Organization o = access.requireManager(org, principal).getOrganization();
        Player p = players.findById(id).orElseThrow(() -> ApiException.notFound("Jugador no encontrado"));
        OrgAccess.sameOrg(p.getTeam().getTournament(), o);
        return p;
    }

    private void setCourts(Tournament t, Organization o, List<Long> courtIds) {
        t.getCourts().clear();
        if (courtIds == null) return;
        for (Long id : courtIds) {
            Court c = courts.findById(id).orElseThrow(() -> ApiException.badRequest("Cancha no encontrada"));
            if (!c.getVenue().getOrganization().getId().equals(o.getId())) throw ApiException.badRequest("Cancha no encontrada");
            t.getCourts().add(c);
        }
    }

    public Team addTeamTo(Tournament t, TeamInput input) {
        if (t.getTeams().size() >= MAX_TEAMS) throw ApiException.badRequest("Máximo " + MAX_TEAMS + " equipos");
        String name = input.name().trim();
        if (t.getTeams().stream().anyMatch(other -> other.getName().equalsIgnoreCase(name))) {
            throw ApiException.badRequest("Ya hay un equipo llamado " + name);
        }
        Team team = new Team();
        team.setTournament(t);
        team.setName(name);
        team.setShortName(shortName(input.shortName(), name));
        team.setColor(input.color() != null ? input.color().toUpperCase(Locale.ROOT) : PALETTE[t.getTeams().size() % PALETTE.length]);
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

    private String uniqueSlug(Organization o, String name) {
        String base = OrgService.slugify(name);
        if (base.length() > 60) base = base.substring(0, 60).replaceAll("-$", "");
        if (base.isEmpty()) base = "torneo";
        String slug = base;
        while (tournaments.existsByOrganizationIdAndSlug(o.getId(), slug)) slug = base + "-" + randomCode(3);
        return slug;
    }

    private static String randomCode(int length) {
        String alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return sb.toString();
    }

    static String shortName(String requested, String name) {
        if (requested != null && !requested.isBlank()) return requested.trim().toUpperCase(Locale.ROOT);
        String[] words = OrgService.slugify(name).toUpperCase(Locale.ROOT).split("-");
        String result;
        if (words.length >= 3) result = "" + words[0].charAt(0) + words[1].charAt(0) + words[2].charAt(0);
        else if (words.length == 2 && !words[1].isEmpty()) result = words[0].substring(0, Math.min(2, words[0].length())) + words[1].charAt(0);
        else result = words[0].substring(0, Math.min(3, words[0].length()));
        return result.isEmpty() ? "EQ" : result;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
