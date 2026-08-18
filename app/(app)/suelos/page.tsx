export const dynamic = "force-dynamic";

import {
  LeyendaRangos,
  SuelosEmpty,
  SuelosLote,
} from "@/components/suelos/suelos-lote";
import { computeSuelos } from "@/lib/suelo";
import { createClient } from "@/lib/supabase/server";

export default async function SuelosPage() {
  const supabase = await createClient();
  const [{ data: analisis }, { data: planes }, { data: lotesIngenio }] =
    await Promise.all([
      supabase.from("analisis_suelo").select("*"),
      supabase.from("plan_fertilizacion").select("*").order("producto"),
      supabase.from("lotes_ingenio").select("lote_key, nombre, ha, surcos_por_ha"),
    ]);

  const lotes = computeSuelos({
    analisis: analisis ?? [],
    planes: planes ?? [],
    lotesIngenio: lotesIngenio ?? [],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Suelos</h1>
        <p className="text-sm text-muted-foreground">
          Los análisis de suelo de cada lote con su semáforo contra los rangos de
          referencia para caña, y debajo el plan de fertilización. Por ahora es solo
          lectura: la carga se hace desde la base.
        </p>
      </div>

      <LeyendaRangos />

      {lotes.length === 0 ? (
        <SuelosEmpty />
      ) : (
        <div className="space-y-4">
          {lotes.map((l) => (
            <SuelosLote key={l.lote_key} lote={l} />
          ))}
        </div>
      )}
    </div>
  );
}
