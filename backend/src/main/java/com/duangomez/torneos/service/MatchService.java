package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.MembershipStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.engine.ConflictChecker.Conflict;
import com.duangomez.torneos.repo.MatchRepository;
import com.duangomez.torneos.repo.MembershipRepository;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.sport.EventType;
import com.duangomez.torneos.sport.ScoringType;
import com.duangomez.torneos.sport.Sport;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.ConflictException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Operación de los partidos: programarlos en cancha y hora, asignar árbitro, cancelarlos y
 * llevarlos en vivo. Cada método valida la organización, el rol y las reglas del deporte, y
 * deja que {@link LiveBroadcaster} publique el cambio al confirmar.
 */
@Service
public class MatchService {

    private final MatchRepository matches;
    private final MembershipRepository memberships;
    private final TournamentProgress progress;
    private final LiveBroadcaster broadcaster;
    private final SchedulingService scheduling;
    private final VenueService venues;
    private final OrgAccess access;

    public MatchService(MatchRepository matches, MembershipRepository memberships, TournamentProgress progress,
                        LiveBroadcaster broadcaster, SchedulingService scheduling, VenueService venues, OrgAccess access) {
        this.matches = matches;
        this.memberships = memberships;
        this.progress = progress;
        this.broadcaster = broadcaster;
        this.scheduling = scheduling;
        this.venues = venues;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public MatchDetailDto get(String org, Long matchId, AuthPrincipal principal) {
        Membership me = access.require(org, principal);
        return TournamentViews.detail(inOrg(me.getOrganization(), matchId));
    }

    // ---------- Programación ----------

    /** Choques que tendría el partido en esa cancha y hora (sin guardar nada). */
    @Transactional(readOnly = true)
    public List<ConflictDto> check(String org, Long matchId, PlaceRequest req, AuthPrincipal principal) {
        Membership me = access.requireManager(org, principal);
        Match m = inOrg(me.getOrganization(), matchId);
        Court court = venues.courtOf(me.getOrganization(), req.courtId());
        return conflicts(scheduling.check(m, court, req.startsAt()));
    }

    /** Mueve el partido a una cancha y hora. Si hay choques, no guarda salvo que se confirme con {@code force}. */
    @Transactional
    public MatchCardDto place(String org, Long matchId, PlaceRequest req, AuthPrincipal principal) {
        Membership me = access.requireManager(org, principal);
        Match m = inOrg(me.getOrganization(), matchId);
        if (m.getStatus() != MatchStatus.SCHEDULED) throw ApiException.badRequest("Solo se reprograman partidos sin empezar");
        Court court = venues.courtOf(me.getOrganization(), req.courtId());
        List<Conflict> found = scheduling.check(m, court, req.startsAt());
        if (!found.isEmpty() && !req.force()) throw new ConflictException(conflicts(found));
        m.setCourt(court);
        m.setScheduledAt(req.startsAt());
        matches.flush();
        broadcaster.matchChanged(m, false);
        return TournamentViews.card(m);
    }

    /** Devuelve el partido a "sin programar". */
    @Transactional
    public MatchCardDto unplace(String org, Long matchId, AuthPrincipal principal) {
        Membership me = access.requireManager(org, principal);
        Match m = inOrg(me.getOrganization(), matchId);
        if (m.getStatus() != MatchStatus.SCHEDULED) throw ApiException.badRequest("Solo se desprograman partidos sin empezar");
        m.setCourt(null);
        m.setScheduledAt(null);
        broadcaster.matchChanged(m, false);
        return TournamentViews.card(m);
    }

    /** Asigna (o quita, con null) el árbitro: debe ser miembro activo de la organización. */
    @Transactional
    public MatchCardDto assignReferee(String org, Long matchId, RefereeRequest req, AuthPrincipal principal) {
        Membership me = access.requireManager(org, principal);
        Match m = inOrg(me.getOrganization(), matchId);
        if (req.refereeUserId() == null) {
            m.setReferee(null);
        } else {
            Membership ref = memberships.findByOrganizationIdAndUserIdAndStatus(me.getOrganization().getId(),
                            req.refereeUserId(), MembershipStatus.ACTIVE)
                    .orElseThrow(() -> ApiException.badRequest("Esa persona no es miembro de la organización"));
            m.setReferee(ref.getUser());
        }
        broadcaster.matchChanged(m, false);
        return TournamentViews.card(m);
    }

    @Transactional
    public MatchCardDto cancel(String org, Long matchId, CancelRequest req, AuthPrincipal principal) {
        Membership me = access.requireManager(org, principal);
        Match m = inOrg(me.getOrganization(), matchId);
        if (m.getStatus() != MatchStatus.SCHEDULED) throw ApiException.badRequest("Solo se cancelan partidos sin empezar");
        if (m.getStage() == Stage.KNOCKOUT || m.getStage() == Stage.THIRD_PLACE) {
            throw ApiException.badRequest("En eliminación directa no se cancela: reprograma el partido");
        }
        m.setStatus(MatchStatus.CANCELLED);
        m.setCancelReason(req == null || req.reason() == null || req.reason().isBlank() ? null : req.reason().trim());
        boolean structural = progress.onFinished(m, null);
        matches.flush();
        broadcaster.matchChanged(m, structural);
        return TournamentViews.card(m);
    }

    /** Vuelve a dejar programado un partido cancelado. */
    @Transactional
    public MatchCardDto restore(String org, Long matchId, AuthPrincipal principal) {
        Membership me = access.requireManager(org, principal);
        Match m = inOrg(me.getOrganization(), matchId);
        if (m.getStatus() != MatchStatus.CANCELLED) throw ApiException.badRequest("El partido no está cancelado");
        m.setStatus(MatchStatus.SCHEDULED);
        m.setCancelReason(null);
        broadcaster.matchChanged(m, false);
        return TournamentViews.card(m);
    }

    // ---------- En vivo ----------

    @Transactional
    public MatchDetailDto start(String org, Long matchId, AuthPrincipal principal) {
        Match m = operable(org, matchId, principal);
        start(m, Instant.now());
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto addEvent(String org, Long matchId, EventRequest req, AuthPrincipal principal) {
        Match m = operable(org, matchId, principal);
        addEvent(m, parseType(req.type()), req.teamId(), req.playerId(), Instant.now());
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto addPoint(String org, Long matchId, PointRequest req, AuthPrincipal principal) {
        Match m = operable(org, matchId, principal);
        boolean finished = addPoint(m, req.teamId(), Instant.now());
        boolean structural = finished && progress.onFinished(m, null);
        return publish(m, structural);
    }

    @Transactional
    public MatchDetailDto nextPeriod(String org, Long matchId, AuthPrincipal principal) {
        Match m = operable(org, matchId, principal);
        nextPeriod(m, Instant.now());
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto undo(String org, Long matchId, AuthPrincipal principal) {
        Match m = operable(org, matchId, principal);
        undoLast(m);
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto finish(String org, Long matchId, FinishRequest req, AuthPrincipal principal) {
        Match m = operable(org, matchId, principal);
        finish(m, req == null ? null : req.homePenalties(), req == null ? null : req.awayPenalties(), Instant.now());
        boolean structural = progress.onFinished(m, null);
        return publish(m, structural);
    }

    /** Resultado cargado a mano (partido sin seguimiento en vivo) o corrección de uno terminado. */
    @Transactional
    public MatchDetailDto setResult(String org, Long matchId, ResultRequest req, AuthPrincipal principal) {
        Membership me = access.requireManager(org, principal);
        Match m = inOrg(me.getOrganization(), matchId);
        Long previousWinner = m.getStatus() == MatchStatus.FINISHED ? m.getWinnerTeamId() : null;
        applyResult(m, req, Instant.now());
        boolean structural = progress.onFinished(m, previousWinner);
        return publish(m, structural);
    }

    // ---------- Reglas (también las usa el simulador de la demo) ----------

    public void start(Match m, Instant now) {
        if (m.getStatus() == MatchStatus.CANCELLED) throw ApiException.badRequest("El partido está cancelado");
        if (m.getStatus() != MatchStatus.SCHEDULED) throw ApiException.badRequest("El partido ya empezó");
        if (!m.hasBothTeams()) throw ApiException.badRequest("Este cruce aún no tiene los dos rivales");
        m.setStatus(MatchStatus.LIVE);
        m.setStartedAt(now);
        m.setPeriod(1);
        m.setPeriodStartedAt(now);
        if (sport(m).scoring() == ScoringType.SETS) m.getSets().add(new MatchSet(m, 0));
    }

    public void addEvent(Match m, EventType type, Long teamId, Long playerId, Instant now) {
        Sport sport = sport(m);
        requireLive(m);
        if (sport.scoring() == ScoringType.SETS) throw ApiException.badRequest("En " + sport.label() + " se suman puntos por set");
        if (!sport.supports(type)) throw ApiException.badRequest(type.label() + " no aplica en " + sport.label());
        Team team = teamOf(m, teamId);

        MatchEvent e = new MatchEvent();
        e.setMatch(m);
        e.setType(type);
        e.setTeam(team);
        if (playerId != null) {
            // En un autogol el jugador es del rival del equipo acreditado
            Team playerTeam = type == EventType.OWN_GOAL ? rival(m, team) : team;
            e.setPlayer(playerTeam.getPlayers().stream().filter(p -> p.getId().equals(playerId)).findFirst()
                    .orElseThrow(() -> ApiException.badRequest("El jugador no pertenece a ese equipo")));
        }
        e.setPeriod(m.getPeriod());
        e.setMinute(gameMinute(m, now));
        e.setCreatedAt(now);
        m.getEvents().add(e);
        addScore(m, team, type.scoreValue());
    }

    /** Suma un punto (voleibol) o un juego (tenis, pádel). Devuelve true si con él terminó el partido. */
    public boolean addPoint(Match m, Long teamId, Instant now) {
        Sport sport = sport(m);
        requireLive(m);
        if (sport.scoring() != ScoringType.SETS) throw ApiException.badRequest("Usa los eventos de " + sport.label());
        Team team = teamOf(m, teamId);
        MatchSet set = currentSet(m);
        boolean home = m.isHome(team.getId());
        if (home) set.setHome(set.getHome() + 1);
        else set.setAway(set.getAway() + 1);

        MatchEvent e = new MatchEvent();
        e.setMatch(m);
        e.setType(EventType.POINT);
        e.setTeam(team);
        e.setPeriod(m.getPeriod());
        e.setSetIndex(set.getSetIndex());
        e.setCreatedAt(now);
        m.getEvents().add(e);

        if (!sport.isSetFinished(set.getSetIndex(), set.getHome(), set.getAway())) return false;
        set.setFinished(true);
        addScore(m, team, 1);
        int won = home ? m.getHomeScore() : m.getAwayScore();
        if (won >= sport.setsToWin()) {
            closeMatch(m, team.getId(), now);
            return true;
        }
        m.getSets().add(new MatchSet(m, set.getSetIndex() + 1));
        m.setPeriod(m.getPeriod() + 1);
        m.setPeriodStartedAt(now);
        return false;
    }

    public void nextPeriod(Match m, Instant now) {
        Sport sport = sport(m);
        requireLive(m);
        switch (sport.scoring()) {
            case SETS -> throw ApiException.badRequest("Los sets cambian solos al cerrarse");
            case GOALS -> {
                if (m.getPeriod() >= sport.periods()) throw ApiException.badRequest("Ya es el último tiempo: finaliza el partido");
            }
            case POINTS -> {
                if (m.getPeriod() >= sport.periods() && m.getHomeScore() != m.getAwayScore()) {
                    throw ApiException.badRequest("No hay empate: finaliza el partido");
                }
            }
        }
        m.setPeriod(m.getPeriod() + 1);
        m.setPeriodStartedAt(now);
    }

    /** Deshace la última acción registrada (solo con el partido en vivo). */
    public void undoLast(Match m) {
        requireLive(m);
        MatchEvent last = m.getEvents().stream().max(Comparator.comparing(MatchEvent::getId,
                Comparator.nullsLast(Comparator.naturalOrder()))).orElse(null);
        if (last == null) throw ApiException.badRequest("No hay acciones para deshacer");

        if (last.getType() == EventType.POINT) {
            MatchSet current = currentSet(m);
            MatchSet target = current;
            // Si el punto cerró un set, el set nuevo sigue vacío: se elimina y se reabre el anterior
            if (!last.getSetIndex().equals(current.getSetIndex()) && current.getHome() == 0 && current.getAway() == 0) {
                m.getSets().remove(current);
                target = m.getSets().stream().filter(s -> s.getSetIndex() == last.getSetIndex()).findFirst().orElseThrow();
                target.setFinished(false);
                addScore(m, last.getTeam(), -1);
                m.setPeriod(m.getPeriod() - 1);
            }
            if (m.isHome(last.getTeam().getId())) target.setHome(target.getHome() - 1);
            else target.setAway(target.getAway() - 1);
        } else {
            addScore(m, last.getTeam(), -last.getType().scoreValue());
        }
        m.getEvents().remove(last);
    }

    public void finish(Match m, Integer homePenalties, Integer awayPenalties, Instant now) {
        Sport sport = sport(m);
        requireLive(m);
        if (sport.scoring() == ScoringType.SETS) throw ApiException.badRequest("El partido termina solo al ganar los sets necesarios");
        Long winner = decideWinner(m, sport, m.getHomeScore(), m.getAwayScore(), homePenalties, awayPenalties);
        closeMatch(m, winner, now);
    }

    void applyResult(Match m, ResultRequest req, Instant now) {
        Sport sport = sport(m);
        if (m.getStatus() == MatchStatus.LIVE) throw ApiException.badRequest("El partido está en vivo: usa la consola de árbitro");
        if (m.getStatus() == MatchStatus.CANCELLED) throw ApiException.badRequest("El partido está cancelado");
        if (!m.hasBothTeams() || m.isBye()) throw ApiException.badRequest("Este cruce aún no tiene los dos rivales");
        if (m.getStage() == Stage.GROUP && m.getTournament().getMatches().stream().anyMatch(x -> x.getStage() == Stage.KNOCKOUT)) {
            throw ApiException.badRequest("La fase de grupos ya está cerrada");
        }

        int home = req.homeScore();
        int away = req.awayScore();
        if (sport.scoring() == ScoringType.SETS) {
            List<SetInput> sets = req.sets() == null ? List.of() : req.sets();
            int homeSets = 0, awaySets = 0;
            m.getSets().clear();
            for (int i = 0; i < sets.size(); i++) {
                SetInput s = sets.get(i);
                if (homeSets == sport.setsToWin() || awaySets == sport.setsToWin()) {
                    throw ApiException.badRequest("Sobran sets: el partido ya estaba decidido");
                }
                if (!sport.isSetFinished(i, s.home(), s.away())) {
                    throw ApiException.badRequest("El set " + (i + 1) + " (" + s.home() + "-" + s.away() + ") no es un marcador final válido");
                }
                if (s.home() > s.away()) homeSets++;
                else awaySets++;
                MatchSet set = new MatchSet(m, i);
                set.setHome(s.home());
                set.setAway(s.away());
                set.setFinished(true);
                m.getSets().add(set);
            }
            if (Math.max(homeSets, awaySets) != sport.setsToWin()) {
                throw ApiException.badRequest("Un partido de " + sport.label() + " se gana con " + sport.setsToWin() + " sets");
            }
            home = homeSets;
            away = awaySets;
        }
        Long winner = decideWinner(m, sport, home, away, req.homePenalties(), req.awayPenalties());
        m.setHomeScore(home);
        m.setAwayScore(away);
        if (m.getStartedAt() == null) m.setStartedAt(now);
        m.setPeriod(sport.scoring() == ScoringType.SETS ? m.getSets().size() : Math.max(1, sport.periods()));
        closeMatch(m, winner, now);
    }


    // ---------- Apoyo ----------

    private Long decideWinner(Match m, Sport sport, int home, int away, Integer homePen, Integer awayPen) {
        m.setHomePenalties(null);
        m.setAwayPenalties(null);
        if (home != away) return home > away ? m.homeId() : m.awayId();
        if (sport.scoring() == ScoringType.POINTS) {
            throw ApiException.badRequest("En baloncesto no hay empates: juega la prórroga");
        }
        if (m.getStage() != Stage.KNOCKOUT && m.getStage() != Stage.THIRD_PLACE) return null; // empate válido en liga y grupos
        if (homePen == null || awayPen == null || homePen < 0 || awayPen < 0 || homePen.equals(awayPen)) {
            throw ApiException.badRequest("Es eliminación directa: registra el resultado de los penales");
        }
        m.setHomePenalties(homePen);
        m.setAwayPenalties(awayPen);
        return homePen > awayPen ? m.homeId() : m.awayId();
    }

    private void closeMatch(Match m, Long winner, Instant now) {
        m.setStatus(MatchStatus.FINISHED);
        m.setWinnerTeamId(winner);
        m.setFinishedAt(now);
        m.setPeriodStartedAt(null);
    }

    /** Minuto de juego: minutos de los periodos anteriores + transcurrido (con la velocidad del reloj). */
    public static Integer gameMinute(Match m, Instant now) {
        Sport sport = sport(m);
        if (sport.scoring() == ScoringType.SETS || m.getPeriodStartedAt() == null) return null;
        double elapsed = Duration.between(m.getPeriodStartedAt(), now).toMillis() * m.getClockSpeed() / 60_000d;
        return sport.minutesBeforePeriod(m.getPeriod()) + (int) Math.floor(Math.max(0, elapsed)) + 1;
    }

    private static void addScore(Match m, Team team, int delta) {
        if (m.isHome(team.getId())) m.setHomeScore(Math.max(0, m.getHomeScore() + delta));
        else m.setAwayScore(Math.max(0, m.getAwayScore() + delta));
    }

    private static MatchSet currentSet(Match m) {
        return m.getSets().stream().max(Comparator.comparingInt(MatchSet::getSetIndex))
                .orElseThrow(() -> ApiException.badRequest("El partido no tiene sets abiertos"));
    }

    private static Team teamOf(Match m, Long teamId) {
        if (teamId == null || !m.involves(teamId)) throw ApiException.badRequest("Ese equipo no juega este partido");
        return m.isHome(teamId) ? m.getHome() : m.getAway();
    }

    private static Team rival(Match m, Team team) {
        return m.isHome(team.getId()) ? m.getAway() : m.getHome();
    }

    private static void requireLive(Match m) {
        if (m.getStatus() != MatchStatus.LIVE) throw ApiException.badRequest("El partido no está en vivo");
    }

    private static Sport sport(Match m) {
        return m.getTournament().getSport();
    }

    private static EventType parseType(String type) {
        try {
            return EventType.valueOf(type);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Tipo de evento desconocido");
        }
    }

    private static List<ConflictDto> conflicts(List<Conflict> found) {
        return found.stream().map(c -> new ConflictDto(c.type().name(), c.message())).toList();
    }

    private Match inOrg(Organization org, Long id) {
        Match m = matches.findById(id).orElseThrow(() -> ApiException.notFound("Partido no encontrado"));
        OrgAccess.sameOrg(m, org);
        return m;
    }

    /** Administrador, coordinador o el árbitro del partido (o cualquier árbitro si no tiene asignado). */
    private Match operable(String org, Long id, AuthPrincipal principal) {
        Membership me = access.require(org, principal);
        Match m = inOrg(me.getOrganization(), id);
        OrgAccess.canOperate(m, me);
        return m;
    }

    private MatchDetailDto publish(Match m, boolean structural) {
        matches.flush();
        broadcaster.matchChanged(m, structural);
        return TournamentViews.detail(m);
    }
}
