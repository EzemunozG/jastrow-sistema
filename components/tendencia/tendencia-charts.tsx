"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Coloreado por ingenio (no por finca_id): desde el soporte multi-ingenio ese campo ya
// no distingue de forma unívoca entre ingenios — ver rdto-viaje-chart.tsx, mismo
// razonamiento y mismos colores (validados dataviz).
const COLOR_CONCEPCION = "#378ADD";
const COLOR_TRINIDAD = "#1D9E75";
const COLOR_REF = "#BA7517";

type SeriePoint = { fecha: string; CONCEPCION: number | null; TRINIDAD: number | null };

function TrendLineChart({
  data,
  domain,
  unit,
  referenceValue,
  referenceLabel,
}: {
  data: SeriePoint[];
  domain?: [number, number | "auto"];
  unit?: string;
  referenceValue?: number;
  referenceLabel?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-neutral-400"
        />
        <YAxis
          domain={domain}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toFixed(1)}${unit ?? ""}`}
          stroke="currentColor"
          className="text-neutral-400"
          width={48}
        />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)}${unit ?? ""}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {referenceValue !== undefined && (
          <ReferenceLine
            y={referenceValue}
            stroke={COLOR_REF}
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{ value: referenceLabel, fontSize: 10, fill: COLOR_REF, position: "insideTopRight" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="CONCEPCION"
          name="Concepción"
          stroke={COLOR_CONCEPCION}
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="TRINIDAD"
          name="Trinidad"
          stroke={COLOR_TRINIDAD}
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TendenciaCharts({
  rdtoData,
  polData,
  purezaData,
  rdtoDomain,
}: {
  rdtoData: SeriePoint[];
  polData: SeriePoint[];
  purezaData: SeriePoint[];
  rdtoDomain: [number, number];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold">Rendimiento % — tendencia</h3>
        <TrendLineChart
          data={rdtoData}
          domain={rdtoDomain}
          unit="%"
          referenceValue={10}
          referenceLabel="Meta"
        />
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold">POL % — tendencia</h3>
        <TrendLineChart data={polData} unit="%" />
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold">Pureza % — tendencia</h3>
        <TrendLineChart
          data={purezaData}
          domain={[82, "auto"]}
          unit="%"
          referenceValue={85}
          referenceLabel="Mín 85%"
        />
      </div>
    </div>
  );
}
