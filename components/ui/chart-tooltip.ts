import type { CSSProperties } from "react";

// Estilo de tooltip de Recharts que sigue los tokens de tema (claro/oscuro) — la
// librería por defecto lo pinta con fondo blanco fijo, que en dark queda un recuadro
// blanco sobre fondo oscuro. Se referencian las CSS vars directamente porque los
// props de estilo de Recharts son objetos de estilo inline (no aceptan clases
// Tailwind). Spread en cada <Tooltip {...chartTooltipProps} formatter=... />.
export const chartTooltipProps: {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
} = {
  contentStyle: {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.12)",
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11, marginBottom: 2 },
  itemStyle: { color: "var(--popover-foreground)" },
};
