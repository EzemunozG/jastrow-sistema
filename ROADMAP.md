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
- [x] Milestone 4 completo: Infraruts + Resumen/Tendencia — ver detalle en el milestone 4
      más abajo.
- [x] Milestone 5 completo: Viajes/Listado + detección de brechas — ver detalle abajo.
- [x] Milestone 6 completo: Libreta del Campo + seed de datos reales de la zafra
      (148 INFRARUT + 128 despachos de libreta) — ver detalle abajo.
- [x] Milestone 7 completo: Reconciliación + Bajas ARCA — ver detalle abajo.
- [x] Milestone 8 completo: Stock + Recetas — ver detalle abajo.
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
- Antes de mergear `nextjs-rewrite` a `main`: migraciones ✅ ya aplicadas, Resumen/Tendencia/
  Viajes ✅ ya reales (milestones 4-5) — falta cargar `SUPABASE_SERVICE_ROLE_KEY` en el
  entorno Production de Vercel y hacer el checklist de paridad numérica contra
  `index_10.html` (ver sección de Verificación en el plan original).

## ✅ Setup de Supabase — resuelto (2026-07-03)

Migraciones aplicadas, `.env.local` completo (incluida `SUPABASE_SERVICE_ROLE_KEY`) y
usuarios reales creados — ver el detalle en "Estado actual" arriba. Ya no bloquea nada.

Pendiente menor, no urgente: cargar `SUPABASE_SERVICE_ROLE_KEY` también en el entorno
**Production** de Vercel el día que `nextjs-rewrite` se mergee a `main` (hoy solo está en
Preview, a propósito, para no tocar nada de la producción legacy antes de tiempo).

## Milestones

### 1. Auth + Lotes CRUD (primer slice funcional) ✅ completo, probado en vivo (2026-07-03)
- [x] `supabase/migrations/*_schema.sql`: tablas `fincas`, `profiles`, `lotes` (+ todo el resto
      del esquema, adelantado)
- [x] `supabase/migrations/*_rls.sql`: función `is_admin()`, políticas RLS
- [x] `lib/supabase/{server,client,admin}.ts`
- [x] `proxy.ts` (refresh de sesión — **no** `middleware.ts`, ver CLAUDE.md)
- [x] `app/(auth)/login/page.tsx` + server action de login
- [x] `app/(app)/layout.tsx` con chequeo de sesión
- [x] `app/(app)/campo/lotes/page.tsx` + `LotesTable` + `LoteFormDialog` + `actions/lotes.ts`

### 2. Facturas + Storage ✅ completo, probado en vivo (2026-07-03)
- [x] Tablas `facturas`, `factura_items` (ya estaban en `0001_schema.sql`)
- [x] Bucket de Storage `facturas-imgs` + políticas (`0004_storage.sql`, todo usuario
      autenticado puede leer/escribir, mismo criterio que el resto de tablas operativas)
- [x] CRUD completo con adjunto de imagen: `app/(app)/campo/facturas/page.tsx`,
      `FacturasTable` (resumen + tabla + link a imagen vía signed URL), `FacturaFormDialog`
      (ítems dinámicos con `useFieldArray` de react-hook-form sobre inputs nativos,
      submit vía Server Action + FormData como Lotes), `actions/facturas.ts`
      (reemplazo completo de ítems en cada guardado, borra el objeto de Storage al
      eliminar una factura)

### 3. Trabajos + Costos ✅ completo, probado en vivo (2026-07-03)
- [x] Tablas `trabajos`, `trabajo_insumos`, `app_settings` (ya estaban en `0001_schema.sql`)
- [x] `lib/costos.ts` (ya portado en milestone 1 — arriendo, costo/kg azúcar, fórmulas
      exactas de `index_10.html:2572-2701`)
- [x] `app/(app)/campo/costos/page.tsx` + `AppSettingsForm` + `TrabajoFormDialog`/
      `TrabajosDialog` colgados de `LotesTable`

### 4. Infraruts + Resumen/Tendencia ✅ completo, probado en vivo (2026-07-03)
- [x] Tablas `infraruts`, `infraruts_imports` (ya estaban en `0001_schema.sql`)
- [x] `lib/business-rules.ts` (ya estaba portado — statsFor, META, umbrales)
- [x] `lib/excel/parse-infraruts.ts` (ya estaba escrito — **mapeo de columnas
      provisorio**, ver "Decisiones pendientes" abajo)
- [x] `actions/infraruts.ts`: `importInfraruts()` admin-only (`requireAdmin()`), crea un
      registro en `infraruts_imports` y hace upsert por `cp` en `infraruts` (permite
      reimportar/corregir sin duplicar). `finca_id` se resuelve igual que el HTML legacy:
      `finca_raw` contiene "LOTE4" → `LOTE4`, cualquier otra cosa → `VIRGINIA` (no hay un
      tercer estado "sin mapear").
