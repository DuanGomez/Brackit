import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, readSession, setUnauthorizedHandler, writeSession, type Session } from '../api/client';
import type { AuthResponse, MembershipRef } from '../api/types';

interface AuthValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  register: (name: string, email: string, password: string) => Promise<Session>;
  /** Vuelve a leer las organizaciones (tras crear una o aceptar una invitación). */
  refresh: () => Promise<Session | null>;
  logout: () => void;
  membership: (orgSlug: string | undefined) => MembershipRef | undefined;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  const save = useCallback((res: AuthResponse) => {
    const next: Session = { token: res.token, user: res.user, memberships: res.memberships };
    writeSession(next);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const refresh = useCallback(async () => {
    const current = readSession();
    if (!current) return null;
    const info = await api.me();
    const next: Session = { ...current, user: info.user, memberships: info.memberships };
    writeSession(next);
    setSession(next);
    return next;
  }, []);

  const value = useMemo<AuthValue>(() => ({
    session,
    login: async (email, password) => save(await api.login(email, password)),
    register: async (name, email, password) => save(await api.register(name, email, password)),
    refresh,
    logout,
    membership: (slug) => session?.memberships.find((m) => m.slug === slug),
  }), [session, save, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
