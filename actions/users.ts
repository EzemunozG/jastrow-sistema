"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const createUserSchema = z.object({
  email: z.email(),
  username: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["admin", "user", "viewer"]),
});

export async function createUser(formData: FormData) {
  // Server Action = límite de confianza: nunca alcanza con ocultar el botón en la UI.
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { username: parsed.data.username },
    // app_metadata es solo descriptivo acá — el gate real (app + RLS) lee
    // profiles.role, ver la nota en la migración 20260728000000_viewer_role.sql.
    app_metadata: { role: parsed.data.role },
  });
  if (error) throw new Error(error.message);

  // profiles.role ya viene en 'user' por default (trigger handle_new_user) — solo
  // hace falta un update para admin/viewer.
  if (parsed.data.role !== "user" && data.user) {
    await admin
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", data.user.id);
  }

  revalidatePath("/admin/usuarios");
}

export async function toggleUserDisabled(userId: string, disabled: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("profiles").update({ disabled }).eq("id", userId);
  // El flag en profiles solo lo mira la app (lib/dal.ts) — el ban a nivel de
  // Supabase Auth es lo que realmente impide emitir tokens nuevos, incluso si
  // alguien le pega a la API de Supabase directo con la anon key.
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: disabled ? "876000h" : "none",
  });
  revalidatePath("/admin/usuarios");
}
