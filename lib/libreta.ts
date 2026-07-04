// Helpers de display para "Libreta del Campo" — parsean el campo `obs` (string libre con
// formato "FINCA · desp.N · HH:MM · KG kg neto · obs", armado por
// lib/excel/parse-libreta.ts) para mostrar columnas separadas en la tabla. Portado tal
// cual de index_10.html:1640-1647 — "TANO"/"LAS100" son los nombres de los potreros del
// campo, no las mismas fincas LOTE4/VIRGINIA que usa INFRARUT (son clasificaciones
// distintas, no confundir finca_id con esto).
export type CpCampoDisplayRow = {
  cp: number;
  camion: string | null;
  obs: string | null;
};

export function getFinca(x: Pick<CpCampoDisplayRow, "obs">): "LAS100" | "TANO" {
  const o = (x.obs ?? "").toUpperCase();
  return o.includes("LAS100") || o.includes("LAS 100") || o.includes("LA 100")
    ? "LAS100"
    : "TANO";
}

export function getMatricula(x: Pick<CpCampoDisplayRow, "camion">): string {
  return (x.camion ?? "").split("/")[0].trim();
}

export function getCamNum(x: Pick<CpCampoDisplayRow, "camion">): string {
  const m = (x.camion ?? "").match(/cam\.?(\d+)/i);
  return m ? m[1] : "—";
}

export function getDesp(x: Pick<CpCampoDisplayRow, "obs">): string {
  const m = (x.obs ?? "").match(/desp\.?(\d+)/i);
  return m ? m[1] : "—";
}

export function getHora(x: Pick<CpCampoDisplayRow, "obs">): string {
  const m = (x.obs ?? "").match(/(\d{2}:\d{2})/);
  return m ? m[1] : "";
}
