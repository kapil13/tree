"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboard } from "@/lib/api";

const COLORS = ["#16a34a", "#f59e0b", "#dc2626", "#78716c", "#0ea5e9", "#a855f7", "#0f766e"];

function fmt(n: number, suffix = "") {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboard.get,
  });

  if (isLoading) return <div className="p-6 text-stone-600">Loading dashboard…</div>;
  if (error)
    return (
      <div className="card text-rose-700">
        Failed to load dashboard. Are you signed in and is the API reachable?
      </div>
    );

  const k = data!.kpi;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Trees" value={fmt(k.total_trees)} sub="registered" />
        <Kpi label="Biomass" value={fmt(k.total_biomass_kg / 1000, " t")} sub="dry matter" />
        <Kpi label="CO₂e" value={fmt(k.total_co2e_kg / 1000, " t")} sub={`+${fmt(k.annual_sequestration_kg / 1000, " t/yr")}`} />
        <Kpi label="Lifetime credits" value={fmt(k.lifetime_credits_tco2e, " tCO₂e")} sub={`$${fmt(k.estimated_revenue_usd)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-stone-700">Carbon growth (6 mo)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data!.carbon_growth}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#78716c" fontSize={12} />
                <YAxis stroke="#78716c" fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#16a34a"
                  fill="url(#g)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-medium text-stone-700">Health distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data!.health_distribution}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data!.health_distribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {data!.health_distribution.map((d, i) => (
              <span key={d.label} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {d.label} ({d.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-medium text-stone-700">Biodiversity (bioacoustic)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Recordings"
            value={fmt(data!.bioacoustic?.total_recordings ?? 0)}
            sub="soundscapes"
          />
          <Kpi
            label="Health score"
            value={fmt(data!.bioacoustic?.avg_health_score ?? 0)}
            sub="avg / 100"
          />
          <Kpi
            label="Shannon H′"
            value={fmt(data!.bioacoustic?.avg_shannon_index ?? 0)}
            sub="diversity index"
          />
          <Kpi
            label="Fauna species"
            value={fmt(data!.bioacoustic?.total_species_detected ?? 0)}
            sub="detected"
          />
        </div>
        <a href="/bioacoustic" className="mt-3 inline-block text-sm text-forest-700 underline">
          Record ambient sound →
        </a>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-medium text-stone-700">Top species</h2>
        <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {data!.species_distribution.map((d) => (
            <li
              key={d.label}
              className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700"
            >
              <span className="truncate">{d.label}</span>
              <span className="font-medium text-forest-700">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
