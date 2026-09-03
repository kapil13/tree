"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, RefreshCw } from "lucide-react";
import { CarbonEstimateLabel } from "@/components/carbon-estimate-label";
import { ProjectCreditSerialsPanel } from "@/components/projects/project-credit-serials-panel";
import { type CreditLedgerStatus, credits, errorMessage, isApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  parseIntegrityGateFailure,
  resolveIntegrityRemediation,
  resolveMonitoringGateRemediation,
} from "@/lib/integrity-remediation";

function gateFailureMessage(err: unknown): string | null {
  const failure = parseIntegrityGateFailure(err);
  return failure?.message ?? null;
}

function num(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const STATUS_CLASS: Record<CreditLedgerStatus, string> = {
  estimated: "bg-stone-100 text-stone-700",
  verified: "bg-blue-100 text-blue-900",
  buffered: "bg-amber-100 text-amber-900",
  issued: "bg-green-100 text-green-900",
};

const NEXT_STATUS: Partial<Record<CreditLedgerStatus, CreditLedgerStatus>> = {
  estimated: "verified",
  verified: "buffered",
  buffered: "issued",
};

export function ProjectCreditLedgerPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [registryRef, setRegistryRef] = useState("");
  const [notes, setNotes] = useState("");

  const { data: ledger, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["credit-ledger", projectId],
    queryFn: () => credits.projectLedger(projectId),
    retry: 1,
  });

  const sync = useMutation({
    mutationFn: () => credits.syncProject(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-ledger", projectId] }),
  });

  const transition = useMutation({
    mutationFn: (toStatus: CreditLedgerStatus) =>
      credits.transitionProject(projectId, {
        to_status: toStatus,
        notes: notes || undefined,
        registry_reference: toStatus === "issued" ? registryRef : undefined,
      }),
    onSuccess: () => {
      setNotes("");
      qc.invalidateQueries({ queryKey: ["credit-ledger", projectId] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading credit ledger…</p>;
  }

  if (error) {
    const msg = errorMessage(error);
    const status = isApiError(error) ? error.response?.status : undefined;
    const needsMigration =
      status === 500 ||
      /project_credit_ledgers|credit_ledger|relation .* does not exist|alembic/i.test(msg);

    return (
      <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        <p className="font-medium">Could not load credit ledger</p>
        <p className="text-rose-800">{msg}</p>
        {needsMigration ? (
          <p className="text-xs text-rose-700">
            On the server, run database migrations:{" "}
            <code className="rounded bg-rose-100 px-1 py-0.5">
              docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
            </code>{" "}
            (revision through <code className="rounded bg-rose-100 px-1 py-0.5">0024_org_team_management</code>
            ), then rebuild/restart if needed.
          </p>
        ) : null}
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          {isFetching ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  if (!ledger) {
    return (
      <p className="text-sm text-stone-500">
        No credit ledger data yet. Add trees to the project, then retry.
      </p>
    );
  }

  const grossCredits = num(ledger.gross_credits_tco2e);
  const bufferPct = num(ledger.buffer_pct);
  const bufferWithheld = num(ledger.buffer_withheld_tco2e);
  const netCredits = num(ledger.net_credits_tco2e);
  const issuedCredits =
    ledger.issued_credits_tco2e == null ? null : num(ledger.issued_credits_tco2e);
  const strata = (ledger.strata ?? []).map((row) => ({
    ...row,
    credits_tco2e: num(row.credits_tco2e),
    tree_count: num(row.tree_count),
  }));

  const next = NEXT_STATUS[ledger.status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-forest-700" />
            <h2 className="text-lg font-semibold">Credit ledger</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                STATUS_CLASS[ledger.status],
              )}
            >
              {ledger.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {ledger.methodology} · engine {ledger.engine_version} · last computed{" "}
            {new Date(ledger.last_computed_at).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={sync.isPending || ledger.status === "issued"}
          onClick={() => sync.mutate()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {sync.isPending ? "Syncing…" : "Recalculate"}
        </button>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {ledger.disclaimer}
      </p>

      {ledger.integrity_fusion && (
        <div className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-3 text-xs text-stone-700 space-y-2">
          <p className="font-medium text-stone-900">Integrity fusion gates</p>
          <p>{ledger.integrity_fusion.message}</p>
          {ledger.integrity_fusion.monitoring_gate &&
          !(ledger.integrity_fusion.monitoring_ready ?? ledger.integrity_fusion.monitoring_gate.passed) ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
              Monitoring blocked: {ledger.integrity_fusion.monitoring_gate.message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 font-mono">
            <span>
              Eligible: {ledger.integrity_fusion.credit_eligible_count}/
              {ledger.integrity_fusion.tree_count} ({ledger.integrity_fusion.eligible_pct}%)
            </span>
            <span>
              Audit ready: {ledger.integrity_fusion.audit_ready_count}/
              {ledger.integrity_fusion.tree_count} ({ledger.integrity_fusion.audit_ready_pct}%)
            </span>
            {ledger.integrity_fusion.avg_fusion_score != null && (
              <span>Avg fusion: {Math.round(ledger.integrity_fusion.avg_fusion_score)}</span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Gross credits"
          value={
            <span className="inline-flex items-center gap-1.5">
              {`${grossCredits.toFixed(4)} tCO₂e`}
              {ledger.status !== "issued" ? <CarbonEstimateLabel compact /> : null}
            </span>
          }
        />
        <Stat
          label={`Buffer (${(bufferPct * 100).toFixed(0)}%)`}
          value={`${bufferWithheld.toFixed(4)} tCO₂e`}
          hint={
            ledger.buffer_from_nprt
              ? `NPRT-assessed${ledger.nprt_score != null ? ` (score ${ledger.nprt_score})` : ""}`
              : ledger.methodology === "VERRA_VM0047"
                ? "Default methodology 20%"
                : undefined
          }
        />
        <Stat
          label="Net (issuable est.)"
          value={
            <span className="inline-flex items-center gap-1.5">
              {`${netCredits.toFixed(4)} tCO₂e`}
              {ledger.status !== "issued" ? <CarbonEstimateLabel compact /> : null}
            </span>
          }
        />
        <Stat
          label="Registry issued"
          value={issuedCredits != null ? `${issuedCredits.toFixed(4)} tCO₂e` : "—"}
        />
      </div>

      {ledger.registry_reference && (
        <p className="text-sm text-stone-600">
          Registry reference: <code className="text-xs">{ledger.registry_reference}</code>
        </p>
      )}

      {next && (
        <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium">Advance status → {next}</p>
          {next === "issued" && (
            <div>
              <label className="label text-xs">Registry reference (required)</label>
              <input
                className="input mt-1"
                placeholder="e.g. VCS-12345 or national registry ID"
                value={registryRef}
                onChange={(e) => setRegistryRef(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="label text-xs">Notes (optional)</label>
            <input
              className="input mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Validator name, review date…"
            />
          </div>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={transition.isPending || (next === "issued" && !registryRef.trim())}
            onClick={() => transition.mutate(next)}
          >
            {transition.isPending ? "Updating…" : `Mark as ${next}`}
          </button>
        </div>
      )}

      {(sync.error || transition.error) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 space-y-2">
          <p>{errorMessage(sync.error ?? transition.error)}</p>
          {gateFailureMessage(transition.error) && (
            <p className="text-rose-700">{gateFailureMessage(transition.error)}</p>
          )}
          {transition.error ? (
            <IntegrityGateFailureLinks
              err={transition.error}
              projectId={projectId}
            />
          ) : null}
        </div>
      )}

      {strata.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-2 font-medium">Species</th>
                <th className="px-4 py-2 font-medium">Age cohort</th>
                <th className="px-4 py-2 font-medium">Trees</th>
                <th className="px-4 py-2 font-medium">Credits (tCO₂e)</th>
              </tr>
            </thead>
            <tbody>
              {strata.map((row) => (
                <tr
                  key={`${row.species}-${row.age_cohort}`}
                  className="border-t border-stone-100"
                >
                  <td className="px-4 py-2">{row.species}</td>
                  <td className="px-4 py-2">{row.age_cohort}</td>
                  <td className="px-4 py-2">{row.tree_count}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.credits_tco2e.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ledger.events.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-stone-700">Status history</h3>
          <ul className="space-y-2 text-xs text-stone-600">
            {ledger.events.map((e) => (
              <li key={e.id} className="rounded border border-stone-100 px-3 py-2">
                <span className="font-medium capitalize">
                  {e.from_status ?? "—"} → {e.to_status}
                </span>
                {" · "}
                {new Date(e.created_at).toLocaleString()}
                {e.registry_reference ? ` · ${e.registry_reference}` : ""}
                {e.notes ? <div className="mt-1 text-stone-500">{e.notes}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProjectCreditSerialsPanel ledger={ledger} />
    </div>
  );
}

function IntegrityGateFailureLinks({
  err,
  projectId,
}: {
  err: unknown;
  projectId: string;
}) {
  const failure = parseIntegrityGateFailure(err);
  if (!failure) return null;

  const remediationCtx = { projectId, satelliteWatchEnabled: true };
  const monitoring = failure.monitoring_gate;
  const monitoringBlocked = monitoring && monitoring.passed === false;

  return (
    <div className="space-y-2 border-t border-rose-200/80 pt-2">
      {monitoringBlocked && monitoring.reasons?.length ? (
        <div>
          <p className="font-medium text-rose-900">Monitoring gate</p>
          <ul className="mt-1 space-y-1">
            {monitoring.reasons.map((reason) => {
              const action = resolveMonitoringGateRemediation(reason, remediationCtx);
              return (
                <li key={reason} className="flex flex-wrap items-center gap-2">
                  <span>{action.label}</span>
                  {action.href ? (
                    <Link href={action.href} className="font-medium text-forest-800 hover:underline">
                      {action.actionLabel ?? "Remediate"}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {failure.blocking_trees && failure.blocking_trees.length > 0 ? (
        <div>
          <p className="font-medium text-rose-900">Blocking trees</p>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
            {failure.blocking_trees.slice(0, 10).map((row) => (
              <li key={row.tree_id} className="rounded border border-rose-100 bg-white/70 px-2 py-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/trees/${row.tree_id}`}
                    className="font-mono text-[11px] font-medium text-forest-800 hover:underline"
                  >
                    {row.public_code}
                  </Link>
                  <span className="text-[10px] text-stone-500 capitalize">
                    {row.verification_status.replace(/_/g, " ")}
                  </span>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {row.reasons.slice(0, 3).map((reason) => {
                    const action = resolveIntegrityRemediation(reason, {
                      ...remediationCtx,
                      treeId: row.tree_id,
                    });
                    return (
                      <li key={reason} className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span>{action.label}</span>
                        {action.href ? (
                          <Link
                            href={action.href}
                            className="font-medium text-forest-700 hover:underline"
                          >
                            {action.actionLabel ?? "Fix"}
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {failure.blocking_trees.length > 10 ? (
            <p className="mt-1 text-[10px] text-stone-600">
              +{failure.blocking_trees.length - 10} more — see Integrity fusion panel above.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <div className="mt-1 font-mono text-sm font-semibold text-stone-900">{value}</div>
      {hint ? <p className="mt-1 text-[10px] text-stone-500">{hint}</p> : null}
    </div>
  );
}
