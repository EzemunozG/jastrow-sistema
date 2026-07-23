// Filtros compartidos por /rendimiento, /viajes/reconciliacion y /viajes/listado —
// viven en la URL (searchParams) para que el estado sea compartible y sobreviva un
// refresh, en vez de useState local como hacían las tablas viejas (viajes-table,
// libreta-table). Ver components/filters/filter-bar.tsx para el control de UI.
import { INGENIOS, type IngenioId } from "./business-rules";

export type Filtros = {
  ingenio: IngenioId | "all";
  lote: string; // lote_key de lotes_ingenio; "" = todos
  desde: string; // YYYY-MM-DD; "" = sin límite inferior
  hasta: string; // YYYY-MM-DD; "" = sin límite superior
  busca: string; // remito; "" = sin buscar
};

export type SearchParamsInput = Record<string, string | string[] | undefined>;

export function parseFiltros(searchParams: SearchParamsInput): Filtros {
  const get = (k: string): string => {
    const v = searchParams[k];
    return typeof v === "string" ? v : "";
  };
  const ingenioRaw = get("ingenio");
  const ingenio: Filtros["ingenio"] = INGENIOS.some((i) => i.id === ingenioRaw)
    ? (ingenioRaw as IngenioId)
    : "all";
  return {
    ingenio,
    lote: get("lote"),
    desde: get("desde"),
    hasta: get("hasta"),
    busca: get("busca"),
  };
}

export function countFiltrosActivos(f: Filtros): number {
  return [f.ingenio !== "all", f.lote !== "", f.desde !== "", f.hasta !== "", f.busca !== ""].filter(
    Boolean,
  ).length;
}

export function enRangoFecha(fecha: string, desde: string, hasta: string): boolean {
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}
