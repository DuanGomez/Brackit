package com.duangomez.torneos.web;

import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.sport.Sport;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Peticiones y respuestas de la API (records inmutables, serializados a JSON). */
public final class Dtos {

    private Dtos() {
    }

    // ---------- Autenticación ----------

    public record RegisterRequest(
            @NotBlank(message = "Escribe tu nombre") @Size(max = 80, message = "El nombre es muy largo") String name,
            @NotBlank(message = "Escribe tu correo") @Email(message = "El correo no es válido") String email,
            @NotBlank @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres") String password) {
    }

    public record LoginRequest(@NotBlank(message = "Escribe tu correo") String email,
                               @NotBlank(message = "Escribe tu contraseña") String password) {
    }

    public record RefereeLoginRequest(@NotBlank(message = "Escribe el código del torneo") String code,
                                      @NotBlank(message = "Escribe el PIN") String pin) {
    }

    public record UserDto(Long id, String name, String email) {
    }

    public record AuthResponse(String token, String role, UserDto user, TournamentCardDto tournament) {
    }

    // ---------- Deportes ----------

    public record EventTypeDto(String code, String label, int value) {
    }

    public record SportDto(String code, String label, String scoring, int periods, int periodMinutes,
                           int setsToWin, int setTarget, int lastSetTarget, boolean allowsDraw,
                           int winPoints, int drawPoints, int lossPoints,
                           String scorersTitle, String scoreUnit, String participantLabel,
                           List<EventTypeDto> events) {
    }

    // ---------- Torneos (organizador) ----------

    public record TeamInput(
            @NotBlank(message = "Cada equipo necesita un nombre") @Size(max = 60, message = "Nombre de equipo muy largo") String name,
            @Size(max = 4, message = "La abreviatura admite hasta 4 letras") String shortName,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color inválido") String color) {
    }

    public record CreateTournamentRequest(
            @NotBlank(message = "Ponle un nombre al torneo") @Size(max = 80, message = "El nombre es muy largo") String name,
            @NotNull(message = "Elige un deporte") Sport sport,
            @NotNull(message = "Elige un formato") TournamentFormat format,
            @Size(max = 400, message = "La descripción es muy larga") String description,
            @Size(max = 120) String location,
            LocalDate startDate,
            boolean doubleRound,
            @Min(0) @Max(8) int groupsCount,
            @Min(0) @Max(2) int advancePerGroup,
            @Valid @Size(max = 64, message = "Máximo 64 equipos") List<TeamInput> teams) {
    }

    public record UpdateTournamentRequest(
            @NotBlank(message = "Ponle un nombre al torneo") @Size(max = 80) String name,
            @Size(max = 400) String description,
            @Size(max = 120) String location,
            LocalDate startDate) {
    }

    public record PlayerInput(@NotBlank(message = "Escribe el nombre del jugador") @Size(max = 60) String name,
                              @Min(0) @Max(999) Integer number) {
    }

    public record ScheduleRequest(
            @NotNull(message = "Elige la fecha de inicio") LocalDate startDate,
            @NotNull(message = "Elige la hora del primer partido") LocalTime firstMatchTime,
            @Min(value = 1, message = "Mínimo 1 día entre jornadas") @Max(30) int daysBetweenRounds,
            @Min(value = 30, message = "Mínimo 30 minutos entre partidos") @Max(600) int minutesBetweenMatches,
            @Size(max = 10) List<@Size(max = 80) String> venues,
            String timeZone) {
    }

    public record MatchScheduleRequest(Instant scheduledAt, @Size(max = 80) String venue) {
    }

    public record PinResponse(String pin) {
    }

    // ---------- Partidos en vivo ----------

    public record EventRequest(@NotBlank String type, @NotNull Long teamId, Long playerId) {
    }

    public record PointRequest(@NotNull Long teamId) {
    }

    public record FinishRequest(Integer homePenalties, Integer awayPenalties) {
    }

    public record SetInput(@Min(0) int home, @Min(0) int away) {
    }

    public record ResultRequest(@Min(0) int homeScore, @Min(0) int awayScore, @Valid List<SetInput> sets,
                                Integer homePenalties, Integer awayPenalties) {
    }

    // ---------- Vistas públicas ----------

    public record PlayerDto(Long id, String name, Integer number) {
    }

    public record TeamDto(Long id, String name, String shortName, String color, String group, int seed,
                          List<PlayerDto> players) {
    }

    public record SetDto(int home, int away, boolean finished) {
    }

    public record MatchDto(Long id, String stage, int round, String roundLabel, String group, Integer position,
                           Long homeId, Long awayId, Instant scheduledAt, String venue, String status,
                           int period, String periodLabel, Instant periodStartedAt, double clockSpeed,
                           int homeScore, int awayScore, Integer homePenalties, Integer awayPenalties,
                           List<SetDto> sets, Long winnerId, boolean bye) {
    }

    public record EventDto(Long id, String type, String label, Long teamId, Long playerId, String playerName,
                           int period, Integer minute, Integer setIndex, Instant createdAt) {
    }

    public record StandingRowDto(Long teamId, int played, int won, int drawn, int lost, int scoreFor,
                                 int scoreAgainst, int diff, int setPointsFor, int setPointsAgainst,
                                 int points, List<String> form, boolean live) {
    }

    public record StandingsGroupDto(String group, List<StandingRowDto> rows) {
    }

    public record ScorerDto(Long playerId, String player, Long teamId, int value) {
    }

    public record TournamentCardDto(Long id, String slug, String name, String sport, String format, String status,
                                    String location, LocalDate startDate, String organizer, int teams,
                                    int matchesPlayed, int matchesTotal, int liveCount, Long championId,
                                    String championName, boolean demo) {
    }

    public record TournamentDto(Long id, String slug, String name, SportDto sport, String format, String status,
                                String description, String location, LocalDate startDate, String organizer,
                                boolean doubleRound, int groupsCount, int advancePerGroup, Long championId,
                                boolean demo, Boolean hasRefereePin, List<TeamDto> teams, List<MatchDto> matches,
                                List<StandingsGroupDto> standings, List<ScorerDto> scorers, Instant serverTime) {
    }

    public record TournamentSummaryDto(Long id, String slug, String name, String sport, String status) {
    }

    public record MatchDetailDto(MatchDto match, TournamentSummaryDto tournament, SportDto sport, TeamDto home,
                                 TeamDto away, List<EventDto> events, Instant serverTime) {
    }

    /** Mensaje del canal en vivo de un torneo. "refresh" pide volver a cargar todo. */
    public record LiveUpdate(String type, MatchDto match, List<StandingsGroupDto> standings,
                             List<ScorerDto> scorers, String status, Long championId, Instant serverTime) {
    }
}
