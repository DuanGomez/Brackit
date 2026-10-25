import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { LiveUpdate, MatchDetail, Team, Tournament } from '../api/types';
import { syncServerTime } from '../lib/clock';
import { useTopic } from './live';

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Torneo público siempre al día: carga inicial por REST y luego cambios por WebSocket.
 * Un mensaje "match" actualiza el partido, la tabla y los goleadores; "refresh" recarga todo.
 */
export function useTournament(slug: string | undefined, loader?: () => Promise<Tournament>) {
  const [state, setState] = useState<State<Tournament>>({ data: null, error: null, loading: true });

  const load = useCallback(async () => {
    if (!slug && !loader) return;
    try {
      const data = await (loader ? loader() : api.publicTournament(slug!));
      syncServerTime(data.serverTime);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof ApiError ? e.message : 'No se pudo cargar el torneo' }));
    }
  }, [slug]);

  useEffect(() => {
    setState({ data: null, error: null, loading: true });
    load();
  }, [load]);

  const topicSlug = state.data?.slug ?? slug;
  useTopic<LiveUpdate>(topicSlug ? `/topic/tournaments/${topicSlug}` : null, (update) => {
    syncServerTime(update.serverTime);
    if (update.type === 'refresh' || !update.match) {
      load();
      return;
    }
    setState((s) => {
      if (!s.data) return s;
      const exists = s.data.matches.some((m) => m.id === update.match!.id);
      if (!exists) {
        load();
        return s;
      }
      return {
        ...s,
        data: {
          ...s.data,
          matches: s.data.matches.map((m) => (m.id === update.match!.id ? update.match! : m)),
          standings: update.standings ?? s.data.standings,
          scorers: update.scorers ?? s.data.scorers,
          status: update.status,
          championId: update.championId,
        },
      };
    });
  }, load);

  const teams = useMemo(() => new Map<number, Team>((state.data?.teams ?? []).map((t) => [t.id, t])), [state.data?.teams]);
  return { ...state, teams, reload: load, setData: (data: Tournament) => setState({ data, error: null, loading: false }) };
}

/** Detalle de un partido con su línea de tiempo, en vivo. */
export function useMatch(id: number) {
  const [state, setState] = useState<State<MatchDetail>>({ data: null, error: null, loading: true });

  const load = useCallback(async () => {
    try {
      const data = await api.publicMatch(id);
      syncServerTime(data.serverTime);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof ApiError ? e.message : 'No se pudo cargar el partido' }));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useTopic<MatchDetail>(Number.isFinite(id) ? `/topic/matches/${id}` : null, (detail) => {
    syncServerTime(detail.serverTime);
    setState({ data: detail, error: null, loading: false });
  }, load);

  return { ...state, reload: load, setData: (data: MatchDetail) => setState({ data, error: null, loading: false }) };
}
