"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Shield } from "lucide-react";
import { errorMessage, plantingProjects } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";

export type CarbonIntegrityEnvelope = {
  leakage: {
    entry_count: number;
    total_net_leakage_tco2e: number;
    entries: Array<{
      leakage_type: string;
      net_leakage_tco2e: number;
    }>;
  };
  permanence: {
    nprt_score: number | null;
    buffer_pct: number | null;
    nprt_assessed_at: string | null;
    open_violations: number;
    sar_avg_forest_integrity: number | null;
    sar_ground_risk_sites: number;
    sar_work_areas_scanned: number;
  };
  article6: {
    authorization_ref: string | null;
    serial_count: number;
    article6_serial_count: number;
    retired_article6_count: number;
    corresponding_adjustment_refs: string[];
  };
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-sm font-medium text-stone-900">{value}</p>
    </div>
  );
}

export function ProjectPermanencePanel({
  projectId,
  onNavigateCredits,
}: {
  projectId: string;
  onNavigateCredits?: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["carbon-integrity", projectId],
    queryFn: () => plantingProjects.carbonIntegrity(projectId),
  });

  const exportWorksheet = useMutation({
    mutationFn: () => plantingProjects.exportLeakageWorksheet(projectId),
    onSuccess: (blob) => downloadBlob(blob, `leakage-worksheet.xlsx`),
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading permanence & leakage signals…</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-stone-500">
        Permanence dashboard unavailable — sync credits and run satellite monitoring.
      </p>
    );
  }

  const { leakage, permanence, article6 } = data;

  return (
    <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-sky-800" />
          <div>
            <h3 className="text-sm font-medium text-stone-800">Permanence &amp; leakage</h3>
            <p className="text-xs text-stone-600">
              SAR forest integrity, NPRT buffer, and leakage — not per-tree credit fusion scores.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1 text-xs"
          disabled={exportWorksheet.isPending}
          onClick={() => exportWorksheet.mutate()}
        >
          <Download className="h-3.5 w-3.5" />
          {exportWorksheet.isPending ? "Exporting…" : "Leakage worksheet (.xlsx)"}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Net leakage (tCO₂e)"
          value={leakage.total_net_leakage_tco2e.toFixed(4)}
        />
        <Metric
          label="NPRT buffer"
          value={
            permanence.buffer_pct != null
              ? `${(permanence.buffer_pct * 100).toFixed(0)}% (score ${permanence.nprt_score ?? "—"})`
              : "Not assessed"
          }
        />
        <Metric
          label="SAR integrity"
          value={permanence.sar_avg_forest_integrity ?? "—"}
        />
        <Metric
          label="Ground-risk sites"
          value={permanence.sar_ground_risk_sites}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Metric label="Leakage entries" value={leakage.entry_count} />
        <Metric label="Open violations" value={permanence.open_violations} />
        <Metric label="Article 6 serials" value={article6.article6_serial_count} />
        <Metric
          label="Host authorization ref"
          value={article6.authorization_ref ?? "—"}
        />
      </div>

      {leakage.entry_count === 0 ? (
        <p className="text-xs text-amber-800">
          No leakage accounts yet. Add entries on the{" "}
          {onNavigateCredits ? (
            <button type="button" className="font-medium underline" onClick={onNavigateCredits}>
              Credits tab
            </button>
          ) : (
            "Credits tab"
          )}{" "}
          under VM0047 accounting.
        </p>
      ) : null}

      {exportWorksheet.error ? (
        <p className="text-xs text-rose-700">{errorMessage(exportWorksheet.error)}</p>
      ) : null}
    </div>
  );
}
