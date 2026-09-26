"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

type RadialGaugeProps = {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
};

export function RadialGauge({
  value,
  max = 100,
  label,
  sublabel,
  color = "#16a34a",
  size = 140,
}: RadialGaugeProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const data = [
    { name: "value", value: pct },
    { name: "rest", value: 100 - pct },
  ];

  return (
    <div className="dash-gauge" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            startAngle={220}
            endAngle={-40}
            innerRadius="72%"
            outerRadius="100%"
            stroke="none"
            paddingAngle={0}
          >
            <Cell fill={color} />
            <Cell fill="rgba(148, 163, 184, 0.18)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="dash-gauge-center">
        <span className="dash-gauge-value">{value.toFixed(max === 100 ? 0 : 1)}</span>
        {max === 100 && <span className="dash-gauge-unit">%</span>}
        <span className="dash-gauge-label">{label}</span>
        {sublabel && <span className="dash-gauge-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
}
