"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/resumen", label: "Resumen" },
  { href: "/tendencia", label: "Tendencia" },
  { href: "/viajes", label: "Viajes" },
  { href: "/rendimiento", label: "Rendimiento" },
  { href: "/campo", label: "Campo" },
  { href: "/stock", label: "Stock & Recetas" },
  { href: "/alertas", label: "Alertas" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm transition-colors",
              active
                ? "border-[#0F4C2B] font-medium text-[#0F4C2B]"
                : "border-transparent text-neutral-500 hover:text-neutral-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
