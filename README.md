# TropelCare Control Room — Pizza Protocol

Consola operativa en **React + TypeScript** para gestionar la colonia de Tropeles
de Tuckersoft: dashboard, atlas paginado, feed infinito de señales, atención de
señales y un motor de *scrollytelling* por sector.

Toda la data proviene del backend determinístico (**TropelCare Control API**). No
hay datos hardcodeados ni paginación simulada en cliente.

---

## Integrantes

| Nombre | Código |
|:-------|:-------|
| _Integrante A_ | _código_ |
| _Integrante B_ | _código_ |
| _Integrante C_ | _código_ |

> Completa esta tabla antes de la entrega.

---

## Stack técnico

- **React 18** + componentes funcionales y hooks (`.tsx`).
- **TypeScript estricto** (`strict: true`, sin `any` para respuestas de API).
- **Vite** como build tool y dev server.
- **React Router 6** para el ruteo SPA.
- **Tailwind CSS** para todo el estilado (sin librerías de UI).
- **Fetch API** nativa para el cliente HTTP (sin React Query / SWR / Axios).

---

## Instalación y comandos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la URL del backend (ver más abajo)
cp .env.example .env
#   y editar VITE_API_BASE_URL

# 3. Desarrollo
npm run dev          # http://localhost:5173

# 4. Verificaciones requeridas
npm run typecheck    # 0 errores de TypeScript
npm run build        # build de producción en dist/

# 5. Previsualizar el build
npm run preview
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|:---------|:---------:|:------------|
| `VITE_API_BASE_URL` | ✅ | URL base de la API **incluyendo** el prefijo `/api/v1`. Ej: `https://<backend>/api/v1` |

La URL del backend se inyecta exclusivamente por esta variable; no hay endpoints
hardcodeados en el código.

---

## Deploy

- **Link del deploy:** _<pega aquí la URL del deploy>_

La app es una SPA y abre correctamente en **cualquier ruta** (deep links). Se
incluye configuración lista para:

- **Vercel** → `vercel.json` (rewrites a `/index.html`).
- **Netlify** → `public/_redirects` (`/* /index.html 200`).

Recuerda definir `VITE_API_BASE_URL` en el panel del proveedor de hosting.

---

## Rutas

| Ruta | Descripción | Protegida |
|:-----|:------------|:---------:|
| `/login` | Inicio de sesión por equipo | No |
| `/dashboard` | KPIs del workspace | ✅ |
| `/tropels` | Atlas paginado con filtros sincronizados a la URL | ✅ |
| `/signals/feed` | Feed infinito cursor-based + detalle de señal | ✅ |
| `/sectors` | Listado de sectores | ✅ |
| `/sectors/:id/story` | Sector Story Engine (scrollytelling) | ✅ |

Las rutas protegidas usan un *guard* (`ProtectedRoute`) que redirige a `/login`
si no hay sesión, conservando el destino original.

---

## Cómo se cumple cada checkpoint

### Checkpoint 1 — Encender la consola
- Login con `teamCode`, `email`, `password` (`POST /auth/login`).
- JWT y usuario persistidos en `localStorage`; **restauración de sesión** al
  recargar validando contra `GET /auth/me`.
- Ruta privada con redirección; logout que limpia el estado.
- Dashboard real (`GET /dashboard/summary`) con KPIs y desglose por severidad,
  incluyendo estados de **loading / error / vacío**.

### Checkpoint 2 — Atlas de Tropeles
- Paginación **real del servidor** (`page`, `size` 10/20/50).
- Filtros combinables (`species`, `vitalState`, `sectorId`, `q`) + ordenamiento
  (`name,asc` · `updatedAt,desc` · `chaosIndex,desc`).
- **Todo el estado vive en la URL** (`useSearchParams`); recargar o compartir la
  URL restaura filtros, página y orden.
- **Protección contra respuestas obsoletas**: cada petición lleva un número de
  secuencia + `AbortController`; sólo se aplica la respuesta más reciente.
- Loading / error / vacío sin *layout shift* (skeletons de altura fija).

