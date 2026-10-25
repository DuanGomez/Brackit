import { API_URL } from '../config';
import type {
  AuthResponse, Format, MatchDetail, Match, Player, Sport, SportCode, Team, Tournament, TournamentCard, User,
} from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- Sesión ----------

const TOKEN_KEY = 'torneos.session';

export interface Session {
  token: string;
  role: 'ORGANIZER' | 'REFEREE';
  user: User | null;
  tournament: TournamentCard | null;
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento bloqueado: la sesión dura lo que la pestaña */
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// ---------- Aviso de servidor "dormido" ----------
// El plan gratuito del servidor se suspende sin uso; la primera petición puede tardar ~1 minuto.

type Listener = (waking: boolean) => void;
const listeners = new Set<Listener>();
let slowRequests = 0;

export function onServerWaking(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSlow(delta: number) {
  const before = slowRequests > 0;
  slowRequests += delta;
  const after = slowRequests > 0;
  if (before !== after) listeners.forEach((l) => l(after));
}

// ---------- Petición base ----------

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const session = readSession();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session) headers.Authorization = `Bearer ${session.token}`;

  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    setSlow(1);
  }, 3500);

  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  } finally {
    clearTimeout(timer);
    if (slow) setSlow(-1);
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && session) onUnauthorized();
    throw new ApiError(response.status, data?.message ?? 'Ocurrió un error inesperado');
  }
  return data as T;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const del = (path: string) => request<void>('DELETE', path);

// ---------- Endpoints ----------

export interface TeamInput {
  name: string;
  shortName?: string;
  color?: string;
}

export interface CreateTournamentInput {
  name: string;
  sport: SportCode;
  format: Format;
  description?: string;
  location?: string;
  startDate?: string | null;
  doubleRound: boolean;
  groupsCount: number;
  advancePerGroup: number;
  teams: TeamInput[];
}

export interface ScheduleInput {
  startDate: string;
  firstMatchTime: string;
  daysBetweenRounds: number;
  minutesBetweenMatches: number;
  venues: string[];
  timeZone: string;
}

export interface ResultInput {
  homeScore: number;
  awayScore: number;
  sets?: { home: number; away: number }[];
  homePenalties?: number | null;
  awayPenalties?: number | null;
}

export const api = {
  // Autenticación
  register: (name: string, email: string, password: string) =>
    post<AuthResponse>('/api/auth/register', { name, email, password }),
  login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }),
  refereeLogin: (code: string, pin: string) => post<AuthResponse>('/api/auth/referee', { code, pin }),

  // Público
  health: () => get<{ status: string }>('/api/health'),
  sports: () => get<Sport[]>('/api/sports'),
  publicTournaments: (sport?: SportCode | null, q?: string) => {
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (q) params.set('q', q);
    const qs = params.toString();
    return get<TournamentCard[]>('/api/public/tournaments' + (qs ? `?${qs}` : ''));
  },
  publicTournament: (slug: string) => get<Tournament>(`/api/public/tournaments/${encodeURIComponent(slug)}`),
  publicMatch: (id: number) => get<MatchDetail>(`/api/public/matches/${id}`),

  // Organizador
  myTournaments: () => get<TournamentCard[]>('/api/tournaments'),
  tournament: (id: number) => get<Tournament>(`/api/tournaments/${id}`),
  createTournament: (input: CreateTournamentInput) => post<Tournament>('/api/tournaments', input),
  updateTournament: (id: number, input: { name: string; description?: string; location?: string; startDate?: string | null }) =>
    put<Tournament>(`/api/tournaments/${id}`, input),
  deleteTournament: (id: number) => del(`/api/tournaments/${id}`),
  addTeam: (tournamentId: number, input: TeamInput) => post<Team>(`/api/tournaments/${tournamentId}/teams`, input),
  updateTeam: (teamId: number, input: TeamInput) => put<Team>(`/api/teams/${teamId}`, input),
  deleteTeam: (teamId: number) => del(`/api/teams/${teamId}`),
  addPlayer: (teamId: number, name: string, number: number | null) =>
    post<Player>(`/api/teams/${teamId}/players`, { name, number }),
  deletePlayer: (playerId: number) => del(`/api/players/${playerId}`),
  schedule: (id: number, input: ScheduleInput) => post<Tournament>(`/api/tournaments/${id}/schedule`, input),
  refereePin: (id: number) => post<{ pin: string }>(`/api/tournaments/${id}/referee-pin`),
  scheduleMatch: (matchId: number, scheduledAt: string | null, venue: string | null) =>
    put<Match>(`/api/matches/${matchId}/schedule`, { scheduledAt, venue }),
  setResult: (matchId: number, input: ResultInput) => put<MatchDetail>(`/api/matches/${matchId}/result`, input),

  // Partido en vivo (árbitro u organizador)
  start: (matchId: number) => post<MatchDetail>(`/api/matches/${matchId}/start`),
  event: (matchId: number, type: string, teamId: number, playerId: number | null) =>
    post<MatchDetail>(`/api/matches/${matchId}/events`, { type, teamId, playerId }),
  point: (matchId: number, teamId: number) => post<MatchDetail>(`/api/matches/${matchId}/points`, { teamId }),
  nextPeriod: (matchId: number) => post<MatchDetail>(`/api/matches/${matchId}/period`),
  undo: (matchId: number) => post<MatchDetail>(`/api/matches/${matchId}/undo`),
  finish: (matchId: number, homePenalties?: number | null, awayPenalties?: number | null) =>
    post<MatchDetail>(`/api/matches/${matchId}/finish`, { homePenalties, awayPenalties }),
};
