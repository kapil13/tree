"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trees, errorMessage } from "@/lib/api";
import { NdviImagePreview } from "@/components/ndvi-image-preview";
import { NdviStatsPanel } from "@/components/ndvi-stats-panel";
import { Sparkles, Satellite, Download } from "lucide-react";

export default function TreeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: tree, isLoading } = useQuery({
    queryKey: ["tree", id],
    queryFn: () => trees.get(id),
  });
  const { data: sat } = useQuery({
    queryKey: ["sat", id],
    queryFn: () => trees.satellite(id),
    enabled: !!id,
  });

  const analyze = useMutation({
    mutationFn: () => trees.analyze(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tree", id] }),
  });

  if (isLoading) return <div>Loading…</div>;
  if (!tree) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {tree.species_text || "Unknown species"}
          </h1>
          <div className="font-mono text-xs text-stone-500">{tree.public_code}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={() => analyze.mutate()}
            disabled={analyze.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {analyze.isPending ? "Analyzing…" : "Run AI analysis"}
          </button>
          <a
            href={`/api/v1/trees/${id}/passport.pdf`}
            className="btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-4 w-4" /> Passport PDF
          </a>
        </div>
      </header>

      {analyze.error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage(analyze.error)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Detail label="Health">{tree.current_health}</Detail>
        <Detail label="Carbon stored">{Number(tree.current_carbon_kg).toFixed(2)} kg</Detail>
        <Detail label="Satellite verified">
          {tree.satellite_verified ? "✓ Yes" : "Pending"}
        </Detail>
        <Detail label="DBH">{tree.current_dbh_cm ? `${tree.current_dbh_cm} cm` : "—"}</Detail>
        <Detail label="Height">{tree.current_height_m ? `${tree.current_height_m} m` : "—"}</Detail>
        <Detail label="Canopy">{tree.current_canopy_m ? `${tree.current_canopy_m} m` : "—"}</Detail>
      </div>

      {(sat?.points?.length ?? 0) > 0 && sat && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="mb-3 flex items-center gap-2">
                <Satellite className="h-4 w-4 text-forest-700" />
                <h2 className="text-sm font-medium">NDVI map (10 m chip)</h2>
              </div>
              <NdviImagePreview
                treeId={id}
                ndvi={sat.latest?.ndvi_mean ?? sat.points[sat.points.length - 1]?.ndvi}
              />
            </div>

            <div className="card">
              <div className="mb-3 flex items-center gap-2">
                <Satellite className="h-4 w-4 text-forest-700" />
                <h2 className="text-sm font-medium">NDVI parameters (Sentinel-2)</h2>
              </div>
              <NdviStatsPanel latest={sat.latest} resolutionLabel="10 m chip" />
            </div>
          </div>

          <div className="card">
            <div className="mb-2 flex items-center gap-2">
              <Satellite className="h-4 w-4 text-forest-700" />
              <h2 className="text-sm font-medium">NDVI time series</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sat.points.map((p) => ({
                    date: new Date(p.ts).toISOString().slice(0, 7),
                    ndvi: p.ndvi,
                  }))}
                >
                  <defs>
                    <linearGradient id="ndvi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="date" fontSize={12} stroke="#78716c" />
                  <YAxis domain={[0, 1]} fontSize={12} stroke="#78716c" />
                  <Tooltip
                    formatter={(value: number) => [value.toFixed(3), "NDVI mean"]}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="ndvi"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fill="url(#ndvi)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
        {children}
      </div>
    </div>
  );
}
