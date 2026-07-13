import Link from "next/link";
import { INGENIOS, type IngenioId } from "@/lib/business-rules";

// Toggle server-side: cada opción es un link que setea ?ingenio= en la URL y la
// page vuelve a consultar con el filtro — mismo patrón de datos que el resto
// de las vistas (Server Component + query filtrada), sin estado cliente.
export function IngenioToggle({
  active,
  basePath,
}: {
  active: IngenioId;
  basePath: string;
}) {
  return (
    <div className="flex w-fit gap-1 rounded-lg border bg-white p-1">
      {INGENIOS.map((i) => (
        <Link
          key={i.id}
          href={`${basePath}?ingenio=${i.id}`}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            i.id === active
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {i.nombre}
        </Link>
      ))}
    </div>
  );
}
