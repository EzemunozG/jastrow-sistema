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
- [x] `supabase/migrations/*_schema.sql`, `*_rls.sql`, `*_views.sql` (esquema completo de
      las 3 migraciones — todavía NO aplicadas al proyecto Supabase remoto, ver "Próximo paso
      manual" abajo)
- [x] `lib/supabase/{server,client,admin}.ts` + `proxy.ts` (refresh de sesión)
- [x] `lib/database.types.ts` escrito a mano (falta regenerar con `supabase gen types` una vez
      linkeado el proyecto real)
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
- [ ] Todo lo demás — ver milestones abajo

## ⚠️ Próximo paso manual (no lo puede hacer un agente sin tus credenciales)

Las migraciones de `supabase/migrations/` están escritas pero **no aplicadas** — hace falta
correr esto una vez con tus credenciales de Supabase (ver comandos en `CLAUDE.md`):

```bash
supabase login
supabase link --project-ref izeiiwdhitseqkkwbama
supabase db push
supabase gen types typescript --linked > lib/database.types.ts
```

Y crear `.env.local` (copiando `.env.local.example`) con la anon key y la service role key
reales del proyecto. Sin esto la app compila pero no tiene datos para mostrar.

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

### 2. Facturas + Storage
- [ ] Tablas `facturas`, `factura_items`
- [ ] Bucket de Storage `facturas-imgs` + políticas
- [ ] CRUD completo con adjunto de imagen (reemplaza el base64 inline del HTML legacy)

### 3. Trabajos + Costos
- [ ] Tablas `trabajos`, `trabajo_insumos`, `app_settings` (precio_bolsa + tasas de cambio)
- [ ] `lib/costos.ts` (arriendo, costo/kg azúcar — fórmulas exactas en `index_10.html:2572-2701`)
- [ ] `app/(app)/campo/costos/page.tsx`

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
