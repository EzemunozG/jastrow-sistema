"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

// Solo el botón/ícono de orden — el caller lo envuelve en su propio <th> o
// <TableHead>, para no imponer un padding/estilo de celda que puede no matchear
// (tablas shadcn vs. tablas planas con <table> a mano).
export function SortButton<K extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: K;
  activeKey: K;
  dir: "asc" | "desc";
  onSort: (key: K) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 transition-colors hover:text-neutral-900"
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 text-neutral-300" />
      )}
    </button>
  );
}
