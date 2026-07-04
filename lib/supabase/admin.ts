import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Cliente con la service-role key: bypassea RLS por completo.
// SOLO usar en Server Actions/scripts que ya hicieron su propio chequeo de is_admin()
// (ej. gestión de usuarios vía auth.admin.*, import de infraruts). Nunca importar
// este módulo desde un Client Component ni exponer la key al bundle del navegador.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
