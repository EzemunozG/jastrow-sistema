"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPCIONES = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "system", icon: Monitor, label: "Auto" },
  { value: "dark", icon: Moon, label: "Oscuro" },
] as const;

const ORDEN = ["light", "dark", "system"] as const;

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes solo sabe el tema real en el cliente — hasta montar, un placeholder
  // del mismo alto para no romper la hidratación ni saltar el layout.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div className="h-8" />;

  const actual = (theme ?? "system") as (typeof ORDEN)[number];

  if (collapsed) {
    const next = ORDEN[(ORDEN.indexOf(actual) + 1) % ORDEN.length];
    const Icon = actual === "dark" ? Moon : actual === "light" ? Sun : Monitor;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        title={`Tema: ${OPCIONES.find((o) => o.value === actual)?.label}`}
        aria-label="Cambiar tema"
        className="flex items-center justify-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {OPCIONES.map((o) => {
        const active = actual === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            title={o.label}
            aria-label={`Tema ${o.label}`}
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="size-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
