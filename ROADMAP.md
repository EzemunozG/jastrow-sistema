# ROADMAP — JASTROW Next.js/Supabase rewrite

Guía de desarrollo y tareas pendientes. Ver `CLAUDE.md` para stack/convenciones y
`../index_10.html` para la especificación de negocio original.

## Estado actual

- [x] Scaffolding Next.js 16 + TypeScript + Tailwind v4 (`create-next-app`)
- [x] shadcn/ui inicializado (base Radix, preset "nova") + componentes base instalados
      (button, input, dialog, table, select, card, badge, label, textarea, dropdown-menu,
      tabs, separator, sonner)
- [x] Dependencias runtime: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`,
      `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `recharts`, `xlsx`,
      `date-fns`, `@tabler/icons-react`
- [x] Dependencias de test: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
      `jsdom`, `@playwright/test`
- [x] `CLAUDE.md`
- [x] **Migraciones aplicadas al Supabase remoto (2026-07-03)** — las 4 migraciones de
      `supabase/migrations/` (schema, rls, views, storage) corren contra
      `izeiiwdhitseqkkwbama` (`supabase migration list` las muestra sincronizadas). Se hizo
      con un Personal Access Token de Supabase de corta duración (1h, ya revocado) vía
      `supabase login --token` + `link` + `db push`, porque `supabase login` interactivo no
      funciona en un shell no-TTY. Tipos hand-written en `lib/database.types.ts` verificados
      contra `supabase gen types typescript --linked` (mismo set de tablas/columnas; no se
      reemplazó el archivo por el generado para no perder los union types de los campos con
      `check` constraint, que el generador no infiere).
- [x] `lib/supabase/{server,client,admin}.ts` + `proxy.ts` (refresh de sesión)
- [x] `lib/database.types.ts` escrito a mano, verificado contra el esquema real (ver arriba)
- [x] **Usuarios reales creados en Supabase Auth**: `admin@jastrow.local` (rol admin) y
      `operador@jastrow.local` (rol user) — mismas credenciales `admin`/`operador` que el
      HTML legacy pero con email placeholder + contraseña real (pedile las contraseñas al
      usuario, no están en este repo). `SUPABASE_SERVICE_ROLE_KEY` cargada en `.env.local` y
      en Vercel (scope Preview + rama `nextjs-rewrite`) — el panel de admin de usuarios ya
      funciona de punta a punta.
- [x] **Bug de runtime encontrado y corregido (2026-07-03)**: los 4 archivos
      `actions/*.ts` (lotes, facturas, trabajos, app-settings) exportaban además del
      Server Action, un schema de zod y un objeto `*_ACTION_IDLE` — Next.js 16 permite que
      un archivo `"use server"` exporte *solo* funciones async; exportar un objeto rompe en
      runtime ("A 'use server' file can only export async functions, found object"), algo
      que **`npm run build` no detecta** (el error solo aparece al ejercitar la acción en el
      navegador). Se movieron los schemas/constantes/tipos a `lib/forms/{lotes,facturas,
      trabajos,app-settings}.ts` (archivos planos, no "use server"); los componentes ahora
      importan la función desde `actions/` y las constantes desde `lib/forms/`. **Lección
      para todo código nuevo de Server Actions**: verificar siempre en el navegador, no solo
      con `npm run build` — ver [[feedback-verify-server-actions-in-browser]].
- [x] **Probado de punta a punta en local (2026-07-03)**: login real, alta/edición/borrado
      de Lotes, Trabajos (con insumos dinámicos) y Facturas (con cálculo de total en vivo),
      página de Costos con datos reales, alta de usuarios. Todo contra la base de Supabase
      real, sin datos de prueba dejados atrás (se creó y borró un lote+trabajo+factura de
      test).
- [x] `lib/business-rules.ts`, `lib/reconciliation.ts`, `lib/costos.ts`, `lib/stock.ts`,
      `lib/alerts.ts` — lógica de negocio portada, pendiente de tests Vitest
- [x] `lib/excel/parse-common.ts`, `parse-libreta.ts`, `parse-infraruts.ts` (mapeo provisorio)
- [x] Auth: `app/(auth)/login/page.tsx`, `actions/auth.ts`, `app/(app)/layout.tsx` con chequeo
      de sesión + `lib/dal.ts` (`getCurrentProfile`, `requireAdmin`)
- [x] Milestone 1 completo: Lotes CRUD (`app/(app)/campo/lotes`, `LotesTable`,
      `LoteFormDialog`, `actions/lotes.ts`) — `npm run build` pasa limpio
- [x] `app/(app)/admin/usuarios` con guard `requireAdmin()` + alta de usuarios (adelantado del
      milestone 10 para probar el patrón RLS/service-role de punta a punta)
- [x] Rutas placeholder para las 6 pestañas + subtabs (navegación completa, contenido real
      pendiente por milestone)
- [x] Git conectado a `github.com/EzemunozG/jastrow-sistema`, rama `nextjs-rewrite` (no
      `main` — ver "Git y deploy" abajo)
