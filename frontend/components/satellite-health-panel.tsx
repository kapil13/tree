"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, Leaf, Loader2, ShieldAlert, Stethoscope } from "lucide-react";
import { satelliteHealth, errorMessage } from "@/lib/api";

export type SatelliteHealthAnalysis = {
  id: string;
  risk_level: string;
  health_status: string;
  summary: string;
  ndvi_current: number | null;
  ndvi_trend: string | null;
  pest_control_needed: boolean;
  disease_control_needed: boolean;
  findings: {
    category: string;
    name: string;
    confidence: number;
    severity: string;
    evidence: string;
  }[];
  treatments: {
    category: string;
    action: string;
    product_or_method: string;
    priority: string;
    timing: string;
    notes?: string;
  }[];
  monitoring_plan: string[];
  overall_confidence: number | null;
  created_at: string;
};

const RISK_STYLE: Record<string, string> = {
  low: "bg-green-50 text-green-800 border-green-200",
  moderate: "bg-amber-50 text-amber-900 border-amber-200",
  high: "bg-orange-50 text-orange-900 border-orange-200",
  critical: "bg-rose-50 text-rose-900 border-rose-200",
};

const PRIORITY_STYLE: Record<string, string> = {
  info: "border-stone-200 bg-stone-50",
  warning: "border-amber-200 bg-amber-50",
  critical: "border-rose-300 bg-rose-50",
};

type Props =
  | { kind: "tree"; targetId: string }
  | { kind: "fence"; targetId: string };

export function SatelliteHealthPanel({ kind, targetId }: Props) {
  const qc = useQueryClient();
  const queryKey = ["satellite-health", kind, targetId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () =>
      kind === "tree"
        ? satelliteHealth.latestTree(targetId)
        : satelliteHealth.latestFence(targetId),
    retry: false,
  });

  const run = useMutation({
    mutationFn: () =>
      kind === "tree"
        ? satelliteHealth.analyzeTree(targetId)
        : satelliteHealth.analyzeFence(targetId),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
          <Stethoscope className="h-4 w-4 text-forest-700" />
          Satellite AI health
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={run.isPending}
          onClick={() => run.mutate()}
        >
          {run.isPending ? "Analysing…" : "Run analysis"}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {(error || (!data && !isLoading)) && !run.isPending && (
        <p className="text-sm text-stone-500">
          {error
            ? "No analysis yet — rescan NDVI monthly, then run analysis."
            : "Run analysis after NDVI scans to get pest & disease recommendations."}
        </p>
      )}

      {run.error && (
        <p className="text-sm text-rose-700">{errorMessage(run.error)}</p>
      )}

      {data && (
        <>
          <div
            className={`rounded-md border px-3 py-2 text-sm ${RISK_STYLE[data.risk_level] ?? RISK_STYLE.moderate}`}
          >
            <div className="font-semibold capitalize">{data.risk_level} risk · {data.health_status.replace(/_/g, " ")}</div>
            <p className="mt-1">{data.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {data.pest_control_needed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-900">
                <Bug className="h-3 w-3" /> Pest control advised
              </span>
            )}
            {data.disease_control_needed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-orange-900">
                <ShieldAlert className="h-3 w-3" /> Disease treatment advised
              </span>
            )}
            {!data.pest_control_needed && !data.disease_control_needed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-800">
                <Leaf className="h-3 w-3" /> No urgent treatment
              </span>
            )}
          </div>

          {data.findings.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-stone-500">Findings</div>
              <ul className="space-y-1.5">
                {data.findings.map((f) => (
                  <li key={f.name} className="rounded-md bg-stone-50 px-2 py-1.5 text-xs">
                    <span className="font-medium capitalize">{f.name.replace(/_/g, " ")}</span>
                    <span className="text-stone-500"> · {f.severity}</span>
                    <p className="text-stone-600">{f.evidence}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.treatments.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-stone-500">Treatment plan</div>
              <ul className="space-y-2">
                {data.treatments.map((t, i) => (
                  <li
                    key={`${t.category}-${i}`}
                    className={`rounded-md border px-2 py-2 text-xs ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.info}`}
                  >
                    <div className="font-semibold capitalize text-stone-800">
                      {t.category} · {t.timing}
                    </div>
                    <p className="mt-0.5 text-stone-700">{t.action}</p>
                    <p className="mt-1 text-stone-600">
                      <strong>Method:</strong> {t.product_or_method}
                    </p>
                    {t.notes && <p className="mt-1 text-stone-500">{t.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.monitoring_plan.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-stone-500">Monitoring</div>
              <ul className="list-disc pl-4 text-xs text-stone-600 space-y-0.5">
                {data.monitoring_plan.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {data.overall_confidence != null && (
            <p className="text-[10px] text-stone-400">
              Confidence {Math.round(data.overall_confidence * 100)}% · NDVI trend: {data.ndvi_trend}
            </p>
          )}
        </>
      )}
    </div>
  );
}
