"use client";

import { useQuery } from "@tanstack/react-query";
import { Ruler } from "lucide-react";
import { trees, errorMessage } from "@/lib/api";

export type TreeMeasurement = {
  id: string;
  tree_id: string;
  measured_at: string;
  source: string;
  method: string;
  instrument: string | null;
  measurer_id: string | null;
  dbh_cm: number | null;
  height_m: number | null;
  canopy_m: number | null;
  gps_accuracy_m: number | null;
  notes: string | null;
  uncertainty_dbh_pct: number | null;
  uncertainty_height_pct: number | null;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  registration: "Registration",
  survival_survey: "Survival survey",
  field_survey: "Field survey",
  import: "Import",
};

const METHOD_LABELS: Record<string, string> = {
  tape: "Tape (DBH @ 1.3 m)",
  caliper: "Caliper",
  clinometer: "Clinometer",
  photogrammetry: "Photogrammetry",
  ai_estimate: "AI estimate",
  visual_estimate: "Visual estimate",
};

function formatSource(source: string) {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, " ");
}

function formatMethod(method: string) {
  return METHOD_LABELS[method] ?? method.replace(/_/g, " ");
}

function formatMetric(value: number | null, unit: string, uncertainty: number | null) {
  if (value == null) return "—";
  const base = `${value} ${unit}`;
  if (uncertainty != null) return `${base} (±${uncertainty}%)`;
  return base;
}

export function TreeMeasurementsPanel({ treeId }: { treeId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tree-measurements", treeId],
    queryFn: () => trees.measurements(treeId),
    enabled: Boolean(treeId),
  });

  const items = data?.items ?? [];

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Ruler className="h-4 w-4 text-emerald-700" aria-hidden />
        <h2 className="text-sm font-medium text-stone-700">Measurement history</h2>
      </div>
      <p className="mb-4 text-xs text-stone-500">
        Repeated measurements with method and instrument provenance for MRV audit trails.
        DBH should be measured at 1.3 m above ground.
      </p>

      {isLoading && <p className="text-sm text-stone-500">Loading measurements…</p>}
      {error && (
        <p className="text-sm text-rose-700" role="alert">
          {errorMessage(error)}
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="text-sm text-stone-500">No measurement records yet.</p>
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">DBH</th>
                <th className="py-2 pr-3 font-medium">Height</th>
                <th className="py-2 pr-3 font-medium">Method</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row: TreeMeasurement) => (
                <tr key={row.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 pr-3 align-top text-stone-800">
                    {new Date(row.measured_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 align-top capitalize text-stone-700">
                    {formatSource(row.source)}
                  </td>
                  <td className="py-2 pr-3 align-top font-medium text-stone-900">
                    {formatMetric(row.dbh_cm, "cm", row.uncertainty_dbh_pct)}
                  </td>
                  <td className="py-2 pr-3 align-top font-medium text-stone-900">
                    {formatMetric(row.height_m, "m", row.uncertainty_height_pct)}
                  </td>
                  <td className="py-2 pr-3 align-top text-stone-700">{formatMethod(row.method)}</td>
                  <td className="py-2 align-top text-stone-600">{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