- [x] Preview de Vercel funcionando de punta a punta en
      `https://jastrow-sistema-git-nextjs-rewrite-jastrow.vercel.app` (requirió
      `vercel.json` con `framework: "nextjs"` + env vars de Supabase en Vercel, scopeadas a
      Preview + rama `nextjs-rewrite` para no tocar `main`)
- [x] Milestone 2 completo en código: Facturas + Storage (`app/(app)/campo/facturas`,
      `FacturasTable`, `FacturaFormDialog` con ítems dinámicos vía react-hook-form,
      `actions/facturas.ts`, migración `supabase/migrations/20260703193000_storage.sql`
      con el bucket `facturas-imgs` — mismas tablas `facturas`/`factura_items` que ya
      estaban en el schema de milestone 1) — `npm run build` y `npm run lint` pasan
      limpio; **probado en vivo el 2026-07-03** (alta/borrado de factura con ítems reales,
      resumen y distribución por categoría correctos).
- [x] Milestone 3 completo en código: Trabajos + Costos. `actions/trabajos.ts` (alta +
      borrado de trabajos, sin edición — igual que el HTML legacy, que tampoco la
      soporta), `TrabajoFormDialog` (insumos dinámicos vía react-hook-form, con `<select>`
      nativo para unidad/factura vinculada) y `TrabajosDialog` (listado + resumen por
      lote), ambos colgados de un botón "Trabajos (n)" nuevo en `LotesTable`.
      `actions/app-settings.ts` + `AppSettingsForm` para editar precio_bolsa/tasas de
      cambio (antes hardcodeadas en el HTML legacy). `app/(app)/campo/costos/page.tsx`
      usa `lib/costos.ts` tal cual ya estaba escrito (arriendo, costo por categoría,
      costo por lote) — el costo/kg azúcar da "—" hasta que haya datos reales en
      `infraruts` (milestone 4/6). `npm run build`/`lint` pasan limpio; **probado en vivo el
      2026-07-03** (trabajo con insumo real, costo total y $/ha calculados bien, página de
      Costos reflejando los números correctos).
- [ ] Todo lo demás — ver milestones abajo

## Git y deploy

- Repo: mismo que el sistema legacy (`EzemunozG/jastrow-sistema`), pero en una rama aparte
  (`nextjs-rewrite`) para no tocar `main` (el `index.html` que sigue usando la familia) hasta
  que este sistema tenga paridad al menos en Resumen/Tendencia/Viajes.
- El proyecto de Vercel (`jastrow`/`jastrow-sistema`) es el mismo de siempre — no se creó uno
  nuevo. Cada push a `nextjs-rewrite` genera un preview deployment automático en
  `jastrow-sistema-git-nextjs-rewrite-jastrow.vercel.app` (URL estable por rama).
- El dashboard del proyecto tiene el Framework Preset en "Other" (config del `index.html`
  estático) — **no cambiar eso a nivel de proyecto**, rompería el próximo build de `main`.
  `jastrow-app/vercel.json` fuerza `framework: "nextjs"` solo para los commits que lo
  incluyen, sin tocar nada compartido.
- Variables de entorno de Supabase cargadas en Vercel con scope `Preview` + rama
  `nextjs-rewrite` únicamente, incluida `SUPABASE_SERVICE_ROLE_KEY` (agregada 2026-07-03).
- Antes de mergear `nextjs-rewrite` a `main`: correr las migraciones de Supabase, tener al
  menos Resumen/Tendencia/Viajes reales, y hacer el checklist de paridad numérica contra
  `index_10.html` (ver sección de Verificación en el plan original).

## ✅ Setup de Supabase — resuelto (2026-07-03)

Migraciones aplicadas, `.env.local` completo (incluida `SUPABASE_SERVICE_ROLE_KEY`) y
usuarios reales creados — ver el detalle en "Estado actual" arriba. Ya no bloquea nada.

Pendiente menor, no urgente: cargar `SUPABASE_SERVICE_ROLE_KEY` también en el entorno
**Production** de Vercel el día que `nextjs-rewrite` se mergee a `main` (hoy solo está en
Preview, a propósito, para no tocar nada de la producción legacy antes de tiempo).

## Milestones

### 1. Auth + Lotes CRUD (primer slice funcional) ✅ código listo, pendiente aplicar migraciones
- [x] `supabase/migrations/*_schema.sql`: tablas `fincas`, `profiles`, `lotes` (+ todo el resto
      del esquema, adelantado)
- [x] `supabase/migrations/*_rls.sql`: función `is_admin()`, políticas RLS
- [x] `lib/supabase/{server,client,admin}.ts`
- [x] `proxy.ts` (refresh de sesión — **no** `middleware.ts`, ver CLAUDE.md)
- [x] `app/(auth)/login/page.tsx` + server action de login
- [x] `app/(app)/layout.tsx` con chequeo de sesión
- [x] `app/(app)/campo/lotes/page.tsx` + `LotesTable` + `LoteFormDialog` + `actions/lotes.ts`

