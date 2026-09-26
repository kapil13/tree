"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SarRecord } from "@/lib/api";
import { sarIntegrityColor } from "@/lib/sar-labels";

export function SarIntegrityTrendChart({
  points,
  height = 200,
}: {
  points: SarRecord[];
  height?: number;
}) {
  const data = points
    .map((p) => ({
      date: p.scene_acquired_at,
      label: new Date(p.scene_acquired_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: p.fusion?.forest_integrity_score ?? null,
    }))
    .filter((p) => p.score != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (data.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
        Run at least two SAR scans to see Forest Integrity trends over time.
      </p>
    );
  }

  const latestScore = data[data.length - 1]?.score ?? 50;
  const stroke = sarIntegrityColor(latestScore);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sarIntegrityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" width={32} />
          <Tooltip
            formatter={(value: number) => [`${value} / 100`, "Forest Integrity"]}
            labelFormatter={(label) => `Scan · ${label}`}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#sarIntegrityFill)"
            dot={{ r: 3, fill: stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
