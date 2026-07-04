# CLAUDE.md — JASTROW (Next.js + Supabase)

Guía de referencia para trabajar en este proyecto. Léelo antes de tocar código.

## Qué es esto

Reescritura de `../index_10.html` — un sistema de gestión de zafra de caña de azúcar
("JASTROW — Sistema de Rendimientos", Jastrow Inver Group S.A.) que hoy vive como un único
archivo HTML/JS vanilla de 3278 líneas. Ese archivo sigue siendo la **especificación viva** de
toda la lógica de negocio (fórmulas, umbrales, reglas de reconciliación y alertas): antes de
portar cualquier cálculo, léelo — no reinventes la fórmula.

Ver `ROADMAP.md` para el plan de milestones y las decisiones pendientes.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript, deploy en Vercel.
- **Supabase**: Postgres relacional (reemplaza la tabla KV `jw_storage` del HTML legacy),
  Supabase Auth (reemplaza la tabla de usuarios en texto plano), Row Level Security, Realtime,
  Storage (imágenes de facturas).
- **UI**: Tailwind CSS v4 + shadcn/ui (base Radix, preset "nova") + `@tabler/icons-react`.
- **Datos/mutaciones**: Server Components + Server Actions (`'use server'`) para todo el CRUD.
  TanStack Query + Supabase Realtime solo en las vistas que necesitan sync en vivo entre
  usuarios (Viajes/Listado, Reconciliación, Alertas).
- **Estado de UI efímero** (tab activo, filtros, modal abierto/cerrado): Zustand
  (`store/ui-store.ts`).
- **Formularios**: los formularios CRUD simples (lotes, facturas, usuarios) usan `useActionState`
  + `<form action={serverAction}>` (patrón oficial de Next.js para Server Actions) con
  validación zod dentro de la Server Action — sin react-hook-form de por medio, es más simple
  para un form que solo hace submit-and-revalidate. Reservá react-hook-form + zod (con
  `@hookform/resolvers`) para formularios con arrays dinámicos de campos que necesitan
  validar/editar en el cliente antes de enviar (insumos de un trabajo, items de una factura o
  receta). El registro `form` de shadcn no está disponible en esta versión del CLI — armar los
  campos a mano con `Label`/`Input`/`Select` de `components/ui/`.
- **Charts**: Recharts.
- **Excel import**: `xlsx` (SheetJS) como dependencia real — nada de `<script>` cargado desde
  un CDN en runtime como hacía el HTML legacy.

## ⚠️ Next.js 16: cosas que cambiaron respecto a versiones anteriores

Este proyecto corre Next.js 16.x. Si algo de lo que sabés sobre Next.js no coincide con el
comportamiento real, **la fuente de verdad es `node_modules/next/dist/docs/`**, no tu
entrenamiento previo. Puntos ya verificados que importan para este proyecto:

- **`middleware.ts` ya no existe — ahora es `proxy.ts`.** Misma función, mismo `NextRequest`/
  `NextResponse`, distinto nombre de archivo y de export (`export function proxy(...)` en vez
  de `export function middleware(...)`). El refresh de sesión de Supabase vive en
  `proxy.ts` en la raíz del proyecto.
- **Cache Components (`cacheComponents: true` en `next.config.ts`) está deshabilitado** en este
  proyecto (`next.config.ts` no lo activa). Esto significa que aplica el modelo de caching
  "anterior": `fetch` **no cachea por defecto** (no hace falta `cache: 'no-store'` explícito),
  usá `export const dynamic = 'force-dynamic'` en una page/layout solo si necesitás forzarlo.
  No uses la directiva `"use cache"` en este proyecto — es para el modelo nuevo, que no está
  activado.
- `cookies()`, `headers()` y `params` son **async** (`await cookies()`, `params: Promise<...>`
  en `page.tsx`) — esto ya era así desde Next 15, se mantiene.
- Antes de usar cualquier API de Next.js que no estés 100% seguro de recordar bien (App Router
  file conventions, `generateMetadata`, route handlers, etc.), buscá en
  `node_modules/next/dist/docs/01-app/` primero.

## Estructura de carpetas

```
app/
  (auth)/login/page.tsx
  (app)/layout.tsx                     # shell autenticado: topbar + tabs, chequeo de sesión
    resumen/page.tsx
    tendencia/page.tsx
    viajes/layout.tsx                  # subtabs: listado / libreta / reconciliacion
    campo/layout.tsx                   # subtabs: lotes / facturas / costos
    stock/layout.tsx                   # subtabs: inventario / recetas
    alertas/page.tsx
    admin/usuarios/page.tsx            # admin-only
proxy.ts                               # refresh de sesión Supabase (ver arriba)
lib/
  supabase/{server,client,admin}.ts    # admin.ts = service role, SOLO en Server Actions
  business-rules.ts                    # statsFor, avg, sum, META, umbrales
  reconciliation.ts                    # match cps_campo vs infraruts, detectarBrechas, libretaStatus
  costos.ts                            # arriendo, costo/kg azúcar
  stock.ts                             # saldo/precio_prom (espejo de la view SQL)
  alerts.ts                            # reglas de alertas
  forms/{lotes,facturas,trabajos,app-settings}.ts  # schemas zod + *_ACTION_IDLE (ver abajo)
  excel/{parse-common,parse-libreta,parse-infraruts}.ts
  database.types.ts                    # generado, no editar a mano
actions/                               # server actions por dominio — SOLO funciones async (ver abajo)
components/                            # por área: layout/, resumen/, tendencia/, viajes/, campo/, stock/...
  ui/                                  # shadcn — no editar a mano salvo necesidad puntual
hooks/useRealtimeTable.ts
store/ui-store.ts
supabase/
  migrations/                          # 0001_schema.sql, 0002_rls.sql, 0003_views.sql, 0004_storage.sql
scripts/                                # migrate-jw-storage.ts, seed-legacy-*.ts (correr una vez)
```

