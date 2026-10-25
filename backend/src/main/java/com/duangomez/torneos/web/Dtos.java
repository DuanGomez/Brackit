package com.duangomez.torneos.web;

import com.duangomez.torneos.domain.Enums.Role;
import com.duangomez.torneos.domain.Enums.TournamentFormat;
import com.duangomez.torneos.sport.Sport;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.time.LocalDate;
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

    public record UserDto(Long id, String name, String email) {
    }

    /** Organización a la que pertenece la persona, con su rol. */
    public record MembershipDto(Long orgId, String slug, String name, String shortName, String color, String plan,
                                String role) {
    }

    public record AuthResponse(String token, UserDto user, List<MembershipDto> memberships) {
    }

    public record SessionDto(UserDto user, List<MembershipDto> memberships) {
    }

    // ---------- Organizaciones ----------

    public record CreateOrgRequest(
            @NotBlank(message = "Escribe el nombre de tu organización") @Size(max = 80) String name,
            @Size(max = 80) String city,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color inválido") String color) {
    }

    public record UpdateOrgRequest(
            @NotBlank(message = "Escribe el nombre de tu organización") @Size(max = 80) String name,
            @Size(max = 3, message = "Las iniciales admiten hasta 3 letras") String shortName,
            @Size(max = 80) String city,
            @Size(max = 300) String description,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color inválido") String color) {
    }

    public record LimitsDto(int maxActiveTournaments, int maxVenues, long activeTournaments, long venues) {
    }

    public record OrgDto(Long id, String slug, String name, String shortName, String color, String city,
                         String description, String plan, boolean demo, String myRole, LimitsDto limits) {
    }

    public record InviteRequest(@NotBlank(message = "Escribe el correo") @Email(message = "El correo no es válido") String email,
                                @NotNull(message = "Elige un rol") Role role) {
    }

    public record RoleRequest(@NotNull(message = "Elige un rol") Role role) {
    }

    public record MemberDto(Long id, Long userId, String name, String email, String role, String status) {
    }

    // ---------- Sedes y canchas ----------

    public record VenueInput(@NotBlank(message = "Escribe el nombre de la sede") @Size(max = 80) String name,
                             @Size(max = 160) String address) {
    }

    public record CourtInput(@NotBlank(message = "Escribe el nombre de la cancha") @Size(max = 60) String name,
                             @Size(max = 60) String surface,
                             List<Sport> sports) {
    }

    public record AvailabilityInput(@Min(1) @Max(7) int dayOfWeek,
                                    @NotBlank @Pattern(regexp = "^\\d{2}:\\d{2}$") String start,
                                    @NotBlank @Pattern(regexp = "^\\d{2}:\\d{2}$") String end) {
    }

    public record BlockInput(@NotNull Instant startsAt, @NotNull Instant endsAt, @Size(max = 120) String reason) {
    }

    public record WindowDto(int dayOfWeek, String start, String end) {
    }

    public record BlockDto(Long id, Instant startsAt, Instant endsAt, String reason) {
    }

    public record CourtDto(Long id, Long venueId, String venueName, String name, String surface, List<String> sports,
                           List<WindowDto> availability, List<BlockDto> blocks) {
    }

    public record VenueDto(Long id, String name, String address, List<CourtDto> courts) {
    }

    // ---------- Torneos ----------

    public record TeamInput(
            @NotBlank(message = "Cada equipo necesita un nombre") @Size(max = 60, message = "Nombre de equipo muy largo") String name,
            @Size(max = 4, message = "La abreviatura admite hasta 4 letras") String shortName,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color inválido") String color) {
    }

    public record CreateTournamentRequest(
            @NotBlank(message = "Ponle un nombre al torneo") @Size(max = 80, message = "El nombre es muy largo") String name,
            @Size(max = 40) String category,
            @NotNull(message = "Elige un deporte") Sport sport,
            @NotNull(message = "Elige un formato") TournamentFormat format,
            @Size(max = 400, message = "La descripción es muy larga") String description,
            LocalDate startDate,
            boolean doubleRound,
            @Min(0) @Max(8) int groupsCount,
            @Min(0) @Max(2) int advancePerGroup,
            boolean thirdPlace,
            @Min(0) @Max(600) int blockMinutes,
            @Min(0) @Max(168) int minRestHours,
            @Min(0) @Max(30) int daysBetween,
            List<Long> courtIds,
            @Valid @Size(max = 64, message = "Máximo 64 equipos") List<TeamInput> teams) {
    }

    public record UpdateTournamentRequest(
            @NotBlank(message = "Ponle un nombre al torneo") @Size(max = 80) String name,
            @Size(max = 40) String category,
            @Size(max = 400) String description,
            LocalDate startDate,
            @Min(15) @Max(600) int blockMinutes,
            @Min(0) @Max(168) int minRestHours,
            @Min(1) @Max(30) int daysBetween,
            List<Long> courtIds) {
    }

    public record PlayerInput(@NotBlank(message = "Escribe el nombre del jugador") @Size(max = 60) String name,
                              @Min(0) @Max(999) Integer number,
                              @Size(max = 30) String document) {
    }

    public record ScheduleRequest(@NotNull(message = "Elige la fecha de inicio") LocalDate startDate) {
    }

    public record ScheduleResult(int created, int placed, int unplaced) {
    }

    // ---------- Partidos ----------

    public record PlaceRequest(@NotNull(message = "Elige la cancha") Long courtId,
                               @NotNull(message = "Elige la hora") Instant startsAt,
                               boolean force) {
    }

    public record ConflictDto(String type, String message) {
    }

    public record RefereeRequest(Long refereeUserId) {
    }

    public record CancelRequest(@Size(max = 120) String reason) {
    }

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

    // ---------- Vistas ----------

    public record EventTypeDto(String code, String label, int value) {
    }

    public record SportDto(String code, String label, String scoring, int periods, int periodMinutes,
                           int setsToWin, int setTarget, int lastSetTarget, boolean allowsDraw,
                           int winPoints, int drawPoints, int lossPoints, int defaultBlockMinutes,
                           String scorersTitle, String scoreUnit, String participantLabel,
                           List<EventTypeDto> events) {
    }

    public record PlayerDto(Long id, String name, Integer number, String document) {
    }

    public record TeamDto(Long id, String name, String shortName, String color, String group, int seed,
                          List<PlayerDto> players) {
    }

    public record TeamRef(Long id, String name, String shortName, String color) {
    }

    public record SetDto(int home, int away, boolean finished) {
    }

    public record MatchDto(Long id, String stage, int round, String roundLabel, String group, Integer position,
                           Long homeId, Long awayId, Instant scheduledAt, Long courtId, String courtName,
                           String venueName, Long refereeId, String refereeName, String status, String cancelReason,
                           int period, String periodLabel, Instant periodStartedAt, double clockSpeed,
                           int homeScore, int awayScore, Integer homePenalties, Integer awayPenalties,
                           List<SetDto> sets, Long winnerId, boolean bye) {
    }

    /** Partido con contexto (torneo y equipos) para listas de toda la organización. */
    public record MatchCardDto(Long id, Long tournamentId, String tournamentName, String tournamentSlug, String sport,
                               String roundLabel, String group, String status, String cancelReason, Instant scheduledAt,
                               int blockMinutes, Long courtId, String courtName, String venueName, Long refereeId,
                               String refereeName, TeamRef home, TeamRef away, int homeScore, int awayScore,
                               Integer homePenalties, Integer awayPenalties, int period, String periodLabel,
                               Instant periodStartedAt, double clockSpeed, List<SetDto> sets, Long winnerId) {
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

    public record OrgRef(String slug, String name, String shortName, String color, String city) {
    }

    public record TournamentCardDto(Long id, String slug, String name, String category, String sport, String format,
                                    String status, int teams, int matchesPlayed, int matchesTotal, int liveCount,
                                    Long championId, String championName, Instant nextMatchAt) {
    }

    public record TournamentDto(Long id, String slug, String name, String category, SportDto sport, String format,
                                String status, String description, LocalDate startDate, OrgRef organization,
                                boolean doubleRound, int groupsCount, int advancePerGroup, boolean thirdPlace,
                                int blockMinutes, int minRestHours, int daysBetween, List<Long> courtIds,
                                Long championId, List<TeamDto> teams, List<MatchDto> matches,
                                List<StandingsGroupDto> standings, List<ScorerDto> scorers, Instant serverTime) {
    }

    public record TournamentSummaryDto(Long id, String slug, String name, String sport, String status, OrgRef organization) {
    }

    public record MatchDetailDto(MatchDto match, TournamentSummaryDto tournament, SportDto sport, TeamDto home,
                                 TeamDto away, List<EventDto> events, Instant serverTime) {
    }

    /** Mensaje del canal en vivo de un torneo. "refresh" pide volver a cargar todo. */
    public record LiveUpdate(String type, MatchDto match, List<StandingsGroupDto> standings,
                             List<ScorerDto> scorers, String status, Long championId, Instant serverTime) {
    }

    // ---------- Panel y calendario ----------

    public record PendingDto(String kind, String severity, String message, Long tournamentId, Long matchId) {
    }

    public record DashboardDto(List<MatchCardDto> today, int liveCount, int activeTournaments, int teamsCount,
                               int courtsCount, List<PendingDto> pending, List<TournamentCardDto> tournaments,
                               List<CalendarCourtDto> courtsToday, Instant serverTime) {
    }

    public record CalendarCourtDto(Long id, String name, String surface, Long venueId, String venueName,
                                   List<WindowDto> windows, List<BlockDto> blocks) {
    }

    public record CalendarDto(LocalDate date, List<CalendarCourtDto> courts, List<MatchCardDto> matches,
                              List<MatchCardDto> unscheduled, Instant serverTime) {
    }

    // ---------- Público ----------

    public record PublicOrgCardDto(OrgRef organization, int tournaments, int liveCount) {
    }

    public record PublicOrgDto(OrgRef organization, String description, List<TournamentCardDto> tournaments,
                               MatchCardDto featured, List<MatchCardDto> today, Instant serverTime) {
    }
}
