# Brackit

Plataforma para organizar torneos de **cualquier deporte** y seguirlos **en vivo**: el calendario se genera solo, el árbitro registra el marcador desde el celular y el público ve el resultado, la tabla, las llaves y los goleadores actualizarse al instante.

## Qué hace

- **7 deportes con sus propias reglas:** fútbol, fútbol sala, balonmano, baloncesto, voleibol, tenis y pádel.
  - **Goles:** empate posible en liga y penales en eliminación directa.
  - **Baloncesto:** canastas de 1, 2 y 3, sin empates; la prórroga dura 5 minutos.
  - **Sets:** en voleibol se juega a 25 y el quinto set a 15, siempre con 2 de diferencia. En tenis y pádel el set va a 6 juegos con tie-break 7-6. En voleibol un 3-2 reparte 2 y 1 puntos.
- **3 formatos:**
  - Liga, a una o dos vueltas.
  - Eliminación directa con siembra estándar; si los equipos no completan una potencia de 2, los mejores pasan directo.
  - Grupos y fase final: los cruces se arman solos al terminar el último partido de grupos.
- **Tabla de posiciones con los desempates de cada deporte:** diferencia, a favor, cocientes de sets y puntos, y enfrentamiento directo como mini tabla entre los empatados.
- **Marcador en vivo por WebSocket (STOMP):** marcador, reloj de juego, línea de tiempo, tabla y goleadores sin recargar la página.
- **Roles:**
  - El **organizador** tiene cuenta.
  - El **árbitro** entra con el código del torneo y un PIN de 6 dígitos, y su token solo sirve para ese torneo.
  - El **público** no necesita registrarse.
- **Demo viva:** el backend crea un torneo por deporte con historial jugado y simula partidos en vivo para que el tiempo real se vea sin hacer nada.

## Arquitectura

```
frontend/  React 19 + Vite + TypeScript + React Router + @stomp/stompjs   →  GitHub Pages
backend/   Java 21 + Spring Boot 4 + Spring Security (JWT) + JPA + Flyway  →  Render (Docker)
           PostgreSQL en producción (Neon) · H2 en desarrollo y pruebas
```

### Backend (`backend/src/main/java/com/duangomez/torneos`)

| Paquete | Responsabilidad |
|---|---|
| `sport` | Catálogo de deportes y reglas: puntos de tabla, periodos y cierre de sets. |
| `engine` | Lógica pura y probada: calendario todos contra todos (método del círculo), llaves con byes y cruces de grupos, y tabla con desempates. |
| `service` | Casos de uso: torneos, partidos en vivo, avance de llaves y campeón, y publicación en vivo **después del commit**. |
| `security` | JWT para organizador y árbitro, y límite de 5 intentos fallidos en 15 minutos para PIN y contraseña. |
| `web` | Controladores REST, DTOs y manejo de errores en español. |
| `demo` | Datos de ejemplo y simulador de partidos (usa las mismas reglas que un árbitro). |

Otros detalles:
- **Bloqueo optimista** en los partidos: dos árbitros no se pisan el marcador.
- El canal WebSocket es **solo de lectura**: los cambios entran por REST con permisos, y se rechaza cualquier `SEND` de un cliente.

### Pruebas

```bash
cd backend && ./mvnw test     # 43 pruebas: motor, reglas por deporte, flujos completos y permisos
cd frontend && npm test       # reloj de juego (fútbol, baloncesto, sets)
```

## Correr en local

Requisitos: Java 21 y Node 20 o superior. No hace falta instalar una base de datos.

```bash
cd backend && ./mvnw spring-boot:run     # http://localhost:8080 (H2 en ./data, crea la demo)
cd frontend && npm install && npm run dev # http://localhost:5173
```

Accesos de la demo:
- **Organizador:** `demo@brackit.app` / `demo1234`
- **PIN de árbitro de todos los torneos demo:** `246810`

## Despliegue (todo en planes gratuitos)

1. **Base de datos (Neon):** crea un proyecto y copia el host, el usuario y la contraseña.
2. **API (Render):** crea un servicio nuevo desde el repositorio; `render.yaml` ya define todo. Completa estas variables:
   - `DATABASE_URL=jdbc:postgresql://<host>/<base>?sslmode=require`
   - `DATABASE_USERNAME`
   - `DATABASE_PASSWORD`
   - `CORS_ORIGINS` (el dominio de GitHub Pages)
3. **Frontend (GitHub Pages):** en el repositorio, crea la variable `API_URL` con la URL de Render y activa Pages con la fuente "GitHub Actions". Cada push a `master` publica.

El plan gratuito de Render suspende el servicio sin uso. La primera visita puede tardar cerca de un minuto, y la interfaz lo avisa con un mensaje.

## Créditos

Fotos CC0 de Openverse: ver [CREDITS.md](CREDITS.md).
