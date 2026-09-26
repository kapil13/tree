"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { time: string; mean_ppb: number };

export function EmissionsTropomiChart({ series }: { series: Point[] }) {
  if (!series.length) {
    return (
      <p className="text-sm text-stone-500">No TROPOMI time series yet. Run a CH₄ scan to populate the chart.</p>
    );
  }

  const data = series.map((row) => ({
    label: new Date(row.time).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
    mean_ppb: row.mean_ppb,
  }));

  return (
    <div className="h-48 w-full" role="img" aria-label="TROPOMI methane time series chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={48} />
          <Tooltip />
          <Line type="monotone" dataKey="mean_ppb" stroke="#047857" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
