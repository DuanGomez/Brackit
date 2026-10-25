// Configuración global. VITE_API_URL apunta al backend (Render) en producción.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

/** Marca del producto (nombre y lema usados en toda la interfaz). */
export const BRAND = {
  name: 'Brackit',
  tagline: 'Gestión de torneos para ligas, clubes y empresas',
};

/** Ventas por WhatsApp: los planes pagos se contratan hablando directamente con Duan. */
export const WHATSAPP_NUMBER = '573232922041';

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export interface PlanInfo {
  id: 'FREE' | 'LIGA' | 'CLUB';
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  cta: string;
  /** Sin mensaje = se registra gratis; con mensaje = abre WhatsApp. */
  whatsapp?: string;
  highlight?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    id: 'FREE',
    name: 'Gratis',
    price: '$0',
    period: '',
    blurb: 'Para probar con tu primer torneo.',
    features: ['1 torneo activo', '1 sede', 'Página pública en vivo', 'Árbitros ilimitados'],
    cta: 'Empezar gratis',
  },
  {
    id: 'LIGA',
    name: 'Liga',
    price: '$150.000',
    period: 'COP / mes',
    blurb: 'Para ligas con varias categorías.',
    features: ['Torneos ilimitados', 'Hasta 5 sedes', 'Coordinadores y árbitros', 'Tu logo y colores', 'Soporte por WhatsApp'],
    cta: 'Elegir Liga',
    whatsapp: 'Hola Duan, quiero el plan Liga de Brackit ($150.000 al mes) para mi organización.',
    highlight: true,
  },
  {
    id: 'CLUB',
    name: 'Club',
    price: '$350.000',
    period: 'COP / mes',
    blurb: 'Para complejos deportivos y federaciones.',
    features: ['Todo lo del plan Liga', 'Sedes ilimitadas', 'Dominio propio', 'Varios administradores', 'Acompañamiento en el montaje'],
    cta: 'Hablar por WhatsApp',
    whatsapp: 'Hola Duan, me interesa el plan Club de Brackit ($350.000 al mes) para mi complejo o federación.',
  },
];

export function planLabel(id: string) {
  return PLANS.find((p) => p.id === id)?.name ?? id;
}

/** Credenciales públicas de la demo (las crea el backend al arrancar). */
export const DEMO = {
  email: 'demo@brackit.app',
  refereeEmail: 'arbitro@brackit.app',
  password: 'demo1234',
};
