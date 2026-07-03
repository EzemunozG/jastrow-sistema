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
  reconciliation.ts                    # match cps_campo vs infraruts, detección de brechas
  costos.ts                            # arriendo, costo/kg azúcar
  stock.ts                             # saldo/precio_prom (espejo de la view SQL)
  alerts.ts                            # reglas de alertas
  excel/{parse-common,parse-libreta,parse-infraruts}.ts
  database.types.ts                    # generado, no editar a mano
actions/                               # server actions por dominio
components/                            # por área: layout/, resumen/, viajes/, campo/, stock/...
  ui/                                  # shadcn — no editar a mano salvo necesidad puntual
hooks/useRealtimeTable.ts
store/ui-store.ts
supabase/
  migrations/                          # 0001_schema.sql, 0002_rls.sql, 0003_views.sql
scripts/                                # migrate-jw-storage.ts, seed-legacy-*.ts (correr una vez)
```

## Convenciones

- **Server Components por defecto.** Un componente es `'use client'` solo si necesita
  interactividad (formularios, filtros, modales) o Realtime.
- **Mutaciones = Server Actions**, nunca fetch a una API route hecha a mano. Cada acción valida
  con zod, revisa permisos (no confíes solo en la UI — ver la nota de `infraruts` abajo) y
  llama `revalidatePath()`.
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

```bash
npm install -g supabase   # si no está instalado
supabase login
supabase link --project-ref izeiiwdhitseqkkwbama
supabase db push          # aplica supabase/migrations/*.sql al proyecto remoto
supabase gen types typescript --linked > lib/database.types.ts
```

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