### 2. Facturas + Storage ✅ código listo, pendiente aplicar migraciones
- [x] Tablas `facturas`, `factura_items` (ya estaban en `0001_schema.sql`)
- [x] Bucket de Storage `facturas-imgs` + políticas (`0004_storage.sql`, todo usuario
      autenticado puede leer/escribir, mismo criterio que el resto de tablas operativas)
- [x] CRUD completo con adjunto de imagen: `app/(app)/campo/facturas/page.tsx`,
      `FacturasTable` (resumen + tabla + link a imagen vía signed URL), `FacturaFormDialog`
      (ítems dinámicos con `useFieldArray` de react-hook-form sobre inputs nativos,
      submit vía Server Action + FormData como Lotes), `actions/facturas.ts`
      (reemplazo completo de ítems en cada guardado, borra el objeto de Storage al
      eliminar una factura)

### 3. Trabajos + Costos ✅ código listo, pendiente aplicar migraciones
- [x] Tablas `trabajos`, `trabajo_insumos`, `app_settings` (ya estaban en `0001_schema.sql`)
- [x] `lib/costos.ts` (ya portado en milestone 1 — arriendo, costo/kg azúcar, fórmulas
      exactas de `index_10.html:2572-2701`)
- [x] `app/(app)/campo/costos/page.tsx` + `AppSettingsForm` + `TrabajoFormDialog`/
      `TrabajosDialog` colgados de `LotesTable`

### 4. Infraruts + Resumen/Tendencia
- [ ] Tablas `infraruts`, `infraruts_imports`
- [ ] `lib/business-rules.ts` (statsFor, META, umbrales — `index_10.html:1014-1023`)
- [ ] `lib/excel/parse-infraruts.ts` (**mapeo de columnas provisorio**, ver "Decisiones
      pendientes" abajo)
- [ ] Import admin-only + `app/(app)/resumen`, `app/(app)/tendencia` con gráficos Recharts

### 5. Viajes / Listado + detección de brechas
- [ ] `ViajesTable`, `GapPanel` (algoritmo global por número de CP, no por finca/fecha —
      preservar tal cual `index_10.html:1882-1930`)

### 6. Libreta del Campo + migración de datos legacy
- [ ] `lib/excel/parse-libreta.ts` + `lib/excel/parse-common.ts`
- [ ] `scripts/migrate-jw-storage.ts` — correr una vez, migra `jw_storage` completo
- [ ] `scripts/seed-legacy-infraruts.ts`, `seed-legacy-libreta.ts` — cargan los datos hoy
      hardcodeados en `index_10.html` (arrays `INFRARUTS`, `_LIBRETA_DEFAULT`, `_BAJAS_DEFAULT`)

### 7. Reconciliación + Bajas ARCA
- [ ] `lib/reconciliation.ts` — **ojo**: matchea `cps_campo.cp` contra `infraruts.remito`, no
      contra `infraruts.cp` (detalle exacto de `index_10.html:1765`)

### 8. Stock + Recetas
- [ ] Tablas `productos`, `movimientos_stock`, `recetas`, `receta_lotes`, `receta_items`
- [ ] `supabase/migrations/0003_views.sql` (vista `stock_saldo`)
- [ ] Guardar receta = transacción (receta + movimiento de salida), nunca dos pasos sueltos

### 9. Alertas
- [ ] `lib/alerts.ts` — depende de todo lo anterior, portar reglas y umbrales exactos de
      `index_10.html:3113-3190`

### 10. Realtime + Admin + hardening + QA de paridad
- [ ] `hooks/useRealtimeTable.ts` wireado en Viajes/Listado, Reconciliación, Alertas
- [ ] `app/(app)/admin/usuarios/page.tsx`
- [ ] Revisión final de políticas RLS
- [ ] Checklist de paridad numérica contra `index_10.html` antes de decomisionarlo

## Decisiones pendientes

- **Emails reales para Auth**: `admin`/`operador` no tienen email hoy. Se está usando
  `admin@jastrow.local` / `operador@jastrow.local` como placeholder hasta tener las
  direcciones reales del equipo — reemplazar antes de ir a producción.
- **Archivo de muestra real de INFRARUT**: el parser de `lib/excel/parse-infraruts.ts` usa un
  mapeo de columnas provisorio (cp, remito, fecha, finca, veh, maq, kg_neto, kg_trash,
  kg_azucar, brix, pol, pureza, rdto) basado en los datos hoy hardcodeados. Cuando haya un
  archivo de exportación real del ingenio, ajustar el mapeo exacto — no bloquea el resto.
- **Tasas de cambio (`TC_OFICIAL`/`TC_BLUE`/`TC_CCL`)**: pasaron a `app_settings` como valores
  editables en vez de constantes hardcodeadas (estaban desactualizadas por definición en el
  HTML legacy) — confirmar si esto es lo que se quiere o si conviene una fuente externa.