### Checkpoint 3 — Feed infinito
- Infinite scroll **cursor-based** (`GET /signals/feed`) con `IntersectionObserver`
  (sin botón "Cargar más").
- **Deduplicación por ID** (`Set`), **una sola petición en vuelo** (guard de
  estado), cancelación/descarte de peticiones obsoletas al cambiar filtros
  (token monotónico + `AbortController`).
- Filtros persistidos en la URL.
- **Fin de lista** correcto (`hasMore`) y **recuperación de error** sin perder las
  páginas ya cargadas (botón reintentar que conserva el estado).

### Checkpoint 4 — Atender una señal
- Detalle en **modal** abierto desde el feed; el feed permanece montado, por lo
  que **no se pierde la posición de scroll**. El detalle es deep-linkable
  (`?signal=<id>`).
- Cambio de estado a `PROCESANDO` / `ATENDIDA` (`PATCH /signals/:id/status`).
- Botón **deshabilitado durante la petición**, **confirmación** de éxito y
  **error accionable** que conserva el estado anterior.
- El nuevo estado se **refleja en el feed** al volver (actualización en sitio por
  ID).

### Checkpoint 5 — Sector Story Engine (reto hard)
- `/sectors/:id/story` consume **sólo** `GET /sectors/:id/story` y muestra el
  sector con **exactamente 8 etapas ordenadas**.
- **Visual persistente** (fondo por clima + glow/HUD por `colorToken`, métricas y
  evento dominante) que cambia con la etapa activa.
- **CSS Scroll-driven Animations** (`animation-timeline: scroll()/view()`) cuando
  el navegador las soporta; **fallback** con `IntersectionObserver` + toggle de
  clases (`.is-active`) cuando no.
- **View Transition API** para la transición resumen ↔ historia, con **fallback**
  de *fade* (`.vt-fade`) cuando no está disponible.
- **`prefers-reduced-motion`**: desactiva animaciones/transiciones y muestra todo
  el contenido de forma estática.
- **Navegación por teclado** completa (flechas, `PageUp/Down`, `Home`, `End`,
  `Tab`) sin perder contenido — cada etapa mantiene su narrativa y métricas en el
  DOM.
- Comportamiento **equivalente en desktop y mobile** (HUD lateral en desktop,
  barra compacta en mobile).

---

## Decisiones técnicas importantes

- **Sin librerías de cache de servidor.** El control de peticiones (abort,
  descarte de respuestas obsoletas, dedup, single-flight) se implementa a mano con
  `AbortController` y refs de secuencia/token, como exige el enunciado.
- **Estado en la URL como fuente de verdad** para Tropeles y Feed: hace que el
  estado sea compartible y sobreviva a recargas sin estado duplicado.
- **DTOs estrictos** en `src/api/types.ts`; el cliente (`src/api/client.ts`)
  normaliza errores en una clase `ApiError` tipada y centraliza el manejo de 401.
- **Scrollytelling con CSS-first**: las animaciones por scroll son nativas (CSS
  scroll-driven) cuando existen; el JS sólo mantiene el "estado activo" para el
  HUD numérico y provee el fallback, de modo que la experiencia degrada con
  elegancia.
- **Visual 100% generado con CSS y data**: `assetKey`/`colorToken` se traducen a
  gradientes y acentos deterministas; no se usa video, GIF ni canvas pregrabado.

---

## Estructura del proyecto

```txt
src/
  api/         # client.ts (fetch + ApiError), endpoints.ts, types.ts (DTOs)
  auth/        # AuthContext + useAuth (sesión, restore, logout)
  components/  # Layout, ProtectedRoute, Modal, SignalDetail, States, Badge…
  hooks/       # useInfiniteSignals, useSectors, useDebounce,
               # useReducedMotion, useScrollDrivenSupport
  pages/       # Login, Dashboard, Tropels, SignalsFeed, Sectors, SectorStory
  ui/          # theme.ts (mapas de color/etiquetas)
  utils/       # errors.ts, viewTransition.ts
```
