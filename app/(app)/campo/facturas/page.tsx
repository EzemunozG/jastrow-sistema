export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { FacturasTable } from "@/components/campo/facturas-table";

export default async function FacturasPage() {
  const supabase = await createClient();
  const [{ data: facturas }, { data: items }] = await Promise.all([
    supabase.from("facturas").select("*").order("fecha", { ascending: false }),
    supabase.from("factura_items").select("*"),
  ]);

  const itemsByFactura = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const arr = itemsByFactura.get(it.factura_id) ?? [];
    arr.push(it);
    itemsByFactura.set(it.factura_id, arr);
  }

  const withDetails = await Promise.all(
    (facturas ?? []).map(async (f) => {
      let imgUrl: string | null = null;
      if (f.img_path) {
        const { data } = await supabase.storage
          .from("facturas-imgs")
          .createSignedUrl(f.img_path, 3600);
        imgUrl = data?.signedUrl ?? null;
      }
      return { ...f, items: itemsByFactura.get(f.id) ?? [], imgUrl };
    }),
  );

  return <FacturasTable facturas={withDetails} />;
}
