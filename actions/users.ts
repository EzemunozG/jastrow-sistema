"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const createUserSchema = z.object({
  email: z.email(),
  username: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["admin", "user"]),
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
  });
  if (error) throw new Error(error.message);

  if (parsed.data.role === "admin" && data.user) {
    await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
  }

  revalidatePath("/admin/usuarios");
}

export async function toggleUserDisabled(userId: string, disabled: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("profiles").update({ disabled }).eq("id", userId);
  revalidatePath("/admin/usuarios");
}
