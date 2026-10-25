import type { SportCode } from '../api/types';

/** Íconos de línea propios (24×24, trazo actual) para no depender de librerías ni emojis. */
const PATHS: Record<string, string> = {
  FUTBOL: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.2 3.4 2.5-1.3 4h-4.2l-1.3-4L12 7.2Zm0-4.2v4.2m3.4 2.5 4.1-1.3m-5.4 5.3 2.5 3.4m-6.8-3.4-2.5 3.4m1.3-7.4-4.1-1.3',
  FUTBOL_SALA: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Zm-9 4h3m12 0h3M12 3v5m0 8v5',
  BALONCESTO: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3v18M5.6 5.6c2.8 2.4 2.8 10.4 0 12.8M18.4 5.6c-2.8 2.4-2.8 10.4 0 12.8',
  VOLEIBOL: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c-1 4 0 7 3 9m-3-9c4 .5 6.6 3 7.8 6.2M12 12c-3.6 1.6-6.5 1.4-8.6-.6M12 12c.4 3.8 2.4 6.4 5.4 7.5M12 12c-2.2 3-5 4.4-7.8 4.2',
  TENIS: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM5.2 6.2c3.6 2.8 3.6 8.8 0 11.6M18.8 6.2c-3.6 2.8-3.6 8.8 0 11.6',
  PADEL: 'M9.5 3.5a6 6 0 0 1 8.5 8.5l-3 3a4 4 0 0 1-5.6 0l-.4-.4a4 4 0 0 1 0-5.6l.5-.5M9 15l-5.5 5.5M11 7.5h.01M14 7.5h.01M12.5 10.5h.01',
  BALONMANO: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-7 6 7 3 7-3M12 12v9M7.5 19l4.5-7 4.5 7',
  home: 'M4 11l8-7 8 7v9H4z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4',
  calendar: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
  court: 'M3 5h18v14H3zM12 5v14M3 9h3v6H3M21 9h-3v6h3M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  whistle: 'M3 13a6 6 0 1 0 12 0V9h6V6H9a6 6 0 0 0-6 7Zm6 0h.01',
  members: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  bracket: 'M4 5h5v4H4zM4 15h5v4H4zM9 7h3v10H9m3-5h3m0-2h5v4h-5z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm10 3-5-5',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  updown: 'M8 9l4-4 4 4M8 15l4 4 4-4',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  play: 'M7 4v16l13-8z',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
  logout: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',
  pin: 'M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  alert: 'M12 4 2.5 20h19L12 4Zm0 6v4m0 3h.01',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  whatsapp: 'M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Zm5-11.5c0 3.5 3 6.5 6.5 6.5l1.2-1.5-2-1-1 .8c-1.1-.4-2.2-1.5-2.6-2.6l.8-1-1-2L9.5 8.5H9Z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
};

export type IconName = SportCode | keyof typeof PATHS;

export function Icon({ name, size = 18, className, strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Logo de Brackit: cuadro con degradado azul a verde y una llave de torneo. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size * 0.29, background: 'linear-gradient(135deg,#1F5BFF,#18C46A)',
      display: 'inline-grid', placeItems: 'center', flex: 'none' }}>
      <svg width={size * 0.57} height={size * 0.57} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h4v5H4M4 14h4v5H4M8 7.5h3v9H8M11 12h4M15 9.5h5v5h-5" />
      </svg>
    </span>
  );
}

/** Escudo de la organización: iniciales sobre su color. */
export function OrgBadge({ shortName, color, size = 36 }: { shortName: string; color: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size * 0.28, background: color, color: '#fff', display: 'inline-grid',
      placeItems: 'center', fontWeight: 700, fontSize: size * 0.36, flex: 'none', letterSpacing: '-0.02em' }}>
      {shortName}
    </span>
  );
}
