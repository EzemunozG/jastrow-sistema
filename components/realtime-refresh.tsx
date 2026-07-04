"use client";

import { useRealtimeTable } from "@/hooks/useRealtimeTable";

// No renderiza nada — solo engancha useRealtimeTable() en un componente cliente para
// poder usarlo desde una page.tsx que es Server Component, sin convertir toda la vista
// a cliente.
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  useRealtimeTable(tables);
  return null;
}
