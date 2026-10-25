import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { setTheme, useThemeChoice, type ThemeChoice } from './theme';

const OPTIONS: { id: ThemeChoice; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Claro', icon: 'sun' },
  { id: 'dark', label: 'Oscuro', icon: 'moon' },
  { id: 'auto', label: 'Auto', icon: 'gear' },
];

/** Selector Claro / Oscuro / Auto con iconos. */
export function ThemeSwitch({ withLabel = true }: { withLabel?: boolean }) {
  const choice = useThemeChoice();
  return (
    <div className="theme-block">
      {withLabel && <span className="theme-label">Apariencia</span>}
      <div className="theme-switch" role="radiogroup" aria-label="Apariencia">
        {OPTIONS.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={choice === o.id} className={choice === o.id ? 'active' : ''} onClick={() => setTheme(o.id)}>
            <Icon name={o.icon} size={14} />{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tema que se ve ahora mismo (resuelve "Auto"). */
function useShownTheme() {
  const choice = useThemeChoice();
  const [shown, setShown] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const read = () => setShown(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [choice]);
  return shown;
}

/** Botón de un toque: cambia entre claro y oscuro. */
export function ThemeToggle({ className = 'btn btn-secondary icon-btn' }: { className?: string }) {
  const shown = useShownTheme();
  const next = shown === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className={className} onClick={() => setTheme(next)}
      aria-label={next === 'dark' ? 'Activar modo oscuro' : 'Activar modo claro'} title={next === 'dark' ? 'Modo oscuro' : 'Modo claro'}>
      <Icon name={next === 'dark' ? 'moon' : 'sun'} size={17} />
    </button>
  );
}
