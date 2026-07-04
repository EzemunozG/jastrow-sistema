"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  appSettingsSchema,
  type AppSettingsActionState,
} from "@/lib/forms/app-settings";

export async function updateAppSettings(
  _prevState: AppSettingsActionState,
  formData: FormData,
): Promise<AppSettingsActionState> {
  const parsed = appSettingsSchema.safeParse({
    precio_bolsa: formData.get("precio_bolsa"),
    tc_oficial: formData.get("tc_oficial"),
    tc_blue: formData.get("tc_blue"),
    tc_ccl: formData.get("tc_ccl"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { status: "error", error: error.message };

  revalidatePath("/campo/costos");
  return { status: "success" };
}
