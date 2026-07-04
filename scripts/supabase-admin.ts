// Cliente de Supabase con service-role para scripts one-off (fuera del request
// lifecycle de Next.js, por eso no puede usar lib/supabase/server.ts que depende de
// cookies()). Lee .env.local a mano porque estos scripts corren con `tsx`, sin el
// loader de env de Next.js.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

export function createAdminScriptClient() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
  }
  return createClient<Database>(url, key);
}

export const LEGACY_HTML_PATH = path.join(__dirname, "..", "..", "index_10.html");

// Extrae el texto literal de un array `const NOMBRE = [ ... ];` de index_10.html
// contando balance de corchetes (soporta comas/objetos anidados sin parsear JS entero).
export function extractArrayLiteral(source: string, constName: string): string {
  const startMarker = `const ${constName} = [`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`No se encontró "${startMarker}" en index_10.html`);
  }
  const arrayStart = startIdx + startMarker.length - 1; // posición del '['
  let depth = 0;
  for (let i = arrayStart; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) return source.slice(arrayStart, i + 1);
    }
  }
  throw new Error(`No se encontró el cierre del array ${constName}`);
}

// index_10.html no es JSON (comillas simples, keys sin comillas) pero SÍ es JS válido —
// se evalúa como tal. Seguro porque es nuestro propio archivo fuente, no input externo.
export function evalArrayLiteral<T>(literal: string): T[] {
  return new Function(`return (${literal});`)() as T[];
}
