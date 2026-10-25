import { useEffect, useSyncExternalStore } from 'react';

/** Apariencia del panel: claro, oscuro o automático (según el sistema). Se recuerda por navegador. */
export type ThemeChoice = 'light' | 'dark' | 'auto';

const KEY = 'brackit.theme';
const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

let current: ThemeChoice = read();

export function setTheme(choice: ThemeChoice) {
  current = choice;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* sin almacenamiento: dura lo que la pestaña */
  }
  listeners.forEach((l) => l());
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** Aplica el tema elegido al documento mientras el componente esté montado (solo el panel lo usa). */
export function useApplyTheme(enabled: boolean) {
  const choice = useThemeChoice();
  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      root.removeAttribute('data-theme');
      return;
    }
    const apply = () => root.setAttribute('data-theme', choice === 'auto' ? (systemDark() ? 'dark' : 'light') : choice);
    apply();
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', apply);
    return () => {
      media?.removeEventListener('change', apply);
      root.removeAttribute('data-theme');
    };
  }, [choice, enabled]);
}
