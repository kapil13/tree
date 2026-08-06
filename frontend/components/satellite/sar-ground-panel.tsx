"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radar, RefreshCw } from "lucide-react";
import { sar } from "@/lib/api";
import { showToast } from "@/components/toast";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

const GROUND_STATUS_LABELS: Record<string, string> = {
  stable: "Stable",
  moist: "Moist ground",
  hidden_moisture: "Hidden moisture",
  wetland_risk: "Wetland risk",
};

function statusBadge(status: string | null | undefined) {
  if (!status) return "bg-stone-100 text-stone-600";
  if (status === "stable") return "bg-emerald-100 text-emerald-800";
  if (status === "hidden_moisture" || status === "wetland_risk") return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-900";
}

export function SarGroundPanel({
  fenceId,
  compact = false,
}: {
  fenceId: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const statusQ = useQuery({
    queryKey: ["sar-status"],
    queryFn: () => sar.status(),
    retry: false,
  });
  const monitoringQ = useQuery({
    queryKey: ["sar-monitoring", fenceId],
    queryFn: () => sar.fenceMonitoring(fenceId),
    enabled: Boolean(fenceId),
  });

  const scan = useMutation({
    mutationFn: () => sar.scanFence(fenceId),
    onSuccess: (data) => {
      showToast(`SAR scan complete — ${GROUND_STATUS_LABELS[data.analysis.ground_status] ?? data.analysis.ground_status}`);
      qc.invalidateQueries({ queryKey: ["sar-monitoring", fenceId] });
      qc.invalidateQueries({ queryKey: ["intelligence-satellite-fusion"] });
    },
    onError: (err) => showToast(errorMessage(err)),
  });

  const latest = monitoringQ.data?.latest;
  const analysis = latest?.analysis;

  return (
    <div className={cn("card space-y-3", compact && "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium text-stone-800">
            <Radar className="h-4 w-4 text-forest-700" />
            SAR ground intelligence
          </div>
          <p className="mt-1 text-xs text-stone-500">
            NISAR-inspired L/S-band — detects moisture, wetlands, and double-bounce under canopy.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={scan.isPending || !fenceId}
          onClick={() => scan.mutate()}
        >
          <RefreshCw className={cn("mr-1 inline h-3 w-3", scan.isPending && "animate-spin")} />
          Run SAR scan
        </button>
      </div>

      {statusQ.isError ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          SAR API is not available on this server yet — redeploy the latest backend to enable{" "}
          <strong>Run SAR scan</strong>.
        </p>
      ) : null}

      {statusQ.data ? (
        <p className="text-xs text-stone-500">{statusQ.data.message}</p>
      ) : null}

      {monitoringQ.isLoading ? (
        <p className="text-sm text-stone-500">Loading SAR data…</p>
      ) : latest ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
            <p className="text-xs uppercase tracking-wide text-stone-500">Ground status</p>
            <span
              className={cn(
                "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                statusBadge(analysis?.ground_status),
              )}
            >
              {GROUND_STATUS_LABELS[analysis?.ground_status ?? ""] ?? analysis?.ground_status ?? "Unknown"}
            </span>
          </div>
          <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
            <p className="text-xs uppercase tracking-wide text-stone-500">Wetland probability</p>
            <p className="mt-1 text-lg font-semibold">
              {latest.wetland_probability != null ? `${Math.round(latest.wetland_probability * 100)}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
            <p className="text-xs uppercase tracking-wide text-stone-500">L-band HH</p>
            <p className="mt-1 font-mono text-sm">{latest.l_band_hh_db?.toFixed(1) ?? "—"} dB</p>
          </div>
          <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
            <p className="text-xs uppercase tracking-wide text-stone-500">S-band HH</p>
            <p className="mt-1 font-mono text-sm">{latest.s_band_hh_db?.toFixed(1) ?? "—"} dB</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-500">No SAR scan yet — run one to check ground moisture under the canopy.</p>
      )}

      {analysis?.summary ? (
        <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700 dark:bg-stone-900">{analysis.summary}</p>
      ) : null}

      {analysis?.findings?.length ? (
        <ul className="space-y-2 text-sm">
          {analysis.findings.map((f) => (
            <li key={f.name} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
              <span className="font-medium capitalize">{f.name.replaceAll("_", " ")}</span>
              <span className="ml-2 text-xs uppercase text-amber-800">{f.severity}</span>
              <p className="mt-1 text-xs">{f.evidence}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