**`lib/` ya tiene mucho escrito por adelantado** (toda la lógica de negocio se portó de una
sola vez en milestone 1, antes de que hubiera UI para consumirla — `costos.ts`,
`reconciliation.ts`, `alerts.ts` fueron escritos ahí, no milestone por milestone). Antes de
escribir una función de cálculo/algoritmo nueva, **grep `lib/` primero** — pasó al menos una
vez (milestone 5) que se reescribió `detectarBrechas()` como una función nueva en otro
archivo sin darse cuenta de que ya existía en `reconciliation.ts`.

## Convenciones

- **Server Components por defecto.** Un componente es `'use client'` solo si necesita
  interactividad (formularios, filtros, modales) o Realtime.
- **Mutaciones = Server Actions**, nunca fetch a una API route hecha a mano. Cada acción valida
  con zod, revisa permisos (no confíes solo en la UI — ver la nota de `infraruts` abajo) y
  llama `revalidatePath()`.
- **Un archivo `"use server"` solo puede exportar funciones async** — exportar cualquier otra
  cosa (un schema de zod, un objeto `*_ACTION_IDLE`, un array de opciones) revienta en
  runtime ("A 'use server' file can only export async functions, found object"), y
  **`npm run build`/`tsc`/eslint no lo detectan** — el error solo aparece al ejercitar la
  acción en el navegador (pasó de verdad, en los 4 `actions/*.ts` de milestones 1–3; se
  arregló moviendo esos schemas/constantes a `lib/forms/<dominio>.ts`). Los componentes
  importan la función desde `actions/` y las constantes desde `lib/forms/`. Por esto mismo:
  **no des un cambio en Server Actions por terminado solo porque el build pasa** — probalo
  en el navegador.
- **Toda la lógica derivada (no CRUD) vive en `lib/`**, como funciones puras de TypeScript, no
  como vistas/RPC de Postgres — excepción: `stock_saldo` es una vista SQL porque se consulta
  desde varias pantallas. Ver el porqué en `ROADMAP.md`.
- **RLS es el enforcement real**, no la UI. El botón de admin oculto en el topbar es solo
  cosmético — la tabla `infraruts` (datos del ingenio) es de solo lectura para usuarios
  normales a nivel de base de datos vía la función `is_admin()`.
- Nombres de tablas/columnas en español, en snake_case, siguiendo la terminología del dominio
  ya usada en el HTML legacy (lotes, trabajos, facturas, recetas, cps_campo, bajas_arca) — no
  traducir al inglés a mitad de camino.
- Al portar una fórmula o umbral de `index_10.html`, dejá un comentario con el número de línea
  original solo si el valor no es obvio por sí mismo (ej. por qué `META = 10.0` y no otro
  número), no como documentación genérica.

## Variables de entorno (`.env.local`, no commitear)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # solo server (Server Actions/scripts), nunca en el cliente
NEXT_PUBLIC_SITE_URL=
```

Mismo proyecto Supabase que usaba el HTML legacy (`izeiiwdhitseqkkwbama.supabase.co`) — no se
crea uno nuevo, se le agrega el esquema relacional real al lado de la vieja tabla `jw_storage`
(que se archiva, no se borra, una vez migrados los datos).

## Cómo correr Supabase localmente

Las migraciones ya están aplicadas al proyecto remoto y `.env.local` ya tiene las 4 keys
(incluida `SUPABASE_SERVICE_ROLE_KEY`) — no hace falta repetir este setup salvo que se
agregue una migración nueva. Para eso:

```bash
npx supabase login       # abre el navegador para autorizar (interactivo)
npx supabase link --project-ref izeiiwdhitseqkkwbama
npx supabase db push     # aplica supabase/migrations/*.sql nuevas al proyecto remoto
```

`supabase login` interactivo **no funciona en un shell no-TTY** (como el que usa un agente
al correr comandos) — en ese caso usar `npx supabase login --token <PAT>` con un Personal
Access Token de corta duración generado en supabase.com/dashboard/account/tokens y
revocado después de usarlo. `npx supabase db query --linked "<sql>"` corre SQL suelto sin
necesidad de abrir el SQL Editor del dashboard (que además tiene un bug conocido: el
auto-traductor de Chrome llega a traducir el código SQL del editor, no solo la UI).

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build
npm run lint
npx vitest        # tests unitarios de lib/
npx playwright test   # e2e (una vez que haya páginas que probar)
```

Nota: `node`/`npm` se instalan vía `nvm` en esta máquina y no están en el `PATH` por defecto —
correr `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"` antes si el shell no lo carga
automáticamente.

## Migración de datos existentes

No se descarta nada de la app legacy. Antes de dar de baja `index_10.html`:
1. `scripts/migrate-jw-storage.ts` migra lo que hoy está en la tabla `jw_storage` (lotes,
   facturas, trabajos, stock, recetas, cps_campo_v2, bajas_arca_v2, precio_bolsa, users).
2. `scripts/seed-legacy-infraruts.ts` / `seed-legacy-libreta.ts` cargan los datos que hoy están
   hardcodeados directamente en `index_10.html` (arrays `INFRARUTS`, `_LIBRETA_DEFAULT`,
   `_BAJAS_DEFAULT`) — se leen del archivo local, no hace falta acceder a la app en vivo.
3. Comparación numérica de paridad (KPIs, costo/kg azúcar, alertas) entre la app vieja y la
   nueva antes de decomisionar `index_10.html`.
