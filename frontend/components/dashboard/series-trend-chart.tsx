"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SeriesPoint = { label: string; value: number };

export function SeriesTrendChart({
  data,
  color = "#15803d",
  height = 120,
  domain,
  baseline,
  target,
  valueFormatter = (v: number) => String(v),
}: {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  domain?: [number | "auto", number | "auto"];
  baseline?: number;
  target?: number;
  valueFormatter?: (value: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-stone-200 text-xs text-stone-500 dark:border-stone-700"
        style={{ height }}
      >
        —
      </div>
    );
  }

  const gradientId = `seriesFill-${color.replace("#", "")}`;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#94a3b8" interval="preserveStartEnd" />
          <YAxis
            domain={domain ?? ["auto", "auto"]}
            tick={{ fontSize: 9 }}
            stroke="#94a3b8"
            width={28}
            tickFormatter={(v) => (typeof v === "number" && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip
            formatter={(v: number) => [valueFormatter(v), ""]}
            contentStyle={{ borderRadius: 10, fontSize: 11, border: "1px solid #e7e5e4" }}
          />
          {baseline != null ? (
            <ReferenceLine
              y={baseline}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ) : null}
          {target != null ? (
            <ReferenceLine y={target} stroke="#0ea5e9" strokeDasharray="2 3" strokeWidth={1} />
          ) : null}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 2.5, fill: color }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
