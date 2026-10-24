package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.*;
import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.repo.MatchRepository;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.sport.EventType;
import com.duangomez.torneos.sport.ScoringType;
import com.duangomez.torneos.sport.Sport;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Operación de un partido en vivo. Cada método valida permisos y reglas del deporte,
 * actualiza el marcador y deja que {@link LiveBroadcaster} lo publique al confirmar.
 */
@Service
public class MatchService {

    private final MatchRepository matches;
    private final TournamentProgress progress;
    private final LiveBroadcaster broadcaster;

    public MatchService(MatchRepository matches, TournamentProgress progress, LiveBroadcaster broadcaster) {
        this.matches = matches;
        this.progress = progress;
        this.broadcaster = broadcaster;
    }

    @Transactional
    public MatchDetailDto start(Long matchId, AuthPrincipal principal) {
        Match m = operable(matchId, principal);
        start(m, Instant.now());
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto addEvent(Long matchId, EventRequest req, AuthPrincipal principal) {
        Match m = operable(matchId, principal);
        EventType type = parseType(req.type());
        addEvent(m, type, req.teamId(), req.playerId(), Instant.now());
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto addPoint(Long matchId, PointRequest req, AuthPrincipal principal) {
        Match m = operable(matchId, principal);
        boolean finished = addPoint(m, req.teamId(), Instant.now());
        boolean structural = finished && progress.onFinished(m, null);
        return publish(m, structural);
    }

    @Transactional
    public MatchDetailDto nextPeriod(Long matchId, AuthPrincipal principal) {
        Match m = operable(matchId, principal);
        nextPeriod(m, Instant.now());
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto undo(Long matchId, AuthPrincipal principal) {
        Match m = operable(matchId, principal);
        undoLast(m);
        return publish(m, false);
    }

    @Transactional
    public MatchDetailDto finish(Long matchId, FinishRequest req, AuthPrincipal principal) {
        Match m = operable(matchId, principal);
        finish(m, req == null ? null : req.homePenalties(), req == null ? null : req.awayPenalties(), Instant.now());
        boolean structural = progress.onFinished(m, null);
        return publish(m, structural);
    }

    /** Resultado cargado a mano (partido sin seguimiento en vivo) o corrección de uno terminado. */
    @Transactional
    public MatchDetailDto setResult(Long matchId, ResultRequest req, AuthPrincipal principal) {
        Match m = find(matchId);
        Access.requireOwner(m.getTournament(), principal);
        Long previousWinner = m.getStatus() == MatchStatus.FINISHED ? m.getWinnerTeamId() : null;
        applyResult(m, req, Instant.now());
        boolean structural = progress.onFinished(m, previousWinner);
        return publish(m, structural);
    }

    // ---------- Reglas (también las usa el simulador de la demo) ----------

    public void start(Match m, Instant now) {
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
        if (m.getStatus() == MatchStatus.LIVE) throw ApiException.badRequest("El partido está en vivo: usa el panel de árbitro");
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
        if (m.getStage() != Stage.KNOCKOUT) return null; // empate válido en liga y grupos
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

    private Match find(Long id) {
        return matches.findById(id).orElseThrow(() -> ApiException.notFound("Partido no encontrado"));
    }

    private Match operable(Long id, AuthPrincipal principal) {
        Match m = find(id);
        Access.requireOperator(m.getTournament(), principal);
        return m;
    }

    private MatchDetailDto publish(Match m, boolean structural) {
        matches.saveAndFlush(m);
        broadcaster.matchChanged(m, structural);
        return TournamentViews.detail(m);
    }
}
