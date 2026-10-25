import { API_URL } from '../config';
import type {
  AuthResponse, Calendar, Conflict, Court, Dashboard, Format, MatchCard, MatchDetail, Member, MembershipRef, Org,
  Player, PublicOrg, PublicOrgCard, Role, SessionInfo, Sport, SportCode, Team, Tournament, TournamentCard, User, Venue,
} from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public conflicts: Conflict[] = []) {
    super(message);
  }
}

// ---------- Sesión ----------

const SESSION_KEY = 'brackit.session';

export interface Session {
  token: string;
  user: User;
  memberships: MembershipRef[];
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
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
  return () => {
    listeners.delete(listener);
  };
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
    throw new ApiError(response.status, data?.message ?? 'Ocurrió un error inesperado', data?.conflicts ?? []);
  }
  return data as T;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const del = <T = void>(path: string) => request<T>('DELETE', path);

const o = (org: string) => `/api/orgs/${encodeURIComponent(org)}`;

// ---------- Tipos de entrada ----------

export interface TeamInput {
  name: string;
  shortName?: string;
  color?: string;
}

export interface CreateTournamentInput {
  name: string;
  category?: string;
  sport: SportCode;
  format: Format;
  description?: string;
  startDate?: string | null;
  doubleRound: boolean;
  groupsCount: number;
  advancePerGroup: number;
  thirdPlace: boolean;
  blockMinutes: number;
  minRestHours: number;
  daysBetween: number;
  courtIds: number[];
  teams: TeamInput[];
}

export interface UpdateTournamentInput {
  name: string;
  category?: string | null;
  description?: string | null;
  startDate?: string | null;
  blockMinutes: number;
  minRestHours: number;
  daysBetween: number;
  courtIds: number[];
}

export interface ResultInput {
  homeScore: number;
  awayScore: number;
  sets?: { home: number; away: number }[];
  homePenalties?: number | null;
  awayPenalties?: number | null;
}

export interface MatchQuery {
  from?: string;
  to?: string;
  status?: string;
  tournamentId?: number;
  mine?: boolean;
}

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ---------- Endpoints ----------

