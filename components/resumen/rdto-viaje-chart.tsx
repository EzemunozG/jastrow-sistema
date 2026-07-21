"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { META } from "@/lib/business-rules";

// Port de drawRdto() de index_10.html:1189-1208: barras de Rdto% por viaje del
// último día cargado, ordenadas por CP, con la meta como línea punteada. Coloreadas
// por ingenio (no por finca_id) porque desde el soporte multi-ingenio ese campo ya
// no distingue de forma unívoca entre ingenios — INFRARUT de Trinidad usa
// 'VIRGINIA' como placeholder genérico, no la finca "Tano" de Concepción. Mismos
// colores que tendencia-charts.tsx (validados dataviz).
const COLOR_CONCEPCION = "#378ADD";
const COLOR_TRINIDAD = "#1D9E75";
const COLOR_REF = "#BA7517";

export type RdtoViajePoint = {
  cp: string;
  CONCEPCION: number | null;
  TRINIDAD: number | null;
};

export function RdtoViajeChart({ data }: { data: RdtoViajePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="cp"
          tick={{ fontSize: 10 }}
          stroke="currentColor"
          className="text-neutral-400"
        />
        <YAxis
          domain={[8, 11]}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          stroke="currentColor"
          className="text-neutral-400"
          width={48}
        />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)}%`}
          labelFormatter={(cp) => `CP ${cp}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine
          y={META}
          stroke={COLOR_REF}
          strokeDasharray="5 5"
          strokeWidth={1.5}
          label={{
            value: `Meta ${META.toFixed(0)}%`,
            fontSize: 10,
            fill: COLOR_REF,
            position: "insideTopRight",
          }}
        />
        <Bar
          dataKey="CONCEPCION"
          name="Concepción"
          fill={COLOR_CONCEPCION}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="TRINIDAD"
          name="Trinidad"
          fill={COLOR_TRINIDAD}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