- [x] `components/resumen/infraruts-import-form.tsx`: parsea el Excel en el cliente
      (`parseInfrarutWorkbook`, ya escrito) y manda el array ya validado al Server Action —
      visible solo si `profile.role === "admin"` (cosmético; `importInfraruts` vuelve a
      chequear `requireAdmin()` server-side).
- [x] `app/(app)/resumen/page.tsx`: KPIs globales + tarjetas por finca (LOTE4/LA VIRGINIA)
      con el mismo color-coding condicional que `index_10.html` (POL<15, Pureza<85,
      Trash%>10 en ámbar).
- [x] `app/(app)/tendencia/page.tsx` + `components/tendencia/tendencia-charts.tsx`: 3
      gráficos de línea (Rendimiento/POL/Pureza) con Recharts, colores LOTE4/LA VIRGINIA
      idénticos al Chart.js legacy (`#378ADD`/`#1D9E75`), validados con
      `scripts/validate_palette.js` de la skill dataviz (todos los checks PASS en modo
      claro) + tabla diaria con delta vs. día anterior por finca.
- **Probado en vivo**: se insertaron 4 filas de INFRARUT de prueba directo en Supabase
  (bypaseando el upload de Excel — el entorno de este agente no puede adjuntar archivos a
  un `<input type=file>` en Chrome) y se verificó que Resumen/Tendencia calculan y
  colorean todo correctamente; los datos de prueba se borraron después. El flujo de
  parseo+upload en sí no se ejercitó en el navegador — el mapeo de tipos entre
  `parseInfrarutWorkbook` y `importInfraruts` sí está validado por TypeScript en
  `npm run build`. **Pendiente**: probar la subida real de un Excel desde el navegador
  (o pedirle a un admin que lo haga) antes de confiar en el flujo end-to-end completo.

### 5. Viajes / Listado + detección de brechas ✅ completo, probado en vivo (2026-07-03)
- [x] `lib/reconciliation.ts` ya tenía `detectarBrechas()` y `libretaStatus()` escritos
      desde milestone 1 (adelantado, igual que `costos.ts`) — **al principio los reescribí
      sin querer como un `detectGaps()` duplicado en `business-rules.ts` sin revisar si ya
      existían; los borré y `ViajesTable` usa las funciones originales de
      `reconciliation.ts`**. Algoritmo global por número de CP sobre todo el dataset
      ordenado (no por finca/fecha), portado tal cual de `index_10.html:1882-1930`.
- [x] `components/viajes/viajes-table.tsx` (`ViajesTable`): filtros (fecha, finca, buscar
      CP, orden cp asc/desc/fecha), tiles de resumen (remitos cargados, rango CP,
      mostrando), panel de brechas colapsable (siempre global, independiente de los
      filtros de la tabla — igual que el legacy), fila de "salto" insertada entre CPs no
      consecutivos cuando el orden es CP ascendente, y estado de "Libreta" por fila
      (✅ En libreta / ⚠ Baja ARCA / ❌ Sin manual) vía `libretaStatus()` — **ojo**:
      matchea `cps_campo.cp` contra `infraruts.remito`, no contra `infraruts.cp` (mismo
      detalle no obvio que en milestone 7, ver `index_10.html:1765`). Al momento de
      escribir esto la Libreta del Campo (milestone 6) todavía no estaba implementada, así
      que esta columna daba siempre "Sin manual"; desde que se cargó la libreta real
      (milestone 6, mismo día) ya refleja el estado correcto.
- [x] `app/(app)/viajes/listado/page.tsx` conectado a `infraruts` + `cps_campo` +
      `bajas_arca`.
- **Probado en vivo**: datos de prueba con 3 brechas intencionales (6 CPs mismo día, 18
  CPs con cambio de día → marcado "⚠ Revisar", 0 CPs) + un `cps_campo` de prueba —
  panel de brechas, filas de salto, colores condicionales (Pureza/Rdto/Trash) y filtro
  por finca verificados correctos (antes y después de deduplicar contra
  `reconciliation.ts`, mismo resultado pixel-a-pixel). Datos de prueba borrados después.

### 6. Libreta del Campo + migración de datos legacy ✅ completo, probado en vivo (2026-07-03)
- [x] `lib/excel/parse-libreta.ts` + `lib/excel/parse-common.ts` (ya estaban escritos)
- [x] `lib/libreta.ts` (nuevo): `getFinca`/`getMatricula`/`getCamNum`/`getDesp`/`getHora` —
      parsean el campo `obs`/`camion` (string armado, no columnas separadas) para mostrar
      la tabla de la Libreta. "TANO"/"LAS100" son potreros del campo, **no** son lo mismo
      que `finca_id` (LOTE4/VIRGINIA) que usa INFRARUT — no confundir las dos
      clasificaciones.