export const api = {
  // Cuenta
  register: (name: string, email: string, password: string) => post<AuthResponse>('/api/auth/register', { name, email, password }),
  login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }),
  me: () => get<SessionInfo>('/api/auth/me'),

  // Público
  health: () => get<{ status: string }>('/api/health'),
  sports: () => get<Sport[]>('/api/sports'),
  publicOrgs: () => get<PublicOrgCard[]>('/api/public/orgs'),
  publicOrg: (org: string) => get<PublicOrg>(`/api/public/orgs/${encodeURIComponent(org)}`),
  publicTournament: (org: string, slug: string) =>
    get<Tournament>(`/api/public/orgs/${encodeURIComponent(org)}/tournaments/${encodeURIComponent(slug)}`),
  publicMatch: (id: number) => get<MatchDetail>(`/api/public/matches/${id}`),

  // Organización
  createOrg: (name: string, city: string, color?: string) => post<Org>('/api/orgs', { name, city, color }),
  org: (org: string) => get<Org>(o(org)),
  updateOrg: (org: string, input: { name: string; shortName?: string; city?: string | null; description?: string | null; color?: string }) =>
    put<Org>(o(org), input),
  members: (org: string) => get<Member[]>(`${o(org)}/members`),
  invite: (org: string, email: string, role: Role) => post<Member>(`${o(org)}/members`, { email, role }),
  changeRole: (org: string, id: number, role: Role) => put<Member>(`${o(org)}/members/${id}`, { role }),
  removeMember: (org: string, id: number) => del(`${o(org)}/members/${id}`),
  dashboard: (org: string) => get<Dashboard>(`${o(org)}/dashboard`),
  calendar: (org: string, date?: string, venueId?: number | null) => get<Calendar>(`${o(org)}/calendar${query({ date, venueId })}`),
  matches: (org: string, q: MatchQuery = {}) => get<MatchCard[]>(`${o(org)}/matches${query({ ...q })}`),

  // Sedes y canchas
  venues: (org: string) => get<Venue[]>(`${o(org)}/venues`),
  createVenue: (org: string, name: string, address?: string) => post<Venue>(`${o(org)}/venues`, { name, address }),
  updateVenue: (org: string, id: number, name: string, address?: string | null) => put<Venue>(`${o(org)}/venues/${id}`, { name, address }),
  deleteVenue: (org: string, id: number) => del(`${o(org)}/venues/${id}`),
  addCourt: (org: string, venueId: number, input: { name: string; surface?: string; sports: SportCode[] }) =>
    post<Court>(`${o(org)}/venues/${venueId}/courts`, input),
  updateCourt: (org: string, id: number, input: { name: string; surface?: string | null; sports: SportCode[] }) =>
    put<Court>(`${o(org)}/courts/${id}`, input),
  deleteCourt: (org: string, id: number) => del(`${o(org)}/courts/${id}`),
  setAvailability: (org: string, id: number, windows: { dayOfWeek: number; start: string; end: string }[]) =>
    put<Court>(`${o(org)}/courts/${id}/availability`, windows),
  addBlock: (org: string, id: number, startsAt: string, endsAt: string, reason?: string) =>
    post<Court>(`${o(org)}/courts/${id}/blocks`, { startsAt, endsAt, reason }),
  removeBlock: (org: string, id: number, blockId: number) => del<Court>(`${o(org)}/courts/${id}/blocks/${blockId}`),

  // Torneos
  tournaments: (org: string) => get<TournamentCard[]>(`${o(org)}/tournaments`),
  tournament: (org: string, id: number) => get<Tournament>(`${o(org)}/tournaments/${id}`),
  createTournament: (org: string, input: CreateTournamentInput) => post<Tournament>(`${o(org)}/tournaments`, input),
  updateTournament: (org: string, id: number, input: UpdateTournamentInput) => put<Tournament>(`${o(org)}/tournaments/${id}`, input),
  deleteTournament: (org: string, id: number) => del(`${o(org)}/tournaments/${id}`),
  schedule: (org: string, id: number, startDate: string) =>
    post<{ created: number; placed: number; unplaced: number }>(`${o(org)}/tournaments/${id}/schedule`, { startDate }),
  placePending: (org: string, id: number) =>
    post<{ created: number; placed: number; unplaced: number }>(`${o(org)}/tournaments/${id}/place-pending`),
  addTeam: (org: string, tournamentId: number, input: TeamInput) => post<Team>(`${o(org)}/tournaments/${tournamentId}/teams`, input),
  updateTeam: (org: string, teamId: number, input: TeamInput) => put<Team>(`${o(org)}/teams/${teamId}`, input),
  deleteTeam: (org: string, teamId: number) => del(`${o(org)}/teams/${teamId}`),
  addPlayer: (org: string, teamId: number, input: { name: string; number: number | null; document?: string | null }) =>
    post<Player>(`${o(org)}/teams/${teamId}/players`, input),
  updatePlayer: (org: string, id: number, input: { name: string; number: number | null; document?: string | null }) =>
    put<Player>(`${o(org)}/players/${id}`, input),
  deletePlayer: (org: string, id: number) => del(`${o(org)}/players/${id}`),

  // Partidos
  match: (org: string, id: number) => get<MatchDetail>(`${o(org)}/matches/${id}`),
  check: (org: string, id: number, courtId: number, startsAt: string) =>
    post<Conflict[]>(`${o(org)}/matches/${id}/check`, { courtId, startsAt, force: false }),
  place: (org: string, id: number, courtId: number, startsAt: string, force = false) =>
    put<MatchCard>(`${o(org)}/matches/${id}/place`, { courtId, startsAt, force }),
  unplace: (org: string, id: number) => del<MatchCard>(`${o(org)}/matches/${id}/place`),
  assignReferee: (org: string, id: number, refereeUserId: number | null) =>
    put<MatchCard>(`${o(org)}/matches/${id}/referee`, { refereeUserId }),
  cancel: (org: string, id: number, reason?: string) => post<MatchCard>(`${o(org)}/matches/${id}/cancel`, { reason }),
  restore: (org: string, id: number) => post<MatchCard>(`${o(org)}/matches/${id}/restore`),
  setResult: (org: string, id: number, input: ResultInput) => put<MatchDetail>(`${o(org)}/matches/${id}/result`, input),
  start: (org: string, id: number) => post<MatchDetail>(`${o(org)}/matches/${id}/start`),
  event: (org: string, id: number, type: string, teamId: number, playerId: number | null) =>
    post<MatchDetail>(`${o(org)}/matches/${id}/events`, { type, teamId, playerId }),
  point: (org: string, id: number, teamId: number) => post<MatchDetail>(`${o(org)}/matches/${id}/points`, { teamId }),
  nextPeriod: (org: string, id: number) => post<MatchDetail>(`${o(org)}/matches/${id}/period`),
  undo: (org: string, id: number) => post<MatchDetail>(`${o(org)}/matches/${id}/undo`),
  finish: (org: string, id: number, homePenalties?: number | null, awayPenalties?: number | null) =>
    post<MatchDetail>(`${o(org)}/matches/${id}/finish`, { homePenalties, awayPenalties }),
};
