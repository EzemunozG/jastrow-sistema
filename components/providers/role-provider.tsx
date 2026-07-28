"use client";

import { createContext, useContext } from "react";

export type Role = "admin" | "user" | "viewer";

const RoleContext = createContext<Role | null>(null);

// Evita hacer prop-drilling de "puede escribir" por cada componente cliente que
// tiene un botón/form de mutación (tablas de lotes, facturas, trabajos, recetas,
// stock, bajas ARCA, importadores...) — se lee una vez acá en vez de en cada page.tsx.
// El chequeo real de seguridad NO vive acá (esto es solo UI): ver requireWriter() en
// lib/dal.ts, que es el límite de confianza de verdad.
export function RoleProvider({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

function useRole(): Role {
  const role = useContext(RoleContext);
  if (!role) throw new Error("useRole debe usarse dentro de <RoleProvider>");
  return role;
}

export function useCanWrite(): boolean {
  return useRole() !== "viewer";
}

export function useIsViewer(): boolean {
  return useRole() === "viewer";
}
