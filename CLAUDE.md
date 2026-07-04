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
  Supabase Realtime solo en las vistas que necesitan sync en vivo entre usuarios
  (Viajes/Listado, Reconciliación, Alertas) — sin TanStack Query: un componente cliente
  (`components/realtime-refresh.tsx`) se suscribe a `postgres_changes` vía
  `hooks/useRealtimeTable.ts` y llama `router.refresh()`, que vuelve a pedir los datos a la
  Server Component. Más simple que traer un cache client-side para algo que ya vive en el
  server; alcanza para el volumen de datos de este proyecto.
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
- **Una mutación que escribe en más de una tabla y no puede quedar a medias es una función
  Postgres (`supabase.rpc(...)`), no una secuencia de `.insert()` sueltos desde la Server
  Action.** Ejemplo: `create_receta` (`supabase/migrations/20260704000000_receta_rpc.sql`)
  inserta `recetas` + `receta_lotes` + `receta_items` + el movimiento de salida en
  `movimientos_stock` en una sola transacción — si el guardado de la receta fallara a mitad
  de camino con inserts separados, quedaría stock descontado sin receta asociada (o viceversa).
- **Al probar un `<Select>` de shadcn/Radix con clicks automatizados (Chrome extension)**: un
  solo click sobre el trigger puede *parecer* que seleccionó un valor (el texto de la opción
  se renderiza superpuesto al trigger por el posicionamiento `item-aligned`) sin que el
  `<select>` nativo oculto que arma Radix para el submit realmente cambie de valor — el
  formulario se manda igual pero con el campo vacío. No pasa con un click real de usuario
  (dispara mousedown+mouseup por separado). Antes de dar una selección por buena en una
  prueba automatizada, verificar el valor real con `new FormData(form)` (o clickear la opción
  ya renderizada en el listbox, no re-clickear el trigger).
- **RLS es el enforcement real**, no la UI. El botón de admin oculto en el topbar es solo
  cosmético — la tabla `infraruts` (datos del ingenio) es de solo lectura para usuarios
  normales a nivel de base de datos vía la función `is_admin()`.
