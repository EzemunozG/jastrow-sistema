// Schema, tipos y estado inicial del form de app_settings. Vive fuera de
// actions/app-settings.ts porque un archivo "use server" solo puede exportar
// funciones async — cualquier const/schema exportado ahí revienta en runtime
// ("A 'use server' file can only export async functions, found object").
import { z } from "zod";

export const appSettingsSchema = z.object({
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
