"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { BrsrExportPanel } from "@/components/reports/brsr-export-panel";
import { plantingProjects } from "@/lib/api";
import {
  BRSR_WIZARD_STEPS,
  brsrApi,
  type BrsrAssuranceLevel,
  type BrsrWizardStep,
} from "@/lib/brsr";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-store";
import { isOrgViewer } from "@/lib/nav-access";

function StepIndicator({ current }: { current: BrsrWizardStep }) {
  const currentIdx = BRSR_WIZARD_STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap gap-2">
      {BRSR_WIZARD_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = step.id === current;
        return (
          <li
            key={step.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1",
              active
                ? "bg-forest-100 text-forest-900 ring-forest-300"
                : done
                  ? "bg-stone-100 text-stone-700 ring-stone-200"
                  : "bg-white text-stone-500 ring-stone-200",
            )}
          >
            {done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

export function BrsrPrinciple6Wizard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isViewer = isOrgViewer(user);
  const [step, setStep] = useState<BrsrWizardStep>("disclosure");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    reporting_year: number;
    listed_entity: boolean;
    cin: string;
    stock_exchange: string;
    assurance_level: BrsrAssuranceLevel;
    boundary_notes: string;
  }>({
    reporting_year: new Date().getFullYear(),
    listed_entity: true,
    cin: "",
    stock_exchange: "NSE",
    assurance_level: "limited",
    boundary_notes: "",
  });

  const [manualKpis, setManualKpis] = useState<Record<string, { value_summary: string; source: string }>>(
    {},
  );

  const { data: state, isLoading, refetch } = useQuery({
    queryKey: ["brsr-readiness", projectId || "org"],
    queryFn: () => brsrApi.readiness(projectId.trim() || undefined),
    enabled: Boolean(user?.organization_id),
  });

  const { data: projectsData } = useQuery({
    queryKey: ["planting-projects", "brsr-scope"],
    queryFn: () => plantingProjects.list({ page_size: 100 }),
    enabled: Boolean(user?.organization_id),
  });

  useEffect(() => {
    if (!state?.profile) return;
    setForm({
      reporting_year: state.profile.reporting_year ?? new Date().getFullYear(),
      listed_entity: state.profile.listed_entity,
      cin: state.profile.cin ?? "",
      stock_exchange: state.profile.stock_exchange ?? "NSE",
      assurance_level: state.profile.assurance_level ?? "limited",
      boundary_notes: state.profile.boundary_notes ?? "",
    });
    const manual: Record<string, { value_summary: string; source: string }> = {};
    for (const [key, val] of Object.entries(state.profile.manual_kpis ?? {})) {
      manual[key] = { value_summary: val.value_summary, source: val.source ?? "" };
    }
    setManualKpis(manual);
  }, [state?.profile]);

  const readiness = state?.readiness;
  const stepMeta = useMemo(() => BRSR_WIZARD_STEPS.find((s) => s.id === step), [step]);

  async function persistProfile(nextSteps?: BrsrWizardStep[]) {
    if (isViewer) return;
    setBusy(true);
    setError(null);
    try {
      const steps = nextSteps
        ? Array.from(new Set([...(state?.profile.wizard_completed_steps ?? []), ...nextSteps]))
        : state?.profile.wizard_completed_steps;
      await brsrApi.updateProfile({
        reporting_year: form.reporting_year,
        listed_entity: form.listed_entity,
        cin: form.cin.trim() || null,
        stock_exchange: form.stock_exchange.trim() || null,
        assurance_level: form.assurance_level,
        boundary_notes: form.boundary_notes.trim() || null,
        manual_kpis: Object.fromEntries(
          Object.entries(manualKpis)
            .filter(([, v]) => v.value_summary.trim())
            .map(([k, v]) => [k, { value_summary: v.value_summary.trim(), source: v.source || null }]),
        ),
        wizard_completed_steps: steps,
      });
      await qc.invalidateQueries({ queryKey: ["brsr-readiness"] });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save BRSR profile");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function goNext() {
    const order = BRSR_WIZARD_STEPS.map((s) => s.id);
    const idx = order.indexOf(step);
    const next = order[idx + 1];
    if (!next) return;
    try {
      if (!isViewer) await persistProfile([step]);
      setStep(next);
    } catch {
      /* error shown */
    }
  }

  function goBack() {
    const order = BRSR_WIZARD_STEPS.map((s) => s.id);
    const idx = order.indexOf(step);
    const prev = order[idx - 1];
    if (prev) setStep(prev);
  }

  if (!user?.organization_id) {
    return (
      <div className="card">
        <p className="text-sm text-amber-700">Join an organization to prepare BRSR Principle 6 disclosures.</p>
      </div>
    );
  }

  if (isLoading && !state) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-forest-700" />
              <h2 className="text-lg font-semibold">BRSR Principle 6 wizard</h2>
            </div>
            <p className="max-w-2xl text-sm text-stone-600">
              Prepare SEBI BRSR Core 2024 environment disclosures step by step — org profile, KPI
              gaps, value-chain linkage, then assurance pack export.
            </p>
          </div>
          {readiness ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-forest-800">{readiness.readiness_pct}%</p>
              <p className="text-xs text-stone-500">readiness</p>
            </div>
          ) : null}
        </div>
        <StepIndicator current={step} />
        {stepMeta ? <p className="text-sm text-stone-500">{stepMeta.hint}</p> : null}
      </div>

      {step === "disclosure" ? (
        <div className="card space-y-4">
          <h3 className="font-medium text-stone-900">Listed entity disclosure</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Reporting year</label>
              <input
                className="input w-full"
                type="number"
                min={2000}
                max={2100}
                value={form.reporting_year}
                disabled={isViewer}
                onChange={(e) => setForm((f) => ({ ...f, reporting_year: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label">CIN</label>
              <input
                className="input w-full"
                placeholder="L12345MH2020PLC123456"
                value={form.cin}
                disabled={isViewer}
                onChange={(e) => setForm((f) => ({ ...f, cin: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Stock exchange</label>
              <select
                className="input w-full"
                value={form.stock_exchange}
                disabled={isViewer}
                onChange={(e) => setForm((f) => ({ ...f, stock_exchange: e.target.value }))}
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="NSE_BSE">NSE + BSE</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Assurance level</label>
              <select
                className="input w-full"
                value={form.assurance_level}
                disabled={isViewer}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    assurance_level: e.target.value as BrsrAssuranceLevel,
                  }))
                }
              >
                <option value="none">None / internal review</option>
                <option value="limited">Limited assurance</option>
                <option value="reasonable">Reasonable assurance</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.listed_entity}
              disabled={isViewer}
              onChange={(e) => setForm((f) => ({ ...f, listed_entity: e.target.checked }))}
            />
            Listed entity preparing BRSR Core disclosure
          </label>
          <div>
            <label className="label">Reporting boundary notes</label>
            <textarea
              className="input min-h-[96px] w-full"
              placeholder="e.g. India operations only; excludes overseas subsidiaries."
              value={form.boundary_notes}
              disabled={isViewer}
              onChange={(e) => setForm((f) => ({ ...f, boundary_notes: e.target.value }))}
            />
          </div>
        </div>
      ) : null}

      {step === "scope" ? (
        <div className="card space-y-4">
          <h3 className="font-medium text-stone-900">Portfolio scope</h3>
          <p className="text-sm text-stone-600">
            Leave blank to include all plantation projects in your organization. Select one project
            for a site-specific BRSR annex.
          </p>
          <select
            className="input w-full max-w-xl"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Entire organization portfolio</option>
            {(projectsData?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {step === "kpis" ? (
        <div className="card space-y-4">
          <h3 className="font-medium text-stone-900">Essential indicators (P6.E1–E8)</h3>
          <div className="space-y-3">
            {(readiness?.kpis ?? []).map((kpi) => (
              <div
                key={kpi.kpi_id}
                className={cn(
                  "rounded-xl border p-4",
                  kpi.data_available
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-amber-200 bg-amber-50/30",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {kpi.kpi_id} — {kpi.name}
                    </p>
                    {kpi.value_summary ? (
                      <p className="mt-1 text-sm text-stone-600">{kpi.value_summary}</p>
                    ) : (
                      <p className="mt-1 text-sm text-stone-500">{kpi.action}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      kpi.data_available
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900",
                    )}
                  >
                    {kpi.data_available ? "Mapped" : "Gap"}
                  </span>
                </div>
                {!kpi.data_available && !isViewer ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      className="input"
                      placeholder="Manual value summary (optional)"
                      value={manualKpis[kpi.kpi_id]?.value_summary ?? ""}
                      onChange={(e) =>
                        setManualKpis((m) => ({
                          ...m,
                          [kpi.kpi_id]: {
                            value_summary: e.target.value,
                            source: m[kpi.kpi_id]?.source ?? "",
                          },
                        }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Source (e.g. ERP, utility bills)"
                      value={manualKpis[kpi.kpi_id]?.source ?? ""}
                      onChange={(e) =>
                        setManualKpis((m) => ({
                          ...m,
                          [kpi.kpi_id]: {
                            value_summary: m[kpi.kpi_id]?.value_summary ?? "",
                            source: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {step === "value_chain" ? (
        <div className="card space-y-4">
          <h3 className="font-medium text-stone-900">Value chain (P6.E8)</h3>
          {readiness?.value_chain.missing_supplier_count ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">
                {readiness.value_chain.missing_supplier_count} project(s) missing supplier reference
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {readiness.value_chain.missing_supplier_projects.map((p) => (
                  <li key={p.project_code}>
                    {p.project_code} — {p.project_name}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Add <code className="rounded bg-white px-1">supplier_ref</code> in each project&apos;s
                scheme metadata.
              </p>
            </div>
          ) : (
            <p className="text-sm text-emerald-800">
              All scoped projects have supplier linkage or no plantation projects are in scope.
            </p>
          )}
        </div>
      ) : null}

      {step === "export" ? (
        <div className="space-y-4">
          {readiness?.blockers.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Review before filing</p>
                  <ul className="mt-1 list-disc pl-5">
                    {readiness.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
          <BrsrExportPanel
            defaultProjectId={projectId.trim() || undefined}
            defaultReportingYear={form.reporting_year}
          />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1"
          disabled={step === "disclosure" || busy}
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-wrap gap-2">
          {step !== "export" ? (
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-1"
              disabled={busy || isViewer}
              onClick={() => void goNext()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Continue
            </button>
          ) : (
            <Link href="/compliance" className="btn-ghost inline-flex items-center gap-1 text-sm">
              Portfolio compliance
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
