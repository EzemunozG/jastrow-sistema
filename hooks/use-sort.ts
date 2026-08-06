"use client";

import { useMemo, useState } from "react";

// Un getter puede devolver `null` para "este valor no existe" (ej. el INFRARUT sin
// fecha transcripta de la libreta). Esos van SIEMPRE al final, en asc y en desc:
// invertirlos con el resto los pondría arriba de todo al ordenar descendente, que es
// justo donde no se los quiere.
export function useSort<T, K extends string>(
  rows: T[],
  getters: Record<K, (row: T) => number | string | null>,
  initialKey: K,
  initialDir: "asc" | "desc" = "asc",
) {
  const [key, setKey] = useState<K>(initialKey);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);

  const sorted = useMemo(() => {
    const getter = getters[key];
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av === null || bv === null) {
        if (av === null && bv === null) return 0;
        return av === null ? 1 : -1;
      }
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
    // `getters` es un objeto literal nuevo por render; ordenar una tabla chica en cada
    // cambio es más barato que forzar al caller a memoizarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, dir]);

  function toggle(k: K) {
    if (k === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(k);
      setDir("asc");
    }
  }

  return { sorted, sortKey: key, sortDir: dir, toggleSort: toggle };
}
