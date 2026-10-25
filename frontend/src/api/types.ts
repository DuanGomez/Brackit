// Tipos espejo de los DTO del backend (web/Dtos.java).

export type SportCode = 'FUTBOL' | 'FUTBOL_SALA' | 'BALONMANO' | 'BALONCESTO' | 'VOLEIBOL' | 'TENIS' | 'PADEL';
export type Scoring = 'GOALS' | 'POINTS' | 'SETS';
export type Format = 'LEAGUE' | 'KNOCKOUT' | 'GROUPS_KNOCKOUT';
export type TournamentStatus = 'DRAFT' | 'IN_PROGRESS' | 'FINISHED';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
export type Stage = 'LEAGUE' | 'GROUP' | 'KNOCKOUT' | 'THIRD_PLACE';
export type Role = 'ADMIN' | 'COORDINATOR' | 'REFEREE';
export type PlanId = 'FREE' | 'LIGA' | 'CLUB';

// ---------- Sesión y organizaciones ----------

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface MembershipRef {
  orgId: number;
  slug: string;
  name: string;
  shortName: string;
  color: string;
  plan: PlanId;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
  memberships: MembershipRef[];
}

export interface SessionInfo {
  user: User;
  memberships: MembershipRef[];
}

export interface Limits {
  maxActiveTournaments: number;
  maxVenues: number;
  activeTournaments: number;
  venues: number;
}

export interface Org {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  color: string;
  city: string | null;
  description: string | null;
  plan: PlanId;
  demo: boolean;
  myRole: Role;
  limits: Limits;
}

export interface OrgRef {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  city: string | null;
}

export interface Member {
  id: number;
  userId: number | null;
  name: string | null;
  email: string;
  role: Role;
  status: 'INVITED' | 'ACTIVE';
}

// ---------- Sedes y canchas ----------

export interface Window {
  dayOfWeek: number;
  start: string;
  end: string;
}

