import { IconLock } from "@tabler/icons-react";

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center justify-center gap-1.5 bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      <IconLock size={13} className="shrink-0" />
      Modo solo lectura — podés ver todo el sistema, pero no hacer cambios.
    </div>
  );
}