- [x] `actions/cps-campo.ts` (`importLibreta`): sin gate de admin (a diferencia de
      infraruts, cualquier autenticado puede subir la libreta, RLS lo permite) — el Excel
      siempre pisa lo ya guardado por CP; las bajas ARCA detectadas (obs con "BAJA") solo
      se agregan si no existían.
- [x] `components/viajes/libreta-import-form.tsx` + `components/viajes/libreta-table.tsx`
      (filtros finca/estado/buscar CP, tiles de resumen, tabla) — reutiliza
      `reconciliar()` de `lib/reconciliation.ts` (ya escrito en milestone 1) para
      reconciliados/pendientes, sin reinventar el cálculo esta vez.
- [x] `app/(app)/viajes/libreta/page.tsx` conectado a `cps_campo` + `bajas_arca` +
      `infraruts`.
- [x] `scripts/supabase-admin.ts`: helper compartido para correr scripts one-off contra
      Supabase con service-role (fuera del request lifecycle de Next.js) + extractor de
      arrays literales de `index_10.html` (JS válido pero no JSON — se evalúa con
      `new Function`, seguro porque es nuestro propio archivo fuente). Se agregó `tsx`
      como devDependency para poder correr `.ts` sueltos con `npx tsx`.
- [x] `scripts/seed-legacy-infraruts.ts` y `scripts/seed-legacy-libreta.ts`: cargan
      `INFRARUTS` (148 filas), `_LIBRETA_DEFAULT` (128 despachos) y `_BAJAS_DEFAULT` (1
      baja) — **datos reales de la zafra, no de prueba**. Confirmado con el usuario antes
      de correrlos (a diferencia del resto de las pruebas de este proyecto, que fueron
      datos descartables). Ya corridos contra la base real el 2026-07-03; upsert por
      `cp`, se pueden re-correr sin duplicar.
- [x] `scripts/migrate-jw-storage.ts`: implementa el mapeo de `lotes`/`facturas`
      (+ imagen a Storage)/`trabajos`/`cps_campo_v2`/`bajas_arca_v2`/`precio_bolsa`.
      **`jw_storage` está casi vacía hoy** (solo `cps_campo_v2=[]` y `users`, ya migrada a
      mano a Supabase Auth) — este script corrido en dry-run confirma que no hay nada más
      que migrar todavía, pero el mapeo en sí **no se pudo probar contra datos reales
      poblados** porque no existen. `stock`/`recetas` quedan deliberadamente afuera
      (milestone 8, para no adivinar su forma exacta).
- **Encontrado y corregido en el camino**: al instalar `tsx` corrí `npm install -D tsx`
  después de un `cd` que no persistió entre llamadas del agente — terminó instalado (y
  con su propio `package.json`/`package-lock.json`/`node_modules`) en
  `/Users/ezequiel/Desktop/JS/` (el directorio padre, fuera del repo) en vez de en
  `jastrow-app/`. `next build` lo detectó solo (warning de "multiple lockfiles"). Se
  borró el `package.json`/`node_modules` accidental del padre y se reinstaló `tsx`
  correctamente adentro de `jastrow-app/`.

### 7. Reconciliación + Bajas ARCA ✅ completo, probado en vivo (2026-07-03)
- [x] `lib/reconciliation.ts`: `reconciliar()` ya estaba escrito desde milestone 1
      (adelantado, como el resto de `lib/`) — esta vez sí se grepeó antes de escribir
      nada nuevo. Devuelve `{reconciliados, pendientes, infrarutPorRemito}`, usado tal
      cual por `ReconciliacionTables` sin reimplementar el cálculo.
- [x] `lib/forms/cps-campo.ts` (nuevo): `parseCpInput` (CP individual o rango
      "4350-4380") y `parseCpLista` (pegar una lista separada por comas/saltos de
      línea) — portados de `index_10.html:1494-1506` y `:1482`.
- [x] `actions/cps-campo.ts`: `addCpsCampo`/`addCpsLista` — nunca pisan un CP ya
      cargado (ni de la libreta importada ni de otra alta manual), solo agregan los
      que faltan y devuelven cuántos se agregaron/saltearon.
- [x] `lib/forms/bajas-arca.ts` + `actions/bajas-arca.ts`: alta (rechaza CPs
      duplicados, igual que el `alert()` del legacy), toggle de "gestionado" (click
      directo sobre el badge de estado, como el `onclick` inline del HTML original) y
      borrado.
- [x] `components/viajes/registrar-cps-form.tsx`, `reconciliacion-tables.tsx`,
      `bajas-arca-card.tsx` + `app/(app)/viajes/reconciliacion/page.tsx`.