- **`jw_storage` (tabla del sistema legacy) no tiene RLS y expone lo que tenga adentro con la
  sola clave anon** — ya se encontró una vez con las contraseñas de `admin`/`operador` en
  texto plano ahí. **No alcanza con rotarlas ni con habilitar RLS**: `index_10.html` tiene
  un `DEFAULT_USERS` hardcodeado en el propio HTML como fallback de login (visible con "Ver
  código fuente" del sitio legacy, sin necesitar la clave anon) y además `initUsers()` tiene
  una condición de carrera que reescribe esas credenciales default de vuelta en
  `jw_storage` en cada carga de la página si el fetch async todavía no completó — confirmado
  en vivo, deshizo una rotación sola en ~3 minutos. El único fix real es editar
  `DEFAULT_USERS` en `index_10.html`, y el usuario decidió explícitamente no tocar ese
  archivo (producción legacy en uso real) — la exposición se cierra recién decomisionando
  `main`. Si se agrega algo sensible a `jw_storage` alguna vez, tenerlo presente.
- **Una tabla con Realtime habilitado (agregada a la publicación `supabase_realtime`, ver
  `hooks/useRealtimeTable.ts`) también necesita RLS-aware auth en el cliente**: si la tabla
  tiene RLS, el socket de Realtime solo reenvía `postgres_changes` si se le pasó el JWT de
  sesión con `supabase.realtime.setAuth(session.access_token)` **antes** de `subscribe()` — la
  anon key con la que arranca el cliente no alcanza, aunque el usuario esté logueado y el
  `channel.subscribe()` devuelva `SUBSCRIBED` sin error (falla en silencio, no llega ningún
  evento). Ver el hook para el patrón completo.
- Nombres de tablas/columnas en español, en snake_case, siguiendo la terminología del dominio
  ya usada en el HTML legacy (lotes, trabajos, facturas, recetas, cps_campo, bajas_arca) — no
  traducir al inglés a mitad de camino.
- **REMITO vs CARTA DE PORTE — la distinción más importante del dominio** (confirmada por el
  usuario, 2026-07-04): el campo despacha con su propio talonario de REMITOS (secuencia densa
  y consecutiva, ej. 6901–7078); la CARTA DE PORTE la asigna el ingenio después (correlativo
  entre todos los productores, con huecos ajenos, ej. 1609–8436). El campo NUNCA conoce la
  carta de porte al despachar. Por eso **todo cruce libreta↔INFRARUT y toda detección de
  brechas va por `infraruts.remito`, jamás por `infraruts.cp`**, y las brechas se buscan en la
  secuencia de remitos (un hueco ahí = viaje que salió del campo y el ingenio no acreditó).
  Trampa de nombres heredada: `cps_campo.cp` y `bajas_arca.cp` guardan NÚMEROS DE REMITO (la
  columna se llama "cp" por el legacy viejo, que confundía los términos — el legacy corregido
  de main lo anota igual: "en la libreta el campo 'cp' contiene el N° DE REMITO"). En la UI
  siempre decir "remito" para estos números; "CP ingenio" solo como dato secundario.
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

No se descarta nada de la app legacy. Estos scripts corren con `npx tsx scripts/<nombre>.ts`
(agregá `--dry-run` para ver qué haría sin escribir nada) — usan
`scripts/supabase-admin.ts` para el cliente service-role y el parseo de los arrays
hardcodeados de `index_10.html`. Antes de dar de baja `index_10.html`:
1. ✅ `scripts/seed-legacy-infraruts.ts` / `seed-legacy-libreta.ts` — **ya corridos**
   (2026-07-03) contra la base real: cargaron los 148 INFRARUT + 128 despachos de libreta
   + 1 baja ARCA hardcodeados en `index_10.html` (arrays `INFRARUTS`, `_LIBRETA_DEFAULT`,
   `_BAJAS_DEFAULT`). Idempotentes (upsert por `cp`), se pueden re-correr si hace falta
   corregir algo.
2. ✅ `scripts/seed-legacy-campo-stock.ts` — **ya corrido** (2026-07-04): carga los 15
   lotes reales, 9 facturas, 11 productos de stock (con movimientos) y 6 recetas
   hardcodeados en `index_10.html` (`getLotes`/`getFacturas`/`getStock`/`getRecetas`, no
   `jw_storage`). Usa `extractGstArrayLiteral` (variante de `extractArrayLiteral` para el
   patrón `function getX(){ return gSt('key') || [...]; }`). Idempotente: upsert por id
   en tablas padre, delete-then-insert por parent id en las hijas sin key natural
   (`receta_lotes`, `receta_items`, `movimientos_stock`, `factura_items`).
3. `scripts/migrate-jw-storage.ts` migra lo que esté en la tabla `jw_storage` (lotes,
   facturas, trabajos, cps_campo_v2, bajas_arca_v2, precio_bolsa — `stock`/`recetas`
   quedan afuera a propósito). Escrito y probado en dry-run, pero **`jw_storage` está
   casi vacía hoy** (la familia no llegó a cargar nada ahí antes de este rewrite; los
   datos reales de lotes/facturas/stock/recetas vivían hardcodeados en el JS del HTML,
   no en `jw_storage` — ver punto 2) — el mapeo en sí no se pudo probar todavía contra
   datos reales poblados de esa tabla específica. Revisar con cuidado si aparece algo ahí
   antes de decomisionar.
4. Comparación numérica de paridad (KPIs, costo/kg azúcar, alertas) entre la app vieja y la
   nueva — **hecha** (milestone 10, 2026-07-04): Resumen/Tendencia/Viajes coinciden exacto.
5. **`jw_storage` sin RLS expone las contraseñas de `admin`/`operador`** (ver la nota más
   arriba, en Convenciones) — intento de rotarlas resultó insuficiente por el fallback
   `DEFAULT_USERS` hardcodeado en `index_10.html` y una condición de carrera en
   `initUsers()` que revierte la rotación sola. No tiene fix sin editar `index_10.html`
   (decisión explícita del usuario: no tocarlo) — se cierra recién al decomisionar `main`.
