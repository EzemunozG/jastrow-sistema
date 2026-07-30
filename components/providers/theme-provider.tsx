"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes: agrega/quita la clase `dark` en <html> según la elección (claro/oscuro/
// auto), la persiste en localStorage e inyecta un script que setea el tema ANTES del
// primer paint (sin flash blanco). `defaultTheme="system"` = auto por defecto.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
