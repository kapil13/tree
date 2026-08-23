"use client";

import { useRef, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Download, FileText, Link2 } from "lucide-react";
import { ProjectComplianceChecklistPanel } from "@/components/projects/project-compliance-checklist-panel";
import { ProjectComplianceWorkflowPanel } from "@/components/projects/project-compliance-workflow-panel";
import { ProjectSafeguardsPanel } from "@/components/projects/project-safeguards-panel";
import {
  type ChecklistCode,
  type FrameworkProfileCode,
  compliance,
  centralSchemes,
  errorMessage,
  plantingProjects,
  reporting,
  verification,
} from "@/lib/api";

const SEVERITY_CLASS: Record<string, string> = {
  block: "bg-rose-100 text-rose-900",
  warn: "bg-amber-100 text-amber-900",
  audit: "bg-stone-100 text-stone-700",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ProjectTab = "overview" | "compliance" | "credits" | "trees" | "team" | "settings";

export function ProjectComplianceTab({
  projectId,
  projectCode,
  projectMetadata,
  schemeCode,
  onNavigateTab,
}: {
  projectId: string;
  projectCode?: string;
  projectMetadata?: Record<string, unknown>;
  schemeCode?: string | null;
  onNavigateTab?: (tab: ProjectTab) => void;
}) {
  const qc = useQueryClient();
  const checklistRef = useRef<HTMLDivElement>(null);
  const violationsRef = useRef<HTMLDivElement>(null);
  const [checklistCode, setChecklistCode] = useState<ChecklistCode | undefined>();
  const [frameworkProfile, setFrameworkProfile] = useState<FrameworkProfileCode>("verra_vm0047");
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { data: workflow } = useQuery({
    queryKey: ["compliance-workflow", projectId],
    queryFn: () => compliance.projectWorkflow(projectId),
  });

  const { data: scheme } = useQuery({
    queryKey: ["scheme", schemeCode],
    queryFn: () => centralSchemes.get(schemeCode!),
    enabled: Boolean(schemeCode),
  });

  useEffect(() => {
    if (workflow?.recommended_checklist) {
      setChecklistCode(workflow.recommended_checklist as ChecklistCode);
    }
  }, [workflow?.recommended_checklist]);

  useEffect(() => {
    const profileFromScheme = scheme?.framework_profiles?.[0] as FrameworkProfileCode | undefined;
    if (profileFromScheme) {
      setFrameworkProfile(profileFromScheme);
      return;
    }
    if (schemeCode === "green_credit_india") {
      setFrameworkProfile("green_credit_india");
      setChecklistCode("green_credit_india");
    }
  }, [scheme, schemeCode]);

  const { data: frameworks = [] } = useQuery({
    queryKey: ["reporting-frameworks"],
    queryFn: () => reporting.frameworks(),
  });

  const { data: violations = [], isLoading } = useQuery({
    queryKey: ["project-violations", projectId],
    queryFn: () => plantingProjects.complianceViolations(projectId, true),
  });

  const resolve = useMutation({
    mutationFn: (violationId: string) =>
      plantingProjects.resolveViolation(projectId, violationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-violations", projectId] });
      qc.invalidateQueries({ queryKey: ["planting-project", projectId] });
      qc.invalidateQueries({ queryKey: ["compliance-workflow", projectId] });
    },
  });

  const exportMrv = useMutation({
    mutationFn: (format: "pdf" | "xlsx") => plantingProjects.exportMrv(projectId, format),
    onSuccess: (blob, format) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-mrv-compliance.${format}`);
    },
  });

  const exportBundle = useMutation({
    mutationFn: () => plantingProjects.exportEvidenceBundle(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-evidence-bundle.zip`);
    },
  });

  const exportFramework = useMutation({
    mutationFn: (format: "pdf" | "xlsx") =>
      plantingProjects.exportFrameworkReport(projectId, frameworkProfile, format),
    onSuccess: (blob, format) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-${frameworkProfile}-framework-report.${format}`);
    },
  });

  const createVerifyLink = useMutation({
    mutationFn: () =>
      verification.create({
        resource_type: "planting_project",
        resource_id: projectId,
        label: projectCode ? `${projectCode} verification` : "Project verification",
        expires_in_days: 365,
      }),
    onSuccess: (link) => {
      setVerifyUrl(link.public_url);
      setVerifyError(null);
      qc.invalidateQueries({ queryKey: ["verification-links", projectId] });
    },
    onError: (err) => setVerifyError(errorMessage(err)),
  });

  const exportGreenCreditPortal = useMutation({
    mutationFn: () => plantingProjects.exportGreenCreditPortalPack(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-green-credit-handoff.xlsx`);
    },
  });

  const exportCampaState = useMutation({
    mutationFn: () => plantingProjects.exportCampaStatePack(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-state-campa-export.xlsx`);
    },
  });

  function scrollToAnchor(anchor: string) {
    const target = anchor === "violations" ? violationsRef.current : checklistRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const busy =
    exportMrv.isPending ||
    exportBundle.isPending ||
    exportFramework.isPending ||
    exportGreenCreditPortal.isPending ||
    exportCampaState.isPending;
  const selectedFramework = frameworks.find((f) => f.code === frameworkProfile);

  if (isLoading) return <p className="text-sm text-stone-500">Loading compliance records…</p>;

  return (
    <div className="space-y-4">
      <ProjectComplianceWorkflowPanel
        projectId={projectId}
        projectMetadata={projectMetadata}
        onNavigateTab={onNavigateTab}
        onScrollToAnchor={scrollToAnchor}
        onSelectChecklist={(code) => setChecklistCode(code as ChecklistCode)}
      />

      <div ref={checklistRef} className="card scroll-mt-24 space-y-4" id="compliance-checklist">
        <ProjectComplianceChecklistPanel
          projectId={projectId}
          initialChecklistCode={checklistCode}
          onNavigateTab={onNavigateTab}
          onScrollToAnchor={scrollToAnchor}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["compliance-workflow", projectId] });
          }}
        />
      </div>

      <ProjectSafeguardsPanel projectId={projectId} />

      {(schemeCode === "green_credit_india" ||
        schemeCode === "campa_ca" ||
        schemeCode === "nhai_highway") && (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-sm font-medium text-stone-800">India portal exports</p>
          <p className="text-xs text-stone-600">
            Pre-shaped spreadsheets for state CAMPA monitoring or MoEFCC Green Credit registrar
            handoff — manual upload, not official issuance.
          </p>
          <div className="flex flex-wrap gap-2">
            {(schemeCode === "campa_ca" || schemeCode === "nhai_highway") && (
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={busy}
                onClick={() => exportCampaState.mutate()}
              >
                <Download className="h-3.5 w-3.5" />
                {exportCampaState.isPending ? "Exporting…" : "State CAMPA pack (.xlsx)"}
              </button>
            )}
            {schemeCode === "green_credit_india" && (
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={busy}
                onClick={() => exportGreenCreditPortal.mutate()}
              >
                <Download className="h-3.5 w-3.5" />
                {exportGreenCreditPortal.isPending
                  ? "Exporting…"
                  : "Green Credit handoff (.xlsx)"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
          <Link2 className="h-4 w-4 text-forest-700" />
          Public verification link
        </div>
        <p className="text-xs text-stone-600">
          Share a read-only verification page with auditors, registries, or courts. No login required.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={createVerifyLink.isPending}
            onClick={() => createVerifyLink.mutate()}
          >
            {createVerifyLink.isPending ? "Creating…" : "Create share link"}
          </button>
          {verifyUrl ? (
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => navigator.clipboard.writeText(verifyUrl)}
            >
              Copy link
            </button>
          ) : null}
        </div>
        {verifyUrl ? (
          <p className="break-all font-mono text-xs text-forest-800">{verifyUrl}</p>
        ) : null}
        {verifyError ? <p className="text-xs text-rose-700">{verifyError}</p> : null}
      </div>

      <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
          <FileText className="h-4 w-4 text-forest-700" />
          Framework-mapped report
        </div>
        <p className="text-xs text-stone-600">
          Export a profile-specific PDF or Excel aligned to VM0047, Gold Standard, REDD+, Paris/NDC,
          Green Credit, NGT/CAMPA, IPCC, or ESG structures. Prepared for audit — not certification.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="label text-xs">Framework profile</label>
            <select
              className="input text-sm"
              value={frameworkProfile}
              onChange={(e) => setFrameworkProfile(e.target.value as FrameworkProfileCode)}
            >
              {frameworks.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.short_label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selectedFramework ? (
          <div className="space-y-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-600">
            <p>{selectedFramework.description}</p>
            <p>
              <span className="font-medium text-stone-800">Reference:</span>{" "}
              {selectedFramework.reference}
            </p>
            {selectedFramework.disclaimer ? (
              <p className="leading-relaxed text-stone-500">{selectedFramework.disclaimer}</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={busy}
            onClick={() => exportFramework.mutate("pdf")}
          >
            <Download className="h-3.5 w-3.5" />
            {exportFramework.isPending ? "Exporting…" : "Framework PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={() => exportFramework.mutate("xlsx")}
          >
            Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          Export MRV reports or a full evidence bundle (manifest, PDF, JSON, photos) for audits.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={() => exportMrv.mutate("pdf")}
          >
            <Download className="h-3.5 w-3.5" />
            {exportMrv.isPending ? "Exporting…" : "MRV PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={() => exportMrv.mutate("xlsx")}
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={busy}
            onClick={() => exportBundle.mutate()}
          >
            <Download className="h-3.5 w-3.5" />
            {exportBundle.isPending ? "Building…" : "Evidence bundle (.zip)"}
          </button>
        </div>
      </div>

      <div ref={violationsRef} className="scroll-mt-24">
        {!violations.length ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            No open compliance violations for this project.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Severity</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Message</th>
                  <th className="px-4 py-2.5 font-medium">Tree</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {violations.map((v) => (
                  <tr key={v.id} className="border-t border-stone-100">
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_CLASS[v.severity] ?? SEVERITY_CLASS.warn}`}
                      >
                        {v.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{v.violation_type}</td>
                    <td className="px-4 py-2.5">{v.message}</td>
                    <td className="px-4 py-2.5">
                      {v.tree_id ? (
                        <a href={`/trees/${v.tree_id}`} className="text-forest-700 hover:underline">
                          View tree
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500">
                      {new Date(v.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={resolve.isPending}
                        onClick={() => resolve.mutate(v.id)}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
