import { Skeleton } from "@/components/ui/skeleton";

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="min-w-[150px] flex-1 space-y-2 rounded-xl border bg-white p-3"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="flex gap-4 border-b p-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b p-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-8 w-36" />
        </div>
      ))}
    </div>
  );
}

// Página con filtros + resumen + tabla (Rendimiento, Reconciliación, Listado).
export function FilteredPageSkeleton() {
  return (
    <div className="space-y-6">
      <FilterBarSkeleton />
      <CardsSkeleton count={4} />
      <TableSkeleton />
    </div>
  );
}

// Página de cards + tabla simple (Resumen, Tendencia, Alertas, Campo, Stock).
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <CardsSkeleton count={5} />
      <TableSkeleton />
    </div>
  );
}