- **Encontrado en el camino**: `deleteCPCampo()` existe en `index_10.html:1508` pero
  **no está conectado a ningún botón** en el HTML legacy — es código muerto. Se portó
  igual como `deleteCpCampo()` en `actions/cps-campo.ts` (puede servir a futuro), pero
  a propósito no se le agregó un botón en la UI nueva, para no inventar una
  funcionalidad que el sistema original nunca tuvo.
- **Probado en vivo**: con los 128 despachos + 148 INFRARUT reales cargados en
  milestone 6 — resumen (128/116/11/1) idéntico al de Libreta del Campo, tablas de
  pendientes/reconciliados con datos y colores correctos, toggle de "Gestionado" en
  la baja real (CP 6908, devuelto a "Pendiente" después de probar), alta de un CP de
  prueba (9999) confirmada y luego borrada a mano (no hay botón de borrado en la UI,
  ver arriba).

### 8. Stock + Recetas ✅ completo, probado en vivo (2026-07-04)
- [x] Tablas `productos`, `movimientos_stock`, `recetas`, `receta_lotes`, `receta_items`
      (ya estaban en `0001_schema.sql`) + vista `stock_saldo` (`0003_views.sql`, ya
      escrita en milestone 1) — `lib/stock.ts` (`calcStock`) ya portado, sin cambios.
- [x] `supabase/migrations/20260704000000_receta_rpc.sql`: función Postgres
      `create_receta(...)` que inserta `recetas` + `receta_lotes` + `receta_items` +
      el movimiento de salida en `movimientos_stock` **en una sola transacción**
      (requisito explícito del roadmap: "nunca dos pasos sueltos") — aplicada al
      proyecto remoto con el mismo mecanismo de PAT de corta duración que milestone 6.
      `lib/database.types.ts` actualizado con el tipo de `Functions.create_receta`.
- [x] `lib/forms/stock.ts` + `actions/stock.ts` (`addEntradaStock`): alta de entradas de
      stock, matchea producto existente por nombre (case-insensitive) o crea uno nuevo.
- [x] `lib/forms/recetas.ts` + `actions/recetas.ts` (`saveReceta`): parsea ítems dinámicos
      (mismo truco de bracket-notation que facturas/trabajos), recalcula
      cantidad/precio/costo **en el servidor** desde `productos`/`stock_saldo` (nunca
      confía en lo que mandó el cliente) y llama al RPC `create_receta`.
- [x] `components/stock/{entrada-stock-dialog,inventario-view}.tsx` +
      `app/(app)/stock/inventario/page.tsx`: resumen (productos, valor stock, sin
      precio), tabla de productos con saldo/precio prom./valor, botón "+ Entrada" por
      fila, historial de movimientos con saldo corriente recalculado.
- [x] `components/stock/{receta-form-dialog,recetas-view}.tsx` +
      `app/(app)/stock/recetas/page.tsx`: alta de receta con ítems dinámicos vía
      `useFieldArray` (react-hook-form), preview en vivo de cantidad/costo por ítem y
      costo total/por ha, listado de recetas con detalle de ítems y aviso "Parcial*"
      cuando falta precio de algún producto.
- **Encontrado en el camino (bug de testing, no de la app)**: al probar el diálogo de
  receta con clicks automatizados de Chrome, un solo click sobre el `Select` de Lote
  (shadcn/Radix) parecía dejarlo "seleccionado" (el texto de la opción se renderiza
  superpuesto al trigger por el posicionamiento `item-aligned`), pero el `<select>`
  nativo oculto que arma Radix para el submit del form seguía en `""` — el guardado
  fallaba con "Seleccioná un lote" a pesar de que la UI se veía bien. No reproduce con
  un click real de usuario (que dispara mousedown+mouseup por separado); fue un
  artefacto del click sintético de la herramienta de automatización. Se resolvió
  verificando el valor real del campo vía JS (`new FormData(form)`) antes de dar por
  buena una selección, y clickeando la opción ya renderizada en el listbox en vez de
  re-clickear el trigger.
- **Probado en vivo**: creado un lote y producto de prueba, cargada una entrada de
  stock (100 l), guardada una receta real contra el RPC (2 l/ha × 10 ha = 20 l,
  $1.500/l → $30.000, $3.000/ha) — verificado que la receta, el ítem y el lote
  quedaron guardados y que el movimiento de salida (−20 l) impactó correctamente el
  saldo de Inventario (100 → 80 l). Todos los datos de prueba borrados después
  (producto, movimientos, lote, receta) vía script puntual con el cliente
  service-role.
- **Pendiente/decisión del usuario**: `index_10.html` tiene datos reales hardcodeados
  de Stock (~11 productos con movimientos de compra reales) y Recetas (~6 recetas,
  REC-001 a REC-006) — igual que INFRARUT/libreta en milestone 6, cargarlos requiere
  confirmación explícita antes de correr el seed contra la base real (todavía no se
  pidió).

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
