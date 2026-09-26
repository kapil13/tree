"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, CheckCircle, Link2 } from "lucide-react";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import { ComplianceHubLinks } from "@/components/compliance/compliance-hub-links";
import { ProjectComplianceChecklistPanel } from "@/components/projects/project-compliance-checklist-panel";
import { ProjectComplianceExportsSection } from "@/components/projects/project-compliance-exports-section";
import {
  type ComplianceSection,
  ProjectComplianceSectionNav,
} from "@/components/projects/project-compliance-section-nav";
import { ProjectComplianceWorkflowPanel } from "@/components/projects/project-compliance-workflow-panel";
import { ProjectEmissionsPanel } from "@/components/projects/project-emissions-panel";
import { ProjectPermanencePanel } from "@/components/projects/project-permanence-panel";
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
  type WorkArea,
} from "@/lib/api";
import { isMonitoringOnlyProject, isSatelliteWatchEnabled } from "@/lib/project-monitoring";
import { projectComplianceHref } from "@/lib/compliance-links";

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

function anchorToSection(anchor: string): ComplianceSection | null {
  if (anchor === "checklist") return "checklist";
  if (anchor === "violations") return "issues";
  if (anchor === "exports") return "exports";
  return null;
}

function parseComplianceSectionParam(value: string | null): ComplianceSection | null {
  if (!value) return null;
  const allowed: ComplianceSection[] = [
    "overview",
    "checklist",
    "safeguards",
    "integrity",
    "emissions",
    "pest_intel",
    "exports",
    "share",
    "issues",
  ];
  return allowed.includes(value as ComplianceSection) ? (value as ComplianceSection) : null;
}

type ProjectTab = "overview" | "compliance" | "credits" | "trees" | "team" | "settings";

