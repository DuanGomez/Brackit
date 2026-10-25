// Tipos espejo de los DTO del backend (web/Dtos.java).

export type SportCode = 'FUTBOL' | 'FUTBOL_SALA' | 'BALONMANO' | 'BALONCESTO' | 'VOLEIBOL' | 'TENIS' | 'PADEL';
export type Scoring = 'GOALS' | 'POINTS' | 'SETS';
export type Format = 'LEAGUE' | 'KNOCKOUT' | 'GROUPS_KNOCKOUT';
export type TournamentStatus = 'DRAFT' | 'IN_PROGRESS' | 'FINISHED';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';
export type Stage = 'LEAGUE' | 'GROUP' | 'KNOCKOUT';

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
  scorersTitle: string;
  scoreUnit: string;
  participantLabel: string;
  events: EventTypeDto[];
}

export interface Player {
  id: number;
  name: string;
  number: number | null;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  color: string;
  group: string | null;
  seed: number;
  players: Player[];
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
  venue: string | null;
  status: MatchStatus;
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
  sport: SportCode;
  format: Format;
  status: TournamentStatus;
  location: string | null;
  startDate: string | null;
  organizer: string;
  teams: number;
  matchesPlayed: number;
  matchesTotal: number;
  liveCount: number;
  championId: number | null;
  championName: string | null;
  demo: boolean;
}

export interface Tournament {
  id: number;
  slug: string;
  name: string;
  sport: Sport;
  format: Format;
  status: TournamentStatus;
  description: string | null;
  location: string | null;
  startDate: string | null;
  organizer: string;
  doubleRound: boolean;
  groupsCount: number;
  advancePerGroup: number;
  championId: number | null;
  demo: boolean;
  hasRefereePin: boolean | null;
  teams: Team[];
  matches: Match[];
  standings: StandingsGroup[];
  scorers: Scorer[];
  serverTime: string;
}

export interface MatchDetail {
  match: Match;
  tournament: { id: number; slug: string; name: string; sport: SportCode; status: TournamentStatus };
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

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  role: 'ORGANIZER' | 'REFEREE';
  user: User | null;
  tournament: TournamentCard | null;
}
