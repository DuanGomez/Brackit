// Configuración global. VITE_API_URL apunta al backend (Render) en producción.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

/** Marca del producto (nombre y lema usados en toda la interfaz). */
export const BRAND = {
  name: 'Brackit',
  tagline: 'Organiza torneos de cualquier deporte y síguelos en vivo.',
};

/** Credenciales públicas de la demo (las crea el backend al arrancar). */
export const DEMO = {
  email: 'demo@brackit.app',
  password: 'demo1234',
  pin: '246810',
};
