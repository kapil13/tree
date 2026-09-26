"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radar, RefreshCw } from "lucide-react";
import { sar } from "@/lib/api";
import { showToast } from "@/components/toast";
import { errorMessage } from "@/lib/api";

export function SarTreePanel({ treeId }: { treeId: string }) {
  const qc = useQueryClient();
  const fusionQ = useQuery({
    queryKey: ["sar-fusion-tree", treeId],
    queryFn: () => sar.treeFusion(treeId),
    enabled: Boolean(treeId),
    retry: false,
  });

  const scan = useMutation({
    mutationFn: () => sar.scanTree(treeId),
    onSuccess: (data) => {
      showToast(
        data.fusion
          ? `SAR scan complete — Forest Integrity ${data.fusion.forest_integrity_score}/100`
          : "SAR scan complete.",
      );
      qc.invalidateQueries({ queryKey: ["sar-fusion-tree", treeId] });
      qc.invalidateQueries({ queryKey: ["sar-monitoring", treeId] });
    },
    onError: (err) => showToast(errorMessage(err)),
  });

  if (fusionQ.isError) {
    return (
      <div className="rounded-lg border border-stone-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Radar className="h-4 w-4 text-forest-700" />
            SAR ground check
          </div>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={scan.isPending}
            onClick={() => scan.mutate()}
          >
            <RefreshCw className={`mr-1 inline h-3 w-3 ${scan.isPending ? "animate-spin" : ""}`} />
            Run SAR scan
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          No SAR fusion yet — run a scan to check ground moisture under the canopy.
        </p>
      </div>
    );
  }

  const fusion = fusionQ.data;
  if (!fusion && fusionQ.isLoading) {
    return <p className="text-sm text-stone-500">Loading SAR fusion…</p>;
  }

  return (
    <div className="rounded-lg border border-stone-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Radar className="h-4 w-4 text-forest-700" />
          SAR Forest Integrity
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={scan.isPending}
          onClick={() => scan.mutate()}
        >
          <RefreshCw className={`mr-1 inline h-3 w-3 ${scan.isPending ? "animate-spin" : ""}`} />
          Rescan SAR
        </button>
      </div>
      {fusion ? (
        <>
          <p className="text-2xl font-semibold text-forest-900">
            {fusion.forest_integrity_score}
            <span className="text-sm font-normal text-stone-500"> / 100</span>
          </p>
          <p className="text-xs capitalize text-stone-600">
            {fusion.integrity_grade} · {fusion.monitoring_mode.replaceAll("_", " ")}
          </p>
          <p className="text-sm text-stone-700">{fusion.summary}</p>
        </>
      ) : null}
    </div>
  );
}
