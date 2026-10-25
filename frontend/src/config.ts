// Configuración global. VITE_API_URL apunta al backend (Render) en producción.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

/** Marca provisional: el nombre definitivo se decide al final y solo se cambia aquí. */
export const BRAND = {
  name: 'Torneos',
  tagline: 'Organiza torneos de cualquier deporte y síguelos en vivo.',
};

/** Credenciales públicas de la demo (las crea el backend al arrancar). */
export const DEMO = {
  email: 'demo@torneos.app',
  password: 'demo1234',
  pin: '246810',
};
