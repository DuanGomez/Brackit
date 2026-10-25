import type { SportCode } from '../api/types';

/** Íconos de línea propios (24×24, trazo actual) para no depender de librerías ni emojis. */
const PATHS: Record<string, string> = {
  FUTBOL:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.2 3.4 2.5-1.3 4h-4.2l-1.3-4L12 7.2Zm0-4.2v4.2m3.4 2.5 4.1-1.3m-5.4 5.3 2.5 3.4m-6.8-3.4-2.5 3.4m1.3-7.4-4.1-1.3',
  FUTBOL_SALA: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Zm-9 4h3m12 0h3M12 3v5m0 8v5',
  BALONCESTO:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3v18M5.6 5.6c2.8 2.4 2.8 10.4 0 12.8M18.4 5.6c-2.8 2.4-2.8 10.4 0 12.8',
  VOLEIBOL:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c-1 4 0 7 3 9m-3-9c4 .5 6.6 3 7.8 6.2M12 12c-3.6 1.6-6.5 1.4-8.6-.6M12 12c.4 3.8 2.4 6.4 5.4 7.5M12 12c-2.2 3-5 4.4-7.8 4.2',
  TENIS: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM5.2 6.2c3.6 2.8 3.6 8.8 0 11.6M18.8 6.2c-3.6 2.8-3.6 8.8 0 11.6',
  PADEL: 'M9.5 3.5a6 6 0 0 1 8.5 8.5l-3 3a4 4 0 0 1-5.6 0l-.4-.4a4 4 0 0 1 0-5.6l.5-.5M9 15l-5.5 5.5M11 7.5h.01M14 7.5h.01M12.5 10.5h.01',
  BALONMANO: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-7 6 7 3 7-3M12 12v9M7.5 19l4.5-7 4.5 7',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  bracket: 'M4 5h5v4H4zM4 15h5v4H4zM9 7h3v10H9m3-5h3m0-2h5v4h-5z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 9v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  whistle: 'M3 13a6 6 0 1 0 12 0V9h6V6H9a6 6 0 0 0-6 7Zm6 0h.01',
  pin: 'M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm10 3-5-5',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  play: 'M7 4v16l13-8z',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  logout: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',
  check: 'M5 12l5 5 9-10',
  card: 'M7 3h10v18H7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  live: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8.5 15.5a5 5 0 0 1 0-7m7 0a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8m12.8 0a9 9 0 0 1 0 12.8',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
};

export type IconName = SportCode | keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
