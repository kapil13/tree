"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Download, Radar } from "lucide-react";
import { plantingProjects, sar } from "@/lib/api";
import { SarIntegrityTrendChart } from "@/components/satellite/sar-integrity-trend-chart";

export function SarIntelligencePanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["monitoring-summary", "sar-panel"],
    queryFn: () => plantingProjects.monitoringSummary(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="dash-panel">
        <p className="text-sm text-stone-500">Loading SAR intelligence…</p>
      </div>
    );
  }

  if (!data) return null;

  const atRisk = data.sar_at_risk_work_areas ?? 0;
  const divergent = data.sar_divergent_work_areas ?? 0;
  const aligned = data.sar_aligned_work_areas ?? 0;
  const avgIntegrity = data.sar_avg_forest_integrity;
  const openTasks = data.open_sar_field_verifications?.length ?? 0;

  const topAtRisk =
    data.work_area_monitoring
      ?.filter((wa) => wa.sar_at_risk || (wa.sar_forest_integrity != null && wa.sar_forest_integrity < 50))
      .sort((a, b) => (a.sar_forest_integrity ?? 100) - (b.sar_forest_integrity ?? 100))
      .slice(0, 4) ?? [];

  const handleExport = async () => {
    const blob = new Blob([await sar.portfolioExport()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sar-portfolio-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2 className="dash-panel-title flex items-center gap-2">
            <Radar className="h-4 w-4 text-forest-600" />
            SAR Forest Integrity
          </h2>
          <p className="dash-panel-sub">
            NISAR-inspired ground intelligence across your work areas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs hover:bg-stone-50"
            onClick={() => void handleExport()}
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          <Link href="/portfolio-health?tab=monitoring" className="dash-link">
            Monitoring <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <SarKpi label="Avg integrity" value={avgIntegrity != null ? String(avgIntegrity) : "—"} warn={avgIntegrity != null && avgIntegrity < 50} />
        <SarKpi label="At risk" value={String(atRisk)} warn={atRisk > 0} />
        <SarKpi label="Divergent" value={String(divergent)} warn={divergent > 0} />
        <SarKpi label="Field tasks" value={String(openTasks)} warn={openTasks > 0} />
      </div>

      <p className="mt-3 text-xs text-stone-500">
        {aligned} aligned · {data.sar_live_providers ?? 0} live SAR providers ·{" "}
        {data.sar_stub_providers ?? 0} stub
      </p>

      {topAtRisk.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {topAtRisk.map((wa) => (
            <li key={wa.id}>
              <Link
                href={`/satellite?fence=${wa.id}`}
                className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:border-forest-300 hover:bg-forest-50/50"
              >
                <span className="font-medium text-stone-800">{wa.name}</span>
                <span className="text-xs text-amber-800">
                  {wa.sar_forest_integrity != null ? `Integrity ${wa.sar_forest_integrity}` : "No SAR"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg bg-stone-50 px-3 py-4 text-sm text-stone-600">
          No at-risk SAR sites — continue routine monitoring from the{" "}
          <Link href="/satellite" className="text-forest-700 hover:underline">
            satellite page
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function SarKpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${warn ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-stone-50"}`}>
      <p className="text-[10px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`text-lg font-semibold ${warn ? "text-amber-900" : "text-stone-900"}`}>{value}</p>
    </div>
  );
}

/** Compact trend for dashboard when a fence is selected */
export function SarIntegrityTrendPreview({ fenceId }: { fenceId: string }) {
  const { data } = useQuery({
    queryKey: ["sar-monitoring", fenceId, "preview"],
    queryFn: () => sar.fenceMonitoring(fenceId),
    enabled: Boolean(fenceId),
    staleTime: 60_000,
  });

  if (!data?.points?.length) return null;

  return (
    <div className="dash-panel mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Integrity trend (primary site)
      </p>
      <div className="mt-3">
        <SarIntegrityTrendChart points={data.points} height={160} />
      </div>
    </div>
  );
}
