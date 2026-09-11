"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Lock, MapPin, Shield } from "lucide-react";
import { AuditConfidencePanel } from "@/components/audit/audit-confidence-panel";
import { AuditRiskPanel } from "@/components/audit/audit-risk-panel";
import { AuditSamplingPanel } from "@/components/audit/audit-sampling-panel";
import { AuditSatellitePanel } from "@/components/audit/audit-satellite-panel";
import { auditEngagements, type AuditEngagementDetail } from "@/lib/api";
import { cn } from "@/lib/cn";

const STEPS = ["claim", "boundaries", "documents", "validation", "complete"] as const;

type StepId = (typeof STEPS)[number];

const VERDICT_COLORS: Record<string, string> = {
  plausible: "text-emerald-700 bg-emerald-50 ring-emerald-200",
  unusual: "text-amber-800 bg-amber-50 ring-amber-200",
  inconsistent: "text-rose-800 bg-rose-50 ring-rose-200",
  cannot_assess: "text-stone-600 bg-stone-100 ring-stone-200",
};

export function AuditIntakePanel({ projectId }: { projectId: string }) {
  const t = useTranslations("auditIntake");
  const qc = useQueryClient();
  const [step, setStep] = useState<StepId>("claim");
  const [claimForm, setClaimForm] = useState({
    trees_claimed: "",
    area_ha_claimed: "",
    planting_date: "",
    density_per_ha: "",
    notes: "",
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["audit-engagement", projectId],
    queryFn: async () => {
      try {
        return await auditEngagements.getByProject(projectId);
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          return await auditEngagements.create(projectId);
        }
        throw e;
      }
    },
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["audit-engagement", projectId] });
  }, [qc, projectId]);

  const saveClaim = useMutation({
    mutationFn: () => {
      if (!data) throw new Error("no engagement");
      return auditEngagements.updateClaim(data.id, {
        trees_claimed: claimForm.trees_claimed ? Number(claimForm.trees_claimed) : undefined,
        area_ha_claimed: claimForm.area_ha_claimed ? Number(claimForm.area_ha_claimed) : undefined,
        planting_date: claimForm.planting_date || undefined,
        density_per_ha: claimForm.density_per_ha ? Number(claimForm.density_per_ha) : undefined,
        notes: claimForm.notes || undefined,
      });
    },
    onSuccess: invalidate,
  });

  const freezeClaim = useMutation({
    mutationFn: () => auditEngagements.freezeClaim(data!.id),
    onSuccess: invalidate,
  });

  const importKml = useMutation({
    mutationFn: (file: File) => auditEngagements.importKml(data!.id, file),
    onSuccess: invalidate,
  });

  const runGis = useMutation({
    mutationFn: () => auditEngagements.runGisValidation(data!.id),
    onSuccess: invalidate,
  });

  const runPlausibility = useMutation({
    mutationFn: () => auditEngagements.runPlausibility(data!.id),
    onSuccess: invalidate,
  });

  const completeIntake = useMutation({
    mutationFn: () => auditEngagements.completeIntake(data!.id),
    onSuccess: invalidate,
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-rose-600">
        {t("loadError")}
      </p>
    );
  }

  const engagement = data as AuditEngagementDetail;
  const gate = engagement.intake_gate;
  const isComplete = engagement.status === "intake_complete";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Shield className="h-6 w-6 text-forest-700" aria-hidden />
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{t("title")}</h1>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
              isComplete
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-amber-50 text-amber-800 ring-amber-200",
            )}
          >
            {isComplete ? t("statusComplete") : t("statusDraft")}
          </span>
        </div>
        <p className="max-w-2xl text-sm text-stone-600 dark:text-stone-400">{t("subtitle")}</p>
        <p className="text-xs text-stone-500">{t("epistemicNote")}</p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label={t("stepsAria")}>
        {STEPS.map((id, idx) => (
          <button
            key={id}
            type="button"
            onClick={() => setStep(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              step === id
                ? "bg-forest-700 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200",
            )}
          >
            {idx + 1}. {t(`step.${id}`)}
          </button>
        ))}
      </nav>

      {step === "claim" && (
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("claimTitle")}</h2>
          <p className="text-xs text-stone-500">{t("claimLabel")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-stone-600">{t("treesClaimed")}</span>
              <input
                type="number"
                className="input mt-1 w-full"
                value={claimForm.trees_claimed}
                onChange={(e) => setClaimForm((f) => ({ ...f, trees_claimed: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">{t("areaClaimed")}</span>
              <input
                type="number"
                step="0.01"
                className="input mt-1 w-full"
                value={claimForm.area_ha_claimed}
                onChange={(e) => setClaimForm((f) => ({ ...f, area_ha_claimed: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">{t("plantingDate")}</span>
              <input
                type="date"
                className="input mt-1 w-full"
                value={claimForm.planting_date}
                onChange={(e) => setClaimForm((f) => ({ ...f, planting_date: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">{t("densityPerHa")}</span>
              <input
                type="number"
                className="input mt-1 w-full"
                value={claimForm.density_per_ha}
                onChange={(e) => setClaimForm((f) => ({ ...f, density_per_ha: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-stone-600">{t("notes")}</span>
            <textarea
              className="input mt-1 w-full"
              rows={2}
              value={claimForm.notes}
              onChange={(e) => setClaimForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={saveClaim.isPending || isComplete}
              onClick={() => saveClaim.mutate()}
            >
              {t("saveClaim")}
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              disabled={freezeClaim.isPending || isComplete}
              onClick={() => freezeClaim.mutate()}
            >
              <Lock className="h-4 w-4" aria-hidden />
              {t("freezeClaim")}
            </button>
          </div>
          {engagement.latest_snapshot && (
            <p className="text-xs text-emerald-700">
              {t("frozenVersion", { version: engagement.latest_snapshot.version })}
            </p>
          )}
        </section>
      )}

      {step === "boundaries" && (
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("boundariesTitle")}</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-forest-700">
            <FileUp className="h-4 w-4" aria-hidden />
            <span>{t("importKml")}</span>
            <input
              type="file"
              accept=".kml,.kmz"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importKml.mutate(file);
              }}
            />
          </label>
          {engagement.boundaries.length === 0 ? (
            <p className="text-sm text-stone-500">{t("noBoundaries")}</p>
          ) : (
            <ul className="space-y-2">
              {engagement.boundaries.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-stone-400" aria-hidden />
                    {b.name}
                  </span>
                  <span className="text-stone-500">
                    {b.area_ha_measured != null ? `${b.area_ha_measured} ha` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === "documents" && (
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("documentsTitle")}</h2>
          <p className="text-sm text-stone-500">{t("documentsHint")}</p>
          <p className="text-xs text-stone-400">
            {t("documentCount", { count: engagement.document_count })}
          </p>
        </section>
      )}

      {step === "validation" && (
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("validationTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={runGis.isPending}
              onClick={() => runGis.mutate()}
            >
              {t("runGis")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={runPlausibility.isPending}
              onClick={() => runPlausibility.mutate()}
            >
              {t("runPlausibility")}
            </button>
          </div>
          {engagement.latest_gis_validation && (
            <div className="rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-700">
              <p>
                GIS: <strong>{engagement.latest_gis_validation.status}</strong>
              </p>
              {engagement.latest_gis_validation.issues.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-stone-600">
                  {engagement.latest_gis_validation.issues.map((issue, i) => (
                    <li key={i}>{String(issue.message ?? issue.code)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {engagement.plausibility.length > 0 && (
            <ul className="space-y-2">
              {engagement.plausibility.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm ring-1",
                    VERDICT_COLORS[p.verdict] ?? VERDICT_COLORS.cannot_assess,
                  )}
                >
                  <strong>{p.boundary_name}</strong>: {p.summary}
                  <span className="ml-2 text-xs opacity-70">({p.epistemic_label})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === "complete" && gate && (
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("gateTitle")}</h2>
          <ul className="space-y-2">
            {gate.requirements.map((req) => (
              <li key={req.id} className="flex items-start gap-2 text-sm">
                {req.met ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                )}
                <span>
                  {req.label}
                  {!req.met && req.detail && (
                    <span className="block text-xs text-stone-500">{req.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-primary"
            disabled={!gate.ready || completeIntake.isPending || isComplete}
            onClick={() => completeIntake.mutate()}
          >
            {isComplete ? t("alreadyComplete") : t("completeIntake")}
          </button>
        </section>
      )}

      <button type="button" className="text-xs text-stone-500 underline" onClick={() => refetch()}>
        {t("refresh")}
      </button>

      {(engagement.status === "intake_complete" ||
        engagement.status === "analysis_ready" ||
        engagement.status === "confidence_mapped" ||
        engagement.status === "risk_assessed" ||
        engagement.status === "sampling_planned" ||
        engagement.status === "field_verified") && (
        <AuditSatellitePanel
          projectId={projectId}
          engagementId={engagement.id}
          engagementStatus={engagement.status}
        />
      )}

      {(engagement.status === "analysis_ready" ||
        engagement.status === "confidence_mapped" ||
        engagement.status === "risk_assessed" ||
        engagement.status === "sampling_planned" ||
        engagement.status === "field_verified") && (
        <AuditConfidencePanel
          engagementId={engagement.id}
          engagementStatus={engagement.status}
        />
      )}

      {(engagement.status === "confidence_mapped" ||
        engagement.status === "risk_assessed" ||
        engagement.status === "sampling_planned" ||
        engagement.status === "field_verified") && (
        <AuditRiskPanel
          engagementId={engagement.id}
          engagementStatus={engagement.status}
        />
      )}

      {(engagement.status === "risk_assessed" ||
        engagement.status === "sampling_planned" ||
        engagement.status === "field_verified") && (
        <AuditSamplingPanel
          engagementId={engagement.id}
          engagementStatus={engagement.status}
        />
      )}
    </div>
  );
}
