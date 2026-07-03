"use client";

import { useActionState } from "react";
import { IconPlant } from "@tabler/icons-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a3320] via-[#0F4C2B] to-[#1a6b3f] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F2EB] text-[#0F4C2B]">
            <IconPlant size={26} />
          </div>
          <div className="text-2xl font-bold tracking-wide text-[#0F4C2B]">
            JASTROW
          </div>
          <div className="mt-0.5 text-xs text-neutral-400">
            Sistema de Control de Rendimientos · Zafra 2026
          </div>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Ingresá tu email"
              autoComplete="username"
              required
            />
            {state?.errors?.email && (
              <p className="text-xs text-red-600">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Ingresá tu contraseña"
              autoComplete="current-password"
              required
            />
            {state?.errors?.password && (
              <p className="text-xs text-red-600">
                {state.errors.password[0]}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#0F4C2B] hover:bg-[#1A6B3F]"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </Button>
          {state?.message && (
            <p className="text-center text-sm text-red-600">
              {state.message}
            </p>
          )}
        </form>

        <div className="mt-6 text-center text-[11px] text-neutral-400">
          Jastrow Inver Group S.A. · Zafra 2026
        </div>
      </div>
    </div>
  );
}
