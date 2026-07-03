"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const appSettingsSchema = z.object({
  precio_bolsa: z.coerce.number().nonnegative(),
  tc_oficial: z.coerce.number().positive(),
  tc_blue: z.coerce.number().positive(),
  tc_ccl: z.coerce.number().positive(),
});

export type AppSettingsActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const APP_SETTINGS_ACTION_IDLE: AppSettingsActionState = {
  status: "idle",
};

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
