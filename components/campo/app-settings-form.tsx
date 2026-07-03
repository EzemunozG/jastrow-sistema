"use client";

import { useActionState } from "react";
import { updateAppSettings } from "@/actions/app-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/database.types";
import { PESO_BOLSA } from "@/lib/costos";
import { APP_SETTINGS_ACTION_IDLE } from "@/lib/forms/app-settings";

type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];

export function AppSettingsForm({ settings }: { settings: AppSettings }) {
  const [state, action, pending] = useActionState(
    updateAppSettings,
    APP_SETTINGS_ACTION_IDLE,
  );

  const bolsaUSD =
    settings.precio_bolsa > 0
      ? (settings.precio_bolsa / settings.tc_blue).toFixed(2)
      : null;
  const kgUSD =
    settings.precio_bolsa > 0
      ? (settings.precio_bolsa / PESO_BOLSA / settings.tc_blue).toFixed(4)
      : null;

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="precio_bolsa">Precio bolsa de azúcar (50 kg)</Label>
          <Input
            id="precio_bolsa"
            name="precio_bolsa"
            type="number"
            step="1"
            defaultValue={settings.precio_bolsa}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tc_oficial">TC oficial</Label>
          <Input
            id="tc_oficial"
            name="tc_oficial"
            type="number"
            step="1"
            defaultValue={settings.tc_oficial}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tc_blue">TC blue</Label>
          <Input
            id="tc_blue"
            name="tc_blue"
            type="number"
            step="1"
            defaultValue={settings.tc_blue}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tc_ccl">TC CCL</Label>
          <Input
            id="tc_ccl"
            name="tc_ccl"
            type="number"
            step="1"
            defaultValue={settings.tc_ccl}
          />
        </div>
      </div>

      {bolsaUSD && kgUSD && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
            ${(settings.precio_bolsa / PESO_BOLSA).toFixed(0)}/kg
          </span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
            USD {bolsaUSD}/bolsa (blue ${settings.tc_blue})
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
            USD {kgUSD}/kg
          </span>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {state.status === "success" && (
        <span className="ml-2 text-xs text-emerald-700">Guardado.</span>
      )}
    </form>
  );
}
