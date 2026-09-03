"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { errorMessage, plantingProjects } from "@/lib/api";
import { cn } from "@/lib/cn";

function reasonLabel(reason: string): string {
  return reason.replace(/_/g, " ");
}

function auditBlockerLabel(reason: string): string {
  const labels: Record<string, string> = {
    insufficient_photos: "Need at least 2 photos",
    photo_span_too_short: "Photos must span 30+ days",
    satellite_scan_stale: "Satellite scan older than 90 days",
    fusion_below_audit_minimum: "Fusion score below 75",
    missing_exif: "Missing camera EXIF",
    missing_photo_gps: "Photo missing GPS",
    missing_photo_timestamp: "Photo missing timestamp",
    photo_timestamp_stale: "Photo older than 7 days",
  };
  return labels[reason] ?? reasonLabel(reason);
}

function GateBadge({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        ready ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900",
      )}
    >
      {label}: {ready ? "Ready" : "Blocked"}
    </span>
  );
}

export function ProjectIntegrityFusionPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["integrity-fusion", projectId],
    queryFn: () => plantingProjects.integrityFusion(projectId),
  });
  const registry = useQuery({
    queryKey: ["registry-readiness", projectId],
    queryFn: () => plantingProjects.registryReadiness(projectId),
  });

  const refresh = useMutation({
    mutationFn: () => plantingProjects.refreshIntegrityFusion(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrity-fusion", projectId] });
      qc.invalidateQueries({ queryKey: ["registry-readiness", projectId] });
      qc.invalidateQueries({ queryKey: ["credit-ledger", projectId] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading integrity fusion…</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {errorMessage(error)}
      </p>
    );
  }

  if (!data) return null;

  const registryData = registry.data;
  const registryReady = registryData?.registry_issue_ready ?? data.issued_ready;
  const claimableCount =
    registryData?.claimable_tree_count ?? data.claimable_tree_count ?? data.credit_eligible_count;
  const blocking = registryData?.blocking_trees ?? data.blocking_trees ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-forest-700" />
            <h2 className="text-lg font-semibold">Integrity fusion</h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Per-tree fusion scores and credit gate readiness for registry claims and ledger
            transitions.
          </p>
          <p className="mt-1 text-xs text-stone-500">{data.message}</p>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {refresh.isPending ? "Refreshing…" : "Recalculate all trees"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <GateBadge ready={data.verified_ready} label="Verified gate" />
        <GateBadge ready={data.issued_ready} label="Issued gate" />
        <GateBadge ready={registryReady} label="Registry issue" />
        {data.monitoring_gate ? (
          <GateBadge
            ready={data.monitoring_ready ?? data.monitoring_gate.passed}
            label="Monitoring gate"
          />
        ) : null}
      </div>

      {data.monitoring_gate && !(data.monitoring_ready ?? data.monitoring_gate.passed) ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">Monitoring gate blocked</p>
          <p className="mt-1">{data.monitoring_gate.message}</p>
          {data.monitoring_gate.reasons?.length ? (
            <p className="mt-1">
              Reasons: {data.monitoring_gate.reasons.map(reasonLabel).join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-forest-200 bg-forest-50/50 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-forest-950">Registry readiness</h3>
            <p className="mt-1 text-xs text-stone-600">
              Trees that can be registered as claims and serials when the ledger reaches{" "}
              <strong>issued</strong>.
            </p>
          </div>
          {registry.isLoading ? (
            <span className="text-xs text-stone-500">Loading…</span>
          ) : registry.error ? (
            <span className="text-xs text-rose-700">{errorMessage(registry.error)}</span>
          ) : registryData ? (
            <GateBadge ready={registryData.registry_issue_ready} label="Registry issue" />
          ) : null}
        </div>
        {registryData ? (
          <>
            <p className="text-sm text-stone-700">{registryData.message}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Claimable trees"
                value={String(registryData.claimable_tree_count)}
                hint="Credit-eligible for registry claims"
              />
              <Stat
                label="Credit eligible"
                value={`${registryData.credit_eligible_count} (${registryData.eligible_pct}%)`}
              />
              <Stat
                label="Audit ready"
                value={`${registryData.audit_ready_count} (${registryData.audit_ready_pct}%)`}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Trees" value={String(data.tree_count)} />
        <Stat
          label="Claimable trees"
          value={String(claimableCount)}
          hint="Same as registry readiness claimable count"
        />
        <Stat
          label="Credit eligible"
          value={`${data.credit_eligible_count} (${data.eligible_pct}%)`}
          hint={`Need ${data.verified_requirements.min_eligible_pct}% for verified`}
        />
        <Stat
          label="Audit ready"
          value={`${data.audit_ready_count} (${data.audit_ready_pct}%)`}
          hint={`Need ${data.issued_requirements.min_audit_ready_pct}% for issued`}
        />
        <Stat
          label="Avg fusion"
          value={data.avg_fusion_score != null ? `${Math.round(data.avg_fusion_score)}/100` : "—"}
          hint={`Min ${data.verified_requirements.min_avg_fusion} verified · ${data.issued_requirements.min_avg_fusion} issued`}
        />
      </div>

      {refresh.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {errorMessage(refresh.error)}
        </p>
      )}

      {blocking.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-2 font-medium">Tree</th>
                <th className="px-4 py-2 font-medium">Verification</th>
                <th className="px-4 py-2 font-medium">Fusion</th>
                <th className="px-4 py-2 font-medium">Blocking reasons</th>
              </tr>
            </thead>
            <tbody>
              {blocking.slice(0, 15).map((row) => (
                <tr key={row.tree_id} className="border-t border-stone-100">
                  <td className="px-4 py-2">
                    <Link
                      href={`/trees/${row.tree_id}`}
                      className="font-mono text-xs text-forest-700 hover:underline"
                    >
                      {row.public_code}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">
                    {row.verification_status.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {row.fusion_score != null ? Math.round(row.fusion_score) : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-600">
                    {row.reasons.map(reasonLabel).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {blocking.length > 15 && (
            <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
              +{blocking.length - 15} more trees with blocking issues
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-stone-500">{hint}</p> : null}
    </div>
  );
}
