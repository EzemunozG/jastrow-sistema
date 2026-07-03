import { createClient } from "@/lib/supabase/server";
import { LotesTable } from "@/components/campo/lotes-table";

export default async function LotesPage() {
  const supabase = await createClient();
  const [{ data: lotes }, { data: fincas }] = await Promise.all([
    supabase.from("lotes").select("*").order("id"),
    supabase.from("fincas").select("*").order("nombre"),
  ]);

  return <LotesTable lotes={lotes ?? []} fincas={fincas ?? []} />;
}
