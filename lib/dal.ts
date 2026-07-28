import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Data Access Layer: centraliza el chequeo de sesión (ver CLAUDE.md / Next.js auth guide).
// cache() evita repetir la consulta dentro del mismo render pass.
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  // Un usuario deshabilitado desde el panel de admin no debe poder seguir usando la
  // app aunque su sesión siga viva (además del ban a nivel Auth en actions/users.ts,
  // que corta los tokens nuevos — esto corta la sesión ya emitida).
  if (profile.disabled) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { user, profile };
});

export async function requireAdmin() {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/resumen");
  return profile;
}

// Mensaje reusado por el catch de cada Server Action que use requireWriter() en un
// formulario con useActionState, para mostrar el mismo texto que ve un viewer que
// llega a pegarle a la acción directamente (sin pasar por la UI, que ya se la oculta).
export const READ_ONLY_MESSAGE =
  "No tenés permiso para modificar datos (modo solo lectura).";

export class ReadOnlyError extends Error {
  constructor() {
    super(READ_ONLY_MESSAGE);
    this.name = "ReadOnlyError";
  }
}

// Límite de confianza para toda mutación (Server Action): la UI ya oculta los
// botones/forms para un viewer (ver useCanWrite en components/providers/role-
// provider.tsx), pero eso es cosmético — esto es lo que realmente bloquea la
// escritura si alguien le pega a la acción directo. Segunda línea de defensa: RLS
// (ver supabase/migrations/20260728000001_viewer_rls.sql).
export async function requireWriter() {
  const { profile } = await getCurrentProfile();
  if (profile.role === "viewer") throw new ReadOnlyError();
  return profile;
}