export interface Block {
  id: number;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface Court {
  id: number;
  venueId: number;
  venueName: string;
  name: string;
  surface: string | null;
  sports: SportCode[];
  availability: Window[];
  blocks: Block[];
}

export interface Venue {
  id: number;
  name: string;
  address: string | null;
  courts: Court[];
}

// ---------- Deportes y torneos ----------

export interface EventTypeDto {
  code: string;
  label: string;
  value: number;
}

export interface Sport {
  code: SportCode;
  label: string;
  scoring: Scoring;
  periods: number;
  periodMinutes: number;
  setsToWin: number;
  setTarget: number;
  lastSetTarget: number;
  allowsDraw: boolean;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  defaultBlockMinutes: number;
  scorersTitle: string;
  scoreUnit: string;
  participantLabel: string;
  events: EventTypeDto[];
}

export interface Player {
  id: number;
  name: string;
  number: number | null;
  document: string | null;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  color: string;
  color2: string | null;
  crestStyle: number;
  hasPhoto: boolean;
  /** Versión del escudo (ver teamLogoUrl). */
  logo?: string;
  group: string | null;
  seed: number;
  players: Player[];
}

export interface TeamRef {
  id: number;
  name: string;
  shortName: string;
  color: string;
  logo?: string;
}

export interface SetScore {
  home: number;
  away: number;
  finished: boolean;
}

export interface Match {
  id: number;
  stage: Stage;
  round: number;
  roundLabel: string;
  group: string | null;
  position: number | null;
  homeId: number | null;
  awayId: number | null;
  scheduledAt: string | null;
  courtId: number | null;
  courtName: string | null;
  venueName: string | null;
  refereeId: number | null;
  refereeName: string | null;
  status: MatchStatus;
  cancelReason: string | null;
  period: number;
  periodLabel: string;
  periodStartedAt: string | null;
  clockSpeed: number;
  homeScore: number;
  awayScore: number;
  homePenalties: number | null;
  awayPenalties: number | null;
  sets: SetScore[];
  winnerId: number | null;
  bye: boolean;
}

/** Partido con contexto (torneo y equipos) para las listas de la organización. */
export interface MatchCard {
  id: number;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
  sport: SportCode;
  roundLabel: string;
  group: string | null;
  status: MatchStatus;
  cancelReason: string | null;
  scheduledAt: string | null;
  blockMinutes: number;
  courtId: number | null;
  courtName: string | null;
  venueName: string | null;
  refereeId: number | null;
  refereeName: string | null;
  home: TeamRef | null;
  away: TeamRef | null;
  homeScore: number;
  awayScore: number;
  homePenalties: number | null;
  awayPenalties: number | null;
  period: number;
  periodLabel: string;
  periodStartedAt: string | null;
  clockSpeed: number;
  sets: SetScore[];
  winnerId: number | null;
}

export interface MatchEvent {
  id: number;
  type: string;
  label: string;
  teamId: number;
  playerId: number | null;
  playerName: string | null;
  period: number;
  minute: number | null;
  setIndex: number | null;
  createdAt: string;
}

export interface StandingRow {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoreFor: number;
  scoreAgainst: number;
  diff: number;
  setPointsFor: number;
  setPointsAgainst: number;
  points: number;
  form: string[];
  live: boolean;
}

export interface StandingsGroup {
  group: string | null;
  rows: StandingRow[];
}

export interface Scorer {
  playerId: number;
  player: string;
  teamId: number;
  value: number;
}

export interface TournamentCard {
  id: number;
  slug: string;
  name: string;
  category: string | null;
  sport: SportCode;
  format: Format;
  status: TournamentStatus;
  teams: number;
  matchesPlayed: number;
  matchesTotal: number;
  liveCount: number;
  championId: number | null;
  championName: string | null;
  nextMatchAt: string | null;
}

export interface Tournament {
  id: number;
  slug: string;
  name: string;
  category: string | null;
  sport: Sport;
  format: Format;
  status: TournamentStatus;
  description: string | null;
  startDate: string | null;
  organization: OrgRef;
  doubleRound: boolean;
  groupsCount: number;
  advancePerGroup: number;
  thirdPlace: boolean;
  blockMinutes: number;
  minRestHours: number;
  daysBetween: number;
  courtIds: number[];
  championId: number | null;
  teams: Team[];
  matches: Match[];
  standings: StandingsGroup[];
  scorers: Scorer[];
  serverTime: string;
}

export interface MatchDetail {
  match: Match;
  tournament: { id: number; slug: string; name: string; sport: SportCode; status: TournamentStatus; organization: OrgRef };
  sport: Sport;
  home: Team | null;
  away: Team | null;
  events: MatchEvent[];
  serverTime: string;
}

export interface LiveUpdate {
  type: 'match' | 'refresh';
  match: Match | null;
  standings: StandingsGroup[] | null;
  scorers: Scorer[] | null;
  status: TournamentStatus;
  championId: number | null;
  serverTime: string;
}

// ---------- Panel y calendario ----------

export interface Pending {
  kind: 'NO_REFEREE' | 'UNPLACED' | 'NO_DOCUMENT' | 'DRAFT';
  severity: 'info' | 'warning' | 'error';
  message: string;
  tournamentId: number | null;
  matchId: number | null;
}

export interface CalendarCourt {
  id: number;
  name: string;
  surface: string | null;
  venueId: number;
  venueName: string;
  windows: Window[];
  blocks: Block[];
}

export interface Dashboard {
  today: MatchCard[];
  liveCount: number;
  activeTournaments: number;
  teamsCount: number;
  courtsCount: number;
  pending: Pending[];
  tournaments: TournamentCard[];
  courtsToday: CalendarCourt[];
  serverTime: string;
}

export interface Calendar {
  date: string;
  courts: CalendarCourt[];
  matches: MatchCard[];
  unscheduled: MatchCard[];
  serverTime: string;
}

export interface Conflict {
  type: string;
  message: string;
}

// ---------- Público ----------

export interface PublicOrgCard {
  organization: OrgRef;
  tournaments: number;
  liveCount: number;
}

export interface PublicOrg {
  organization: OrgRef;
  description: string | null;
  tournaments: TournamentCard[];
  featured: MatchCard | null;
  today: MatchCard[];
  serverTime: string;
}
