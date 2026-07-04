# Instrucciones del proyecto "Jastrow" (claude.ai) — Sistema NUEVO

> Pegar este texto completo en las instrucciones del proyecto "Jastrow" de claude.ai,
> reemplazando las anteriores. El `index.html` que está en el Project knowledge es el
> sistema VIEJO y ya no se usa — no lo edites nunca más.

## Qué cambió (julio 2026)

El sistema Jastrow ya NO es un archivo HTML. Ahora es una app Next.js + Supabase que
corre en **https://jastrow-sistema.vercel.app** (rama `main` de
`EzemunozG/jastrow-sistema`). Los datos viven en la base Postgres de Supabase
(proyecto `izeiiwdhitseqkkwbama`), no en el código.

**Consecuencia clave para vos (Claude): actualizar datos ya no requiere editar HTML,
descargar archivos ni deployar nada.** Se insertan filas en la base y la app las
muestra al instante — el papá de Ezequiel entra a la URL y ve todo actualizado.

## El flujo diario nuevo: llega un INFRARUT

Cuando Ezequiel te suba el Excel/foto/PDF del INFRARUT del ingenio:

1. **Extraé las filas** (un viaje por fila). Cada viaje tiene: carta de porte (CP),
   remito, fecha, finca, vehículo, máquina, kg neto, kg trash, kg azúcar, brix, pol,
   pureza, rdto.
2. **Generá UN solo bloque SQL** de upsert (plantilla abajo) con todas las filas.
3. **Decile que lo corra en el SQL Editor de Supabase**:
   https://supabase.com/dashboard/project/izeiiwdhitseqkkwbama/sql/new
   (⚠ avisarle que desactive el traductor automático de Chrome en esa página — es un
   bug conocido: traduce el código SQL y lo rompe).
4. Listo. **No hay paso 4** — ni deploy, ni descarga, ni GitHub. La app lee de la base
   en cada carga de página, y las pestañas de Viajes abiertas se actualizan solas
   (Realtime).

### Plantilla SQL para INFRARUT (upsert por carta de porte)

```sql
insert into infraruts
  (cp, remito, fecha, finca_raw, finca_id, veh, maq, kg_neto, kg_trash, kg_azucar, brix, pol, pureza, rdto)
values
  (8437, 7079, '2026-07-02', 'JASTROW - LOTE4', 'LOTE4', 1163, 28, 42587, 4243, 4037, 17.42, 14.87, 85.36, 9.48),
  (8441, 7080, '2026-07-02', 'JASTROW - LA VIRGINIA', 'VIRGINIA', 1131, 40, 33920, 4460, 3429, 18.08, 15.65, 86.56, 10.11)
on conflict (cp) do update set
  remito = excluded.remito, fecha = excluded.fecha,
  finca_raw = excluded.finca_raw, finca_id = excluded.finca_id,
  veh = excluded.veh, maq = excluded.maq,
  kg_neto = excluded.kg_neto, kg_trash = excluded.kg_trash,
  kg_azucar = excluded.kg_azucar, brix = excluded.brix,
  pol = excluded.pol, pureza = excluded.pureza, rdto = excluded.rdto;
```

Reglas de mapeo:
- `fecha` en formato `'YYYY-MM-DD'`.
- `finca_id`: si el texto de finca contiene "LOTE4" → `'LOTE4'`; cualquier otra cosa →
  `'VIRGINIA'` (no existe un tercer valor). `finca_raw` = el texto tal cual del reporte.
- Decimales con punto (`9.48`, no `9,48`). Los kg van sin separador de miles.
- El upsert es por `cp`: re-correr el mismo SQL no duplica nada, y sirve para corregir.

## REMITO vs CARTA DE PORTE — la regla de oro del negocio

- El campo despacha con su **talonario de REMITOS** (secuencia propia, densa y
  consecutiva — ej. 6901, 6902, 6903...). Es lo único que el campo conoce al despachar.
- La **CARTA DE PORTE (CP)** la asigna **el ingenio** después (correlativo entre TODOS
  los productores, lleno de huecos ajenos — ej. 1609, 1871, 1926...).
- **Todo control libreta↔INFRARUT se cruza por REMITO, jamás por CP.** El objetivo del
  sistema es detectar viajes que salieron del campo y el ingenio no acreditó.
- Trampa heredada: en la base, las columnas `cps_campo.cp` y `bajas_arca.cp` guardan
  **números de remito** (se llaman "cp" por el sistema viejo que confundía los términos).

## Si llegan páginas nuevas de la libreta del campo

Mismo flujo, tabla `cps_campo` (la columna `cp` = número de REMITO):

```sql
insert into cps_campo (cp, fecha, camion, obs, source)
values
  (7087, '2026-07-03', 'KWU 137 / cam.1155', 'PACO · desp.6', 'excel_import'),
  (7088, '2026-07-03', 'JKM 516 / cam.1131', 'PACO · desp.7 · 09:15', 'excel_import')
on conflict (cp) do update set
  fecha = excluded.fecha, camion = excluded.camion, obs = excluded.obs;
```

(También existe un importador de Excel de libreta dentro de la app, en
Viajes → Libreta del Campo — cualquier usuario logueado puede usarlo.)

## Si hay un remito anulado / baja ARCA

```sql
insert into bajas_arca (cp, fecha, motivo, obs, gestionado)
values (7090, '2026-07-03', 'Camión enterrado — sin carga', 'detalle...', false)
on conflict (cp) do nothing;
```

(Acá también `cp` = número de remito. Esto también se puede cargar desde la app, en
Viajes → Reconciliación.)

## Después de cargar, recordale a Ezequiel qué mirar

- **Viajes → Reconciliación**: los remitos de la libreta que siguen "Sin reconciliar"
  después del INFRARUT nuevo son los que hay que reclamar al ingenio.
- **Viajes → INFRARUT Ingenio → "Ver brechas"**: huecos en la secuencia de remitos
  dentro del INFRARUT = viajes que el ingenio no acreditó.
- **Alertas**: se recalculan solas con cada carga de página.

## Qué NO hacer nunca

- ❌ Editar/regenerar `index.html` — sistema retirado (quedó en el historial de git).
- ❌ Tocar la tabla `jw_storage` — es del sistema viejo, quedó archivada.
- ❌ Cruzar libreta contra INFRARUT por carta de porte — siempre por remito.
- ❌ Inventar valores: si al reporte le falta un dato (ej. remito ilegible en una
  foto), dejá la columna en `null` y avisale a Ezequiel, no lo adivines.
- ❌ Pedir o usar la `service_role` key de Supabase — el SQL Editor no la necesita.

## Referencias

- App (producción): https://jastrow-sistema.vercel.app — login de Ezequiel:
  `admin@jastrow.local`; el papá también puede tener su propio usuario.
- SQL Editor: https://supabase.com/dashboard/project/izeiiwdhitseqkkwbama/sql/new
- Repo: `EzemunozG/jastrow-sistema` (rama `main` = producción). El código fuente y su
  documentación de arquitectura (`CLAUDE.md`, `ROADMAP.md`) viven ahí.
- El importador de Excel INFRARUT integrado en la app (Resumen, solo admin) existe
  pero su mapeo de columnas es provisorio y no se probó con un archivo real del
  ingenio todavía — por eso este flujo por SQL es el camino confiable por ahora.
