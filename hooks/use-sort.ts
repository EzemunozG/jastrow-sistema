"use client";

import { useMemo, useState } from "react";

export function useSort<T, K extends string>(
  rows: T[],
  getters: Record<K, (row: T) => number | string>,
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
