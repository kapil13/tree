"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Scale } from "lucide-react";
import { errorMessage, plantingProjects, type Vm0047Summary } from "@/lib/api";

export function ProjectVm0047Panel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [baselineRemovals, setBaselineRemovals] = useState("0");
  const [additionalityScore, setAdditionalityScore] = useState("75");
  const [leakageEstimate, setLeakageEstimate] = useState("0");
  const [deadwoodRatio, setDeadwoodRatio] = useState("0.08");
  const [litterRatio, setLitterRatio] = useState("0.04");
  const [socPerHa, setSocPerHa] = useState("");

  const summary = useQuery({
    queryKey: ["vm0047-summary", projectId],
    queryFn: () => plantingProjects.vm0047Summary(projectId),
  });

  const saveBaseline = useMutation({
    mutationFn: () =>
      plantingProjects.createBaseline(projectId, {
        scenario: "business_as_usual",
        baseline_removals_tco2e: Number(baselineRemovals),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vm0047-summary", projectId] }),
  });

  const saveAdditionality = useMutation({
    mutationFn: () =>
      plantingProjects.createAdditionality(projectId, {
        status: "assessed",
        score_pct: Number(additionalityScore),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vm0047-summary", projectId] }),
  });

  const saveLeakage = useMutation({
    mutationFn: () =>
      plantingProjects.createLeakage(projectId, {
        leakage_type: "activity_shifting",
        estimated_leakage_tco2e: Number(leakageEstimate),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vm0047-summary", projectId] }),
  });

  const savePools = useMutation({
    mutationFn: () =>
      plantingProjects.upsertCarbonPools(projectId, {
        deadwood_ratio: Number(deadwoodRatio),
        litter_ratio: Number(litterRatio),
        soc_tco2e_per_ha: socPerHa ? Number(socPerHa) : undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vm0047-summary", projectId] }),
  });

  const data: Vm0047Summary | undefined = summary.data;
  const busy =
    saveBaseline.isPending ||
    saveAdditionality.isPending ||
    saveLeakage.isPending ||
    savePools.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-forest-700" />
        <h3 className="text-sm font-medium text-stone-800">VM0047 accounting</h3>
        {data && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs capitalize text-stone-700">
            {data.readiness_status.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <p className="text-xs text-stone-500">
        Baseline, additionality, leakage, and other carbon pools (deadwood, litter, SOC) for Verra VM0047 audit prep.
      </p>

      {summary.isLoading && <p className="text-sm text-stone-500">Loading VM0047 summary…</p>}
      {summary.error && (
        <p className="text-sm text-rose-700">{errorMessage(summary.error)}</p>
      )}

      {data && (
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Gross credits (t)" value={data.ledger.gross_credits_tco2e} />
          <Metric label="After baseline (t)" value={data.quantification.incremental_after_baseline_tco2e} />
          <Metric label="After leakage (t)" value={data.quantification.creditable_after_leakage_tco2e} />
          <Metric label="Net ledger (t)" value={data.ledger.net_credits_tco2e} />
        </dl>
      )}

      {data && data.gaps.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
          Gaps: {data.gaps.map((g) => g.replace(/_/g, " ")).join(", ")}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <FormBlock title="Baseline scenario">
          <input
            className="input text-sm"
            type="number"
            min={0}
            step="0.01"
            value={baselineRemovals}
            onChange={(e) => setBaselineRemovals(e.target.value)}
            placeholder="Baseline removals tCO₂e"
          />
          <button type="button" className="btn-secondary mt-2 text-xs" disabled={busy} onClick={() => saveBaseline.mutate()}>
            Save baseline
          </button>
        </FormBlock>

        <FormBlock title="Additionality">
          <input
            className="input text-sm"
            type="number"
            min={0}
            max={100}
            value={additionalityScore}
            onChange={(e) => setAdditionalityScore(e.target.value)}
            placeholder="Score %"
          />
          <button type="button" className="btn-secondary mt-2 text-xs" disabled={busy} onClick={() => saveAdditionality.mutate()}>
            Save assessment
          </button>
        </FormBlock>

        <FormBlock title="Leakage account">
          <input
            className="input text-sm"
            type="number"
            min={0}
            step="0.01"
            value={leakageEstimate}
            onChange={(e) => setLeakageEstimate(e.target.value)}
            placeholder="Estimated leakage tCO₂e"
          />
          <button type="button" className="btn-secondary mt-2 text-xs" disabled={busy} onClick={() => saveLeakage.mutate()}>
            Add leakage entry
          </button>
        </FormBlock>

        <FormBlock title="Other carbon pools">
          <div className="flex flex-wrap gap-2">
            <input className="input w-24 text-sm" type="number" step="0.01" min={0} max={1} value={deadwoodRatio} onChange={(e) => setDeadwoodRatio(e.target.value)} placeholder="Deadwood" />
            <input className="input w-24 text-sm" type="number" step="0.01" min={0} max={1} value={litterRatio} onChange={(e) => setLitterRatio(e.target.value)} placeholder="Litter" />
            <input className="input w-28 text-sm" type="number" step="0.01" min={0} value={socPerHa} onChange={(e) => setSocPerHa(e.target.value)} placeholder="SOC t/ha" />
          </div>
          <button type="button" className="btn-secondary mt-2 text-xs" disabled={busy} onClick={() => savePools.mutate()}>
            <Layers className="mr-1 inline h-3.5 w-3.5" />
            Save pools
          </button>
        </FormBlock>
      </div>

      {(saveBaseline.error || saveAdditionality.error || saveLeakage.error || savePools.error) && (
        <p className="text-xs text-rose-700">
          {errorMessage(saveBaseline.error ?? saveAdditionality.error ?? saveLeakage.error ?? savePools.error)}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-sm font-semibold text-stone-900">{value.toFixed(3)}</dd>
    </div>
  );
}

function FormBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <p className="mb-2 text-xs font-medium text-stone-700">{title}</p>
      {children}
    </div>
  );
}
