"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Lock, MapPin, Shield } from "lucide-react";
import { auditEngagements, errorMessage, uploads, type AuditEngagementDetail } from "@/lib/api";
import { AuditAttestationPanel } from "@/components/audit/audit-attestation-panel";
import { AuditConfidencePanel } from "@/components/audit/audit-confidence-panel";
import { AuditPhaseRoadmap } from "@/components/audit/audit-phase-roadmap";
import { AuditRiskPanel } from "@/components/audit/audit-risk-panel";
import { AuditExportPanel } from "@/components/audit/audit-export-panel";
import { AuditSamplingPanel } from "@/components/audit/audit-sampling-panel";
import { AuditSatellitePanel } from "@/components/audit/audit-satellite-panel";
import { cn } from "@/lib/cn";

const STEPS = ["claim", "boundaries", "documents", "validation", "complete"] as const;

const AUDIT_DOC_TYPES = [
  { value: "work_order", label: "Work order" },
  { value: "planting_certificate", label: "Planting certificate" },
  { value: "third_party_report", label: "Third-party report" },
  { value: "tenure_reference", label: "Tenure reference" },
  { value: "other", label: "Other" },
] as const;

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
  const [docType, setDocType] = useState<(typeof AUDIT_DOC_TYPES)[number]["value"]>("work_order");
  const [docTitle, setDocTitle] = useState("");
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!data?.working_claim) return;
    const claim = data.working_claim;
    setClaimForm({
      trees_claimed: claim.trees_claimed != null ? String(claim.trees_claimed) : "",
      area_ha_claimed: claim.area_ha_claimed != null ? String(claim.area_ha_claimed) : "",
      planting_date: typeof claim.planting_date === "string" ? claim.planting_date.slice(0, 10) : "",
      density_per_ha: claim.density_per_ha != null ? String(claim.density_per_ha) : "",
      notes: typeof claim.notes === "string" ? claim.notes : "",
    });
  }, [data?.id, data?.working_claim]);

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
    onSuccess: () => {
      setActionError(null);
      setActionMessage("Claim saved.");
      invalidate();
    },
    onError: (e) => setActionError(errorMessage(e)),
  });

  const freezeClaim = useMutation({
    mutationFn: () => auditEngagements.freezeClaim(data!.id),
    onSuccess: (snapshot) => {
      setActionError(null);
      setActionMessage(`Frozen snapshot v${snapshot.version}.`);
      invalidate();
    },
    onError: (e) => setActionError(errorMessage(e)),
  });

  const importKml = useMutation({
    mutationFn: (file: File) => auditEngagements.importKml(data!.id, file),
    onSuccess: (result) => {
      setActionError(null);
      setActionMessage(`Imported ${result.imported} boundary block(s).`);
      invalidate();
    },
    onError: (e) => {
      const msg = errorMessage(e);
      setActionError(
        msg === "Request failed with status code 500"
          ? "KML import failed on the server. Try simplifying the polygon (fewer points) or re-exporting as .kml with closed polygon rings."
          : msg,
      );
    },
  });

  const runGis = useMutation({
    mutationFn: () => auditEngagements.runGisValidation(data!.id),
    onSuccess: (result) => {
      setActionError(null);
      setActionMessage(`GIS validation: ${result.status}.`);
      invalidate();
    },
    onError: (e) => setActionError(errorMessage(e)),
  });

  const runPlausibility = useMutation({
    mutationFn: () => auditEngagements.runPlausibility(data!.id),
    onSuccess: (results) => {
      setActionError(null);
      setActionMessage(`Plausibility assessed for ${results.length} block(s).`);
      invalidate();
    },
    onError: (e) => setActionError(errorMessage(e)),
  });

  const completeIntake = useMutation({
    mutationFn: () => auditEngagements.completeIntake(data!.id),
    onSuccess: () => {
      setActionError(null);
      setActionMessage("Intake marked complete.");
      invalidate();
    },
    onError: (e) => {
      const msg = errorMessage(e);
      setActionError(
        msg === "Request failed with status code 500"
          ? "Could not mark intake complete due to a server error. Refresh the page — if status already shows intake complete, continue to satellite analysis."
          : msg,
      );
    },
  });

  async function handleDocumentUpload(file: File) {
    if (!data) return;
    setDocBusy(true);
    setDocError(null);
    try {
      const s3Key = await uploads.uploadImage(file);
      await auditEngagements.addDocument(data.id, {
        doc_type: docType,
        title: docTitle.trim() || file.name,
        s3_key: s3Key,
      });
      setDocTitle("");
      if (docFileRef.current) docFileRef.current.value = "";
      setActionMessage("Document uploaded.");
      invalidate();
    } catch (e) {
      setDocError(errorMessage(e));
    } finally {
      setDocBusy(false);
    }
  }

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

      {(actionMessage || actionError) && (
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            actionError
              ? "border border-rose-200 bg-rose-50 text-rose-800"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {actionError ?? actionMessage}
        </div>
      )}

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
          <div className="space-y-2 border-t border-stone-100 pt-4 dark:border-stone-800">
            <h3 className="text-sm font-semibold">{t("snapshotHistory")}</h3>
            {(engagement.claim_snapshots ?? []).length > 0 ? (
              <ul className="space-y-2">
                {(engagement.claim_snapshots ?? []).map((snap) => (
                  <li
                    key={snap.id}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700"
                  >
                    <p className="font-medium">
                      {t("snapshotVersion", { version: snap.version })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {t("snapshotFrozenAt", {
                        date: new Date(snap.frozen_at).toLocaleString(),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {t("snapshotHash", { sha: snap.content_hash.slice(0, 12) })}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      {snap.claim_data?.trees_claimed != null
                        ? `${snap.claim_data.trees_claimed} trees`
                        : "—"}
                      {snap.claim_data?.planting_date
                        ? ` · planted ${String(snap.claim_data.planting_date).slice(0, 10)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">{t("noSnapshots")}</p>
            )}
          </div>
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
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label text-xs">{t("documentType")}</label>
              <select
                className="input text-sm"
                value={docType}
                onChange={(e) =>
                  setDocType(e.target.value as (typeof AUDIT_DOC_TYPES)[number]["value"])
                }
                disabled={docBusy || isComplete}
              >
                {AUDIT_DOC_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">{t("documentTitle")}</label>
              <input
                className="input min-w-[200px] text-sm"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. CAMPA work order 2024"
                disabled={docBusy || isComplete}
              />
            </div>
            <div>
              <label className="label text-xs">{t("uploadDocument")}</label>
              <input
                ref={docFileRef}
                type="file"
                className="input text-sm"
                accept="image/*,application/pdf"
                disabled={docBusy || isComplete}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleDocumentUpload(file);
                }}
              />
            </div>
          </div>
          {docBusy ? (
            <p className="text-xs text-stone-500">{t("uploadingDocument")}</p>
          ) : null}
          {docError ? <p className="text-xs text-rose-700">{docError}</p> : null}
          <p className="text-xs text-stone-400">
            {t("documentCount", { count: engagement.documents.length })}
          </p>
          {engagement.documents.length === 0 ? (
            <p className="text-sm text-stone-500">{t("noDocuments")}</p>
          ) : (
            <ul className="space-y-2">
              {engagement.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700"
                >
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-stone-500">{doc.doc_type.replaceAll("_", " ")}</p>
                  </div>
                  <span className="text-xs text-stone-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === "validation" && (
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("validationTitle")}</h2>
          {engagement.boundaries.length === 0 ? (
            <p className="text-sm text-amber-700">{t("validationBoundariesRequired")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={runGis.isPending || engagement.boundaries.length === 0}
              onClick={() => runGis.mutate()}
            >
              {runGis.isPending ? "…" : t("runGis")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={runPlausibility.isPending || engagement.boundaries.length === 0}
              onClick={() => runPlausibility.mutate()}
            >
              {runPlausibility.isPending ? "…" : t("runPlausibility")}
            </button>
          </div>
          {engagement.latest_gis_validation && (
            <div className="rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-700">
              <p>
                GIS: <strong>{engagement.latest_gis_validation.status}</strong>
                <span className="ml-2 text-xs text-stone-500">
                  {new Date(engagement.latest_gis_validation.run_at).toLocaleString()}
                </span>
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
          {engagement.plausibility.length > 0 ? (
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
          ) : (
            <p className="text-sm text-stone-500">{t("noPlausibilityResults")}</p>
          )}
          {gate ? (
            <div className="border-t border-stone-100 pt-4 dark:border-stone-800">
              <h3 className="mb-2 text-sm font-semibold">{t("gateTitle")}</h3>
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
            </div>
          ) : null}
        </section>
      )}

      {step === "complete" && (
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("gateTitle")}</h2>
          {!gate ? (
            <p className="text-sm text-stone-500">{t("loading")}</p>
          ) : (
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
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={!gate?.ready || completeIntake.isPending || isComplete}
            onClick={() => completeIntake.mutate()}
          >
            {isComplete ? t("alreadyComplete") : t("completeIntake")}
          </button>
        </section>
      )}

      <button type="button" className="text-xs text-stone-500 underline" onClick={() => refetch()}>
        {t("refresh")}
      </button>

      {engagement.status !== "draft" && (
        <div className="space-y-8 border-t border-stone-200 pt-8 dark:border-stone-700">
          <AuditPhaseRoadmap status={engagement.status} />
          <AuditSatellitePanel
            projectId={projectId}
            engagementId={engagement.id}
            engagementStatus={engagement.status}
          />
          <AuditConfidencePanel
            engagementId={engagement.id}
            engagementStatus={engagement.status}
          />
          <AuditRiskPanel
            engagementId={engagement.id}
            engagementStatus={engagement.status}
          />
          <AuditSamplingPanel
            engagementId={engagement.id}
            engagementStatus={engagement.status}
            boundaries={engagement.boundaries}
          />
          <AuditExportPanel
            engagementId={engagement.id}
            engagementStatus={engagement.status}
          />
          <AuditAttestationPanel
            engagementId={engagement.id}
            engagementStatus={engagement.status}
          />
        </div>
      )}
    </div>
  );
}
