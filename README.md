# Brackit

Plataforma **SaaS de gestión de torneos** para ligas, clubes y empresas. Cada organización tiene su propio espacio, con sus torneos, sedes, canchas, horarios, equipos, jugadores, árbitros y una página pública donde todo se sigue **en vivo**.

## Qué hace

- **Multi-tenant de verdad:** cada organización ve y edita solo lo suyo. El aislamiento se valida en el servidor en cada petición: pertenecer a la organización y que el recurso sea de ella.
- **Roles:**
  - **Administrador:** todo.
  - **Coordinador:** torneos, calendario y resultados.
  - **Árbitro:** sus partidos, en vivo desde el celular.
  - Las invitaciones van por correo y se activan al registrarse.
- **Planes:**
  - **Gratis:** 1 torneo activo y 1 sede.
  - **Liga:** $150.000/mes, torneos ilimitados y hasta 5 sedes.
  - **Club:** $350.000/mes, todo ilimitado.
  - Los límites se aplican en el servidor. Los planes pagos se contratan por WhatsApp.
- **Escudos de los equipos:** cada equipo sube la foto de su escudo o arma uno con sus colores (6 estilos). Las imágenes se sirven con caché larga y se invalidan solas al cambiar.
- **Sedes y canchas:** cada cancha tiene sus deportes, su horario semanal y bloqueos puntuales (mantenimiento, clima).
- **Programación automática sin choques:** al generar el calendario, Brackit reparte los partidos en las canchas del torneo. Respeta:
  - el horario de cada cancha;
  - lo que ya ocupan otros torneos de la organización;
  - la duración de cada deporte;
  - el descanso mínimo de cada equipo.

  Al mover un partido a mano, avisa los choques antes de guardar.
- **7 deportes con sus reglas:** fútbol, fútbol sala, balonmano, baloncesto, voleibol, tenis y pádel.
  - Puntos de tabla y desempates propios de cada deporte.
  - Prórrogas y penales.
  - Sets con su regla de cierre.
  - Tercer puesto.
  - La fase final se arma y se programa sola al terminar los grupos.
- **En vivo por WebSocket:** marcador, reloj, minuto a minuto, tabla, llaves y panel de la organización.
- **Modo claro, oscuro o automático** en el panel. La consola del árbitro siempre es oscura, para leerse al sol.

## Arquitectura

```
frontend/  React 19 + Vite + TypeScript + React Router + STOMP         →  Cloudflare Pages
backend/   Java 21 + Spring Boot 4 + Spring Security (JWT) + JPA + Flyway  →  Render (Docker)
           PostgreSQL en producción (Neon) · H2 en desarrollo y pruebas
```

| Paquete del backend | Responsabilidad |
|---|---|
| `engine` | Lógica pura y probada: calendario todos contra todos, llaves, tablas con desempates, **programador de canchas** y **verificador de choques**. |
| `service` | Organizaciones y miembros, sedes y canchas, torneos, programación, partidos en vivo y vistas del panel. `OrgAccess` es el guardián de cada organización. |
| `security` | JWT (solo identifica a la persona; el rol se resuelve por organización) y límite de intentos de ingreso. |
| `demo` | Tres organizaciones de ejemplo con historial jugado y un simulador que juega partidos en vivo. |

### Pruebas

```bash
cd backend && ./mvnw test     # 54 pruebas: motor, programador, aislamiento entre organizaciones, roles, planes y flujos completos
cd frontend && npm test       # reloj de juego
```

## Correr en local

Requisitos: Java 21 y Node 20 o superior. No hace falta instalar una base de datos.

```bash
cd backend && ./mvnw spring-boot:run     # http://localhost:8080 (H2 en ./data, crea la demo)
cd frontend && npm install && npm run dev # http://localhost:5173
```

Cuentas de la demo (contraseña `demo1234`):
- `demo@brackit.app`: administrador de las tres organizaciones.
- `coordinadora@brackit.app`: coordinadora de la Liga Barrial.
- `arbitro@brackit.app`: árbitro.

## Despliegue gratuito

1. **Base de datos:** Neon (PostgreSQL).
2. **API:** Render, con el blueprint `render.yaml`. Variables:
   - `DATABASE_URL=jdbc:postgresql://<host>/<base>?sslmode=require`
   - `DATABASE_USERNAME`
   - `DATABASE_PASSWORD`
3. **Frontend:** Cloudflare Pages, conectando el repositorio:
   - Directorio raíz: `frontend`
   - Comando de build: `npm run build`
   - Carpeta de salida: `dist`
   - Variables: `VITE_API_URL=<URL de Render>` y `NODE_VERSION=22`

   Queda en `https://brackit.pages.dev`. Las rutas de la app funcionan al recargar porque Pages sirve la SPA cuando no hay `404.html`.

La página pública de cada organización queda en `/l/<organización>`, por ejemplo `/l/liga-barrial`.

## Créditos

Fotos CC0 de Openverse: ver [CREDITS.md](CREDITS.md).
