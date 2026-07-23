"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INGENIOS, type IngenioId } from "@/lib/business-rules";
import { countFiltrosActivos, type Filtros } from "@/lib/filters";

export type LoteOption = { value: string; label: string; ingenioId: string };

// Controla los searchParams de la página que lo monta (Ingenio/Lote/Desde/Hasta, y
// opcionalmente Buscar remito) — la página del lado del server es la que realmente
// filtra los datos, este componente solo empuja la URL. `filtros` viene del server
// (ya parseado de searchParams) en vez de leer useSearchParams() acá, así el
// componente no necesita un <Suspense> propio.
export function FilterBar({
  filtros,
  lotes,
  showBusca = false,
  buscaLabel = "Buscar remito",
  buscaPlaceholder = "Ej: 6905",
}: {
  filtros: Filtros;
  lotes: LoteOption[];
  showBusca?: boolean;
  buscaLabel?: string;
  buscaPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState(filtros.busca);
  // Re-sincroniza `busca` cuando el searchParam cambia por fuera de este input (atrás/
  // adelante del navegador, "Limpiar filtros") — ajuste de estado durante el render en
  // vez de un efecto, siguiendo el patrón recomendado por React para esto.
  const [prevBusca, setPrevBusca] = useState(filtros.busca);
  if (filtros.busca !== prevBusca) {
    setPrevBusca(filtros.busca);
    setBusca(filtros.busca);
  }

  function push(patch: Partial<Filtros>) {
    const next = { ...filtros, ...patch };
    const params = new URLSearchParams();
    if (next.ingenio !== "all") params.set("ingenio", next.ingenio);
    if (next.lote) params.set("lote", next.lote);
    if (next.desde) params.set("desde", next.desde);
    if (next.hasta) params.set("hasta", next.hasta);
    if (next.busca) params.set("busca", next.busca);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Debounce de la búsqueda por remito para no navegar en cada tecla.
  useEffect(() => {
    if (!showBusca || busca === filtros.busca) return;
    const t = setTimeout(() => push({ busca }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const lotesDisponibles = lotes.filter(
    (l) => filtros.ingenio === "all" || l.ingenioId === filtros.ingenio,
  );
  const activos = countFiltrosActivos(filtros);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Ingenio</label>
        <Select
          value={filtros.ingenio}
          onValueChange={(v) =>
            push({ ingenio: v as IngenioId | "all", lote: "" })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {INGENIOS.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Lote</label>
        <Select
          value={filtros.lote || "todos"}
          onValueChange={(v) => push({ lote: v === "todos" ? "" : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {lotesDisponibles.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Desde</label>
        <Input
          type="date"
          value={filtros.desde}
          onChange={(e) => push({ desde: e.target.value })}
          className="w-[9.5rem]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Hasta</label>
        <Input
          type="date"
          value={filtros.hasta}
          onChange={(e) => push({ hasta: e.target.value })}
          className="w-[9.5rem]"
        />
      </div>

      {showBusca && (
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">{buscaLabel}</label>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={buscaPlaceholder}
            className="w-32"
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {activos > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-[#0F4C2B]/10 px-2.5 py-1 text-xs font-medium text-[#0F4C2B]">
            <Filter className="size-3" />
            {activos} filtro{activos > 1 ? "s" : ""}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
          disabled={activos === 0}
        >
          <X className="size-3.5" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
