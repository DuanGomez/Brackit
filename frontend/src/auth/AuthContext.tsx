import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, readSession, setUnauthorizedHandler, writeSession, type Session } from '../api/client';
import type { AuthResponse } from '../api/types';

interface AuthValue {
  session: Session | null;
  isOrganizer: boolean;
  isReferee: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  refereeLogin: (code: string, pin: string) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  const save = useCallback((res: AuthResponse) => {
    const next: Session = { token: res.token, role: res.role, user: res.user, tournament: res.tournament };
    writeSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo<AuthValue>(() => ({
    session,
    isOrganizer: session?.role === 'ORGANIZER',
    isReferee: session?.role === 'REFEREE',
    login: async (email, password) => save(await api.login(email, password)),
    register: async (name, email, password) => save(await api.register(name, email, password)),
    refereeLogin: async (code, pin) => {
      const res = await api.refereeLogin(code, pin);
      save(res);
      return res;
    },
    logout,
  }), [session, save, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
