"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, RefreshCw } from "lucide-react";
import { type CreditLedgerStatus, credits } from "@/lib/api";
import { cn } from "@/lib/cn";

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

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["credit-ledger", projectId],
    queryFn: () => credits.projectLedger(projectId),
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

  if (isLoading || !ledger) {
    return <p className="text-sm text-stone-500">Loading credit ledger…</p>;
  }

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross credits" value={`${ledger.gross_credits_tco2e.toFixed(4)} tCO₂e`} />
        <Stat
          label={`Buffer (${(ledger.buffer_pct * 100).toFixed(0)}%)`}
          value={`${ledger.buffer_withheld_tco2e.toFixed(4)} tCO₂e`}
        />
        <Stat label="Net (issuable est.)" value={`${ledger.net_credits_tco2e.toFixed(4)} tCO₂e`} />
        <Stat
          label="Registry issued"
          value={
            ledger.issued_credits_tco2e != null
              ? `${ledger.issued_credits_tco2e.toFixed(4)} tCO₂e`
              : "—"
          }
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

      {ledger.strata.length > 0 && (
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
              {ledger.strata.map((row) => (
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-stone-900">{value}</p>
    </div>
  );
}
