"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Se suscribe a cambios de Postgres (INSERT/UPDATE/DELETE) en las tablas dadas y
// pide un refresh de la Server Component (router.refresh()) — así dos usuarios
// mirando Viajes/Reconciliación/Alertas al mismo tiempo ven los datos actualizados
// sin recargar la página a mano. Requiere que las tablas estén agregadas a la
// publicación `supabase_realtime` (ver supabase/migrations/20260705000000_realtime.sql).
// Los eventos se debounce 400ms para no disparar un refresh por cada fila cuando se
// importa un Excel grande (ej. 148 filas de INFRARUT de una sola vez).
export function useRealtimeTable(tables: string[]) {
  const router = useRouter();
  const tablesKey = tables.join(",");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const scheduleRefresh = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => router.refresh(), 400);
    };

    // Las tablas tienen RLS habilitado, así que Realtime solo reenvía postgres_changes
    // si el socket está autenticado con el JWT del usuario (no alcanza con la anon key
    // con la que arranca el cliente) — hay que pasarlo explícitamente antes de suscribir.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase.channel(`realtime-${tablesKey}`);
      for (const table of tablesKey.split(",")) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          scheduleRefresh,
        );
      }
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey]);
}