export function ProjectComplianceTab({
  projectId,
  projectCode,
  projectMetadata,
  schemeCode,
  workAreas = [],
  monitoringMode: monitoringModeProp,
  satelliteWatchEnabled: satelliteWatchProp,
  onNavigateTab,
}: {
  projectId: string;
  projectCode?: string;
  projectMetadata?: Record<string, unknown>;
  schemeCode?: string | null;
  workAreas?: WorkArea[];
  monitoringMode?: boolean;
  satelliteWatchEnabled?: boolean;
  onNavigateTab?: (tab: ProjectTab) => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const monitoringMode =
    monitoringModeProp ?? isMonitoringOnlyProject({ scheme_code: schemeCode ?? null });
  const satelliteWatchEnabled =
    satelliteWatchProp ??
    isSatelliteWatchEnabled({
      scheme_code: schemeCode ?? null,
      metadata: projectMetadata,
    });
  const [section, setSection] = useState<ComplianceSection>(
    monitoringMode ? "checklist" : "overview",
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const pestAreaId = useMemo(
    () => selectedAreaId ?? workAreas[0]?.id ?? null,
    [selectedAreaId, workAreas],
  );
  const showPestIntel = workAreas.length > 0;
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
    const fromUrl = parseComplianceSectionParam(searchParams.get("section"));
    if (fromUrl) setSection(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!monitoringMode) return;
    if (section === "overview") {
      setSection("checklist");
      return;
    }
    if (section === "integrity" || section === "emissions" || section === "safeguards") {
      setSection("checklist");
    }
  }, [monitoringMode, section]);

  useEffect(() => {
    if (workflow?.recommended_checklist) {
      setChecklistCode(workflow.recommended_checklist as ChecklistCode);
    }
  }, [workflow?.recommended_checklist]);

  useEffect(() => {
    if (section === "pest_intel" && !showPestIntel) {
      setSection(monitoringMode ? "checklist" : "overview");
    }
  }, [section, showPestIntel, monitoringMode]);

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
    if (schemeCode === "dfi_green_corridor") {
      setChecklistCode("world_bank_esf");
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

  const exportMonitoringDossier = useMutation({
    mutationFn: () => plantingProjects.exportMonitoringDossier(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      downloadBlob(blob, `${code}-monitoring-dossier-${stamp}.pdf`);
    },
  });

  const exportIntegrityFusion = useMutation({
    mutationFn: (format: "json" | "csv") => plantingProjects.exportIntegrityFusion(projectId, format),
    onSuccess: (blob, format) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-integrity-fusion.${format}`);
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

  const exportEsfPs5 = useMutation({
    mutationFn: () => plantingProjects.exportEsfPs5Pack(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-esf-ps5-tenure.xlsx`);
    },
  });

  const exportEsfPs6 = useMutation({
    mutationFn: () => plantingProjects.exportEsfPs6Pack(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-esf-ps6-biodiversity.xlsx`);
    },
  });

  const exportUndpSes = useMutation({
    mutationFn: () => plantingProjects.exportUndpSesPack(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-undp-ses-screening.xlsx`);
    },
  });

  const exportMultilateralPack = useMutation({
    mutationFn: () => plantingProjects.exportMultilateralAuditPack(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-multilateral-audit-pack.zip`);
    },
  });

  const exportEudrDueDiligence = useMutation({
    mutationFn: (format: "xlsx" | "zip") =>
      plantingProjects.exportEudrDueDiligence(projectId, format),
    onSuccess: (blob, format) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      const ext = format === "zip" ? "zip" : "xlsx";
      downloadBlob(blob, `${code}-eudr-due-diligence.${ext}`);
    },
  });

  const exportSbtiFlag = useMutation({
    mutationFn: () => plantingProjects.exportSbtiFlagProject(projectId),
    onSuccess: (blob) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-sbti-flag.xlsx`);
    },
  });

  function selectSection(next: ComplianceSection) {
    setSection(next);
    router.replace(`${projectComplianceHref(projectId)}?section=${next}`, { scroll: false });
  }

  function navigateToAnchor(anchor: string) {
    const next = anchorToSection(anchor);
    if (next) selectSection(next);
  }

  function selectChecklist(code: string) {
    setChecklistCode(code as ChecklistCode);
    selectSection("checklist");
  }

  const busy =
    exportMrv.isPending ||
    exportBundle.isPending ||
    exportMonitoringDossier.isPending ||
    exportFramework.isPending ||
    exportGreenCreditPortal.isPending ||
    exportCampaState.isPending ||
    exportEsfPs5.isPending ||
    exportEsfPs6.isPending ||
    exportUndpSes.isPending ||
    exportMultilateralPack.isPending ||
    exportEudrDueDiligence.isPending ||
    exportSbtiFlag.isPending;

  const selectedFramework = frameworks.find((f) => f.code === frameworkProfile);

  if (isLoading) return <p className="text-sm text-stone-500">Loading compliance records…</p>;

  return (
    <div className="space-y-4">
      <ComplianceHubLinks projectId={projectId} />
      <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)]">
      <ProjectComplianceSectionNav
        active={section}
        onChange={selectSection}
        openViolations={violations.length}
        showPestIntel={showPestIntel}
        monitoringMode={monitoringMode}
      />

      <div className="min-w-0 space-y-4">
        {section === "overview" && (
          <ProjectComplianceWorkflowPanel
            projectId={projectId}
            projectMetadata={projectMetadata}
            onNavigateTab={onNavigateTab}
            onScrollToAnchor={navigateToAnchor}
            onSelectChecklist={selectChecklist}
          />
        )}

        {section === "checklist" && (
          <div className="space-y-4">
            {monitoringMode && (
              <ProjectComplianceWorkflowPanel
                projectId={projectId}
                projectMetadata={projectMetadata}
                monitoringMode
                onNavigateTab={onNavigateTab}
                onScrollToAnchor={navigateToAnchor}
                onSelectChecklist={selectChecklist}
              />
            )}
            <div className="card space-y-4" id="compliance-checklist">
              <ProjectComplianceChecklistPanel
                projectId={projectId}
                initialChecklistCode={checklistCode}
                onNavigateTab={onNavigateTab}
                onScrollToAnchor={navigateToAnchor}
                gapContext={{
                  satelliteWatchEnabled,
                  primaryWorkAreaId: workAreas[0]?.id,
                }}
                onSaved={() => {
                  qc.invalidateQueries({ queryKey: ["compliance-workflow", projectId] });
                }}
              />
            </div>
          </div>
        )}

        {section === "safeguards" && <ProjectSafeguardsPanel projectId={projectId} />}

        {section === "integrity" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-950">
              <p className="font-medium">SAR permanence &amp; leakage — not credit fusion scores</p>
              <p className="mt-1 text-xs text-sky-900/90">
                This section covers satellite forest integrity, NPRT buffer, and leakage accounts.
                For per-tree fusion scores, credit gates, and registry claimability, open{" "}
                <Link
                  href={`/projects/${projectId}/credits`}
                  className="font-medium text-forest-800 underline-offset-2 hover:underline"
                >
                  Credits &amp; reports → Integrity fusion
                </Link>
                .
              </p>
            </div>
            <ProjectPermanencePanel
              projectId={projectId}
              onNavigateCredits={onNavigateTab ? () => onNavigateTab("credits") : undefined}
            />
          </div>
        )}

        {section === "emissions" && (
          <ProjectEmissionsPanel
            projectId={projectId}
            projectCode={projectCode}
            workAreas={workAreas}
          />
        )}

        {section === "pest_intel" && showPestIntel && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-forest-700" />
              <h2 className="text-lg font-semibold text-stone-900">Pest & disease watch</h2>
            </div>
            <p className="text-sm text-stone-600">
              Weather, locust, and canopy stress signals for field teams — scoped to a work area.
            </p>
            <div>
              <label className="label text-xs">Work area</label>
              <select
                className="input text-sm"
                value={pestAreaId ?? ""}
                onChange={(e) => setSelectedAreaId(e.target.value || null)}
              >
                {workAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            {pestAreaId ? <PestIntelPanel kind="work-area" targetId={pestAreaId} /> : null}
          </div>
        )}

        {section === "exports" && (
          <div className="card">
            <ProjectComplianceExportsSection
              schemeCode={schemeCode}
              frameworkProfile={frameworkProfile}
              frameworks={frameworks}
              selectedFramework={selectedFramework}
              onFrameworkChange={setFrameworkProfile}
              monitoringMode={monitoringMode}
              satelliteWatchEnabled={satelliteWatchEnabled}
              exports={{
                busy,
                exportMrv,
                exportBundle,
                exportMonitoringDossier,
                exportIntegrityFusion,
                exportFramework,
                exportGreenCreditPortal,
                exportCampaState,
                exportEsfPs5,
                exportEsfPs6,
                exportUndpSes,
                exportMultilateralPack,
                exportEudrDueDiligence,
                exportSbtiFlag,
              }}
            />
          </div>
        )}

        {section === "share" && (
          <div className="card space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
              <Link2 className="h-4 w-4 text-forest-700" />
              Public verification link
            </div>
            <p className="text-xs text-stone-600">
              Share a read-only verification page with auditors, registries, or courts. No login
              required.
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
        )}

        {section === "issues" && (
          <div id="compliance-violations">
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
                            <a
                              href={`/trees/${v.tree_id}`}
                              className="text-forest-700 hover:underline"
                            >
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
        )}
      </div>
      </div>
    </div>
  );
}
