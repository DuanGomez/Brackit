import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import type { LiveUpdate, MatchDetail, Team, Tournament } from '../api/types';
import { syncServerTime } from '../lib/clock';
import { useTopic } from './live';

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (data: T) => void;
}

/** Carga datos con un loader; {@code key} cambia = vuelve a cargar desde cero. */
export function useLoad<T>(loader: () => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    try {
      const data = await loaderRef.current();
      const time = (data as { serverTime?: string } | null)?.serverTime;
      syncServerTime(time);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof ApiError ? e.message : 'No se pudo cargar la información' }));
    }
  }, []);

  useEffect(() => {
    setState({ data: null, error: null, loading: true });
    reload();
  }, [key, reload]);

  return { ...state, reload, setData: (data: T) => setState({ data, error: null, loading: false }) };
}

/**
 * Torneo siempre al día: carga por REST y cambios por WebSocket. Un mensaje "match"
 * actualiza el partido, la tabla y los goleadores; "refresh" vuelve a cargar todo.
 */
export function useTournamentLive(loader: () => Promise<Tournament>, key: string) {
  const state = useLoad(loader, key);
  const id = state.data?.id;

  useTopic<LiveUpdate>(id ? `/topic/tournaments/${id}` : null, (update) => {
    syncServerTime(update.serverTime);
    const current = state.data;
    if (!current || update.type === 'refresh' || !update.match || !current.matches.some((m) => m.id === update.match!.id)) {
      state.reload();
      return;
    }
    state.setData({
      ...current,
      matches: current.matches.map((m) => (m.id === update.match!.id ? update.match! : m)),
      standings: update.standings ?? current.standings,
      scorers: update.scorers ?? current.scorers,
      status: update.status,
      championId: update.championId,
    });
  }, state.reload);

  const teams = useMemo(() => new Map<number, Team>((state.data?.teams ?? []).map((t) => [t.id, t])), [state.data?.teams]);
  return { ...state, teams };
}

/** Detalle de un partido con su línea de tiempo, en vivo. */
export function useMatchLive(loader: () => Promise<MatchDetail>, id: number) {
  const state = useLoad(loader, `match-${id}`);
  useTopic<MatchDetail>(Number.isFinite(id) ? `/topic/matches/${id}` : null, (detail) => {
    syncServerTime(detail.serverTime);
    state.setData(detail);
  }, state.reload);
  return state;
}

/** Recarga (con una pequeña espera para agrupar ráfagas) cuando algo cambia en la organización. */
export function useOrgChanges(slug: string | undefined, onChange: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  useTopic(slug ? `/topic/orgs/${slug}` : null, () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => callback.current(), 600);
  }, () => callback.current());
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
}
