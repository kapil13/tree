"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, ExternalLink, Heart, MapPin, Satellite, Sparkles } from "lucide-react";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import { DataTrustBadge, isSatelliteProviderLive, isTrustModeLive } from "@/components/data-trust-badge";
import { CarbonEstimateLabel } from "@/components/carbon-estimate-label";
import { showToast } from "@/components/toast";
import { AiScanUsagePanel } from "@/components/settings/ai-scan-usage-panel";
import { BuyAiScanPacks } from "@/components/payments/buy-ai-scan-packs";
import { NdviImagePreview } from "@/components/ndvi-image-preview";
import { NdviStatsPanel } from "@/components/ndvi-stats-panel";
import { SatelliteHealthPanel } from "@/components/satellite-health-panel";
import { SarTreePanel } from "@/components/satellite/sar-tree-panel";
import { TreePhoto } from "@/components/trees/tree-photo";
import { TreeMeasurementsPanel } from "@/components/trees/tree-measurements-panel";
import { PhotoUploadZone } from "@/components/registration/photo-upload-zone";
import { PageHeader } from "@/components/ui/page-header";
import { TrustChip, trustToneFromProvider } from "@/components/ui/trust-chip";
import { trees, aiScans, errorMessage, intelligence, plantingProjects, uploads } from "@/lib/api";
import { citizen } from "@/lib/citizen-api";
import { useAuth } from "@/lib/auth-store";
import { resolveIntegrityRemediation } from "@/lib/integrity-remediation";
import { canWriteInApp, userHasProfessionalAccess, viewerReadOnlyMessage } from "@/lib/nav-access";
import { cn } from "@/lib/cn";

const TABS = ["overview", "field", "intelligence"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  field: "Field survey",
  intelligence: "Intelligence",
};

const METADATA_LABELS: Record<string, string> = {
  chainage_km: "Chainage (km)",
  survival_status: "Survival status",
  visibility_public: "Public visibility",
  survey_interval_days: "Survey interval (days)",
  guard_type: "Tree guard",
  pit_size_cm: "Pit size (cm)",
  spacing_m: "Spacing (m)",
  species_native: "Native species",
  planting_method: "Planting method",
  notes: "Notes",
  side: "Road side",
  row: "Row",
  plot_id: "Plot ID",
  block: "Block",
  zone: "Zone",
};

function humanizeMetaKey(key: string): string {
  if (METADATA_LABELS[key]) return METADATA_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-stone-100 py-2 text-sm last:border-0">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-900">{value}</dd>
    </div>
  );
}

function verificationLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function integrityFlags(risk: import("@/lib/api").TreeRiskScore | null) {
  if (!risk) return "—";
  const flags: string[] = [];
  if (risk.gps_photo_match) flags.push("GPS match");
  if (risk.duplicate_photo) flags.push("Duplicate photo");
  if (risk.duplicate_coordinate) flags.push("Duplicate coordinate");
  if (risk.ai_confidence_low) flags.push("Low AI confidence");
  if (risk.regeotag_mismatch) flags.push("Re-geotag mismatch");
  return flags.length ? flags.join(", ") : "No flags";
}

function auditReadyBlockers(risk: import("@/lib/api").TreeRiskScore | null): string[] {
  const blockers = risk?.fusion_details?.audit_ready_blockers;
  if (!Array.isArray(blockers)) return [];
  return blockers.filter((item): item is string => typeof item === "string");
}

function healthBadge(h: string) {
  const cls =
    h === "healthy"
      ? "badge-healthy"
      : h === "moderate"
        ? "badge-moderate"
        : h === "unhealthy"
          ? "badge-unhealthy"
          : "badge-unknown";
  return <span className={cls}>{h}</span>;
}

export function TreeDetailView() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canWrite = canWriteInApp(user);
  const showChainage = userHasProfessionalAccess(user);
  const [survivalStatus, setSurvivalStatus] = useState("live");
  const [complianceNote, setComplianceNote] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [followUpPreviews, setFollowUpPreviews] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: tree, isLoading, error } = useQuery({
    queryKey: ["tree", id],
    queryFn: () => trees.get(id),
    enabled: !!id,
  });

  const { data: project } = useQuery({
    queryKey: ["planting-project", tree?.project_id],
    queryFn: () => plantingProjects.get(tree!.project_id!),
    enabled: Boolean(tree?.project_id),
  });

  const cameraOnly = project?.compliance_mode === "strict";
  const remediationCtx = {
    treeId: id,
    projectId: tree?.project_id ?? undefined,
    workAreaId: tree?.plantation_id ?? undefined,
    satelliteWatchEnabled: Boolean(tree?.project_id),
  };

  const { data: stewardship } = useQuery({
    queryKey: ["citizen-stewardship"],
    queryFn: () => citizen.stewardship(),
    enabled: Boolean(user?.id),
  });

  const adoptTree = useMutation({
    mutationFn: () => citizen.adoptTree(id),
    onSuccess: (result) => {
      showToast(
        result.new_badges.length
          ? `Adopted! Badge: ${result.new_badges[0]?.label}`
          : "You are now stewarding this tree.",
      );
      qc.invalidateQueries({ queryKey: ["citizen-stewardship"] });
      qc.invalidateQueries({ queryKey: ["citizen-profile"] });
    },
    onError: (err) => showToast(errorMessage(err)),
  });

  const isOwner = tree?.owner_user_id === user?.id;
  const isAdopted = stewardship?.adopted.some((t) => t.id === id);
  const canAdopt =
    tree &&
    user &&
    !isOwner &&
    !isAdopted &&
    !tree.project_id &&
    (tree.metadata?.visibility_public ?? true);

  const { data: sat } = useQuery({
    queryKey: ["sat", id],
    queryFn: () => trees.satellite(id),
    enabled: !!id,
    retry: false,
  });

  const { data: analyses } = useQuery({
    queryKey: ["tree-analyses", id],
    queryFn: () => trees.analyses(id),
    enabled: !!id,
  });

  const { data: scanUsage } = useQuery({
    queryKey: ["ai-scan-usage"],
    queryFn: () => aiScans.usage(),
  });

  const { data: integrationsHealth } = useQuery({
    queryKey: ["integrations-health"],
    queryFn: () => intelligence.integrations(),
    staleTime: 60_000,
  });

  const aiIntegration = integrationsHealth?.integrations?.ai_analysis as
    | { mode?: string; label?: string }
    | undefined;
  const satIntegration = integrationsHealth?.integrations?.tree_satellite_ndvi as
    | { mode?: string; label?: string }
    | undefined;
  const aiTrustMode = aiIntegration?.mode ?? "estimate";
  const satProvider = sat?.latest?.provider;
  const satTrustMode =
    satProvider && isSatelliteProviderLive(satProvider)
      ? "live"
      : (satIntegration?.mode ?? "estimate");
  const satTrustChip = satProvider
    ? trustToneFromProvider(satProvider)
    : satTrustMode === "live" || satTrustMode === "configured"
      ? { tone: "live" as const, label: "Live data" }
      : { tone: "stub" as const, label: "Stub / estimate" };

  const analyze = useMutation({
    mutationFn: () => trees.analyze(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tree", id] });
      qc.invalidateQueries({ queryKey: ["tree-analyses", id] });
      qc.invalidateQueries({ queryKey: ["ai-scan-usage"] });
      showToast("AI analysis complete");
    },
  });

  const regeotag = useMutation({
    mutationFn: (payload: {
      latitude: number;
      longitude: number;
      accuracy_m?: number;
      survival_status?: string;
    }) => trees.regeotag(id, payload),
    onSuccess: (data) => {
      setComplianceNote(null);
      if (data.compliance?.issues?.length) {
        const msgs = data.compliance.issues.map((i) => i.message).join(" · ");
        setComplianceNote(
          data.compliance.passed
            ? `Re-geotagged with warnings: ${msgs}`
            : `Re-geotagged with compliance notes: ${msgs}`,
        );
      } else if (data.compliance) {
        setComplianceNote("Re-geotagged — all compliance checks passed.");
      }
      showToast("Survival survey GPS updated");
      qc.invalidateQueries({ queryKey: ["tree", id] });
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail !== null && "compliance_errors" in detail) {
        const issues = (detail as { compliance_errors: { message: string }[] }).compliance_errors;
        setComplianceNote(issues.map((i) => i.message).join(" · "));
      }
    },
  });

  useEffect(() => {
    if (tree?.metadata?.survival_status) {
      setSurvivalStatus(String(tree.metadata.survival_status));
    }
  }, [tree?.metadata?.survival_status]);

  useEffect(() => {
    const applyHash = () => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash === "#survival" || hash === "#follow-up-photo") setTab("field");
      if (hash === "#ai-analysis") setTab("intelligence");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  async function addFollowUpPhoto(files: FileList) {
    setUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        const s3Key = await uploads.uploadImage(file);
        await trees.addImage(id, s3Key);
        setFollowUpPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      }
      showToast("Follow-up photo added");
      qc.invalidateQueries({ queryKey: ["tree", id] });
      if (tree?.project_id) {
        qc.invalidateQueries({ queryKey: ["integrity-fusion", tree.project_id] });
      }
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleRegeotag() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        regeotag.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          survival_status: survivalStatus,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const downloadPassport = useMutation({
    mutationFn: () => trees.passportPdfUrl(id),
    onSuccess: (url) => window.open(url, "_blank"),
  });

  if (isLoading) return <div className="text-sm text-stone-500">Loading tree…</div>;

  if (error || !tree) {
    return (
      <div className="card text-sm text-rose-700">
        {error ? errorMessage(error) : "Tree not found."}{" "}
        <Link href="/trees" className="text-forest-700 underline">
          Back to trees
        </Link>
      </div>
    );
  }

  const co2e = (Number(tree.current_carbon_kg) * 44) / 12;
  const primaryImage = tree.images.find((i) => i.is_primary) ?? tree.images[0];
  const mapsUrl =
    tree.latitude != null && tree.longitude != null
      ? `https://www.google.com/maps?q=${tree.latitude},${tree.longitude}`
      : null;
  const metadataEntries = Object.entries(tree.metadata ?? {}).filter(
    ([, v]) => v !== null && v !== "" && v !== undefined,
  );

  const needsSurvey =
    !tree.last_geotag_at ||
    Date.now() - new Date(tree.last_geotag_at).getTime() > 30 * 24 * 60 * 60 * 1000;
  const needsAnalysis = !analyses?.length;

  let primaryCta: React.ReactNode = null;
  if (canAdopt) {
    primaryCta = (
      <button
        type="button"
        className="btn-primary"
        disabled={adoptTree.isPending}
        onClick={() => adoptTree.mutate()}
      >
        <Heart className="h-4 w-4" />
        {adoptTree.isPending ? "Adopting…" : "Adopt this tree"}
      </button>
    );
  } else if (canWrite && needsSurvey) {
    primaryCta = (
      <button
        type="button"
        className="btn-primary"
        disabled={regeotag.isPending}
        onClick={() => {
          setTab("field");
          handleRegeotag();
        }}
      >
        <MapPin className="h-4 w-4" />
        {regeotag.isPending ? "Updating GPS…" : "Re-geotag survey"}
      </button>
    );
  } else if (canWrite && needsAnalysis) {
    primaryCta = (
      <button
        className="btn-primary"
        onClick={() => {
          setTab("intelligence");
          analyze.mutate();
        }}
        disabled={analyze.isPending || scanUsage?.can_scan === false}
        title={
          scanUsage?.can_scan === false
            ? "Complimentary BYOT AI scans used — request a professional program or wait for paid top-ups"
            : undefined
        }
      >
        <Sparkles className="h-4 w-4" />
        {analyze.isPending ? "Analyzing…" : "Run AI analysis"}
      </button>
    );
  } else {
    primaryCta = (
      <button
        className="btn-primary"
        onClick={() => downloadPassport.mutate()}
        disabled={downloadPassport.isPending}
      >
        <Download className="h-4 w-4" /> Passport PDF
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tree.species_text || "Unknown species"}
        description={tree.public_code}
        breadcrumbs={[
          { label: "Operate", href: "/trees" },
          { label: "Trees", href: "/trees" },
          { label: tree.public_code },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {primaryCta}
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                <ExternalLink className="h-4 w-4" /> Maps
              </a>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {healthBadge(tree.current_health)}
        <DataTrustBadge mode={aiTrustMode} />
        {satProvider || sat?.latest ? (
          <TrustChip tone={satTrustChip.tone} label={satTrustChip.label} />
        ) : (
          <TrustChip tone="warn" label="Satellite pending" />
        )}
      </div>

      {!canWrite && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {viewerReadOnlyMessage("trees")}
        </div>
      )}

      {canAdopt ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
          This tree is open for community adoption. Steward it with monthly check-ins and earn badges.
        </div>
      ) : null}

      {isAdopted ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/20">
          You are stewarding this tree. Complete survival check-ins to keep your streak and badges.
        </div>
      ) : null}

      <div className="-mx-1 overflow-x-auto">
        <div className="flex min-w-max gap-1 border-b border-stone-200 px-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "shrink-0 border-b-2 px-4 py-2 text-sm font-medium",
                tab === t
                  ? "border-forest-700 text-forest-800"
                  : "border-transparent text-stone-500 hover:text-stone-800",
              )}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-1">
              <h2 className="mb-3 text-sm font-medium text-stone-700">Photo</h2>
              {primaryImage ? (
                <TreePhoto
                  treeId={tree.id}
                  imageId={primaryImage.id}
                  alt={tree.species_text || tree.public_code}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ) : (
                <p className="text-sm text-stone-500">No photo uploaded.</p>
              )}
            </div>

            <div className="card lg:col-span-2">
              <h2 className="mb-3 text-sm font-medium text-stone-700">Overview</h2>
              <dl>
                <Field label="Health" value={healthBadge(tree.current_health)} />
                <Field label="Status" value={tree.status} />
                <Field
                  label="Verification"
                  value={verificationLabel(tree.verification_status || "registered")}
                />
                {tree.risk_score ? (
                  <>
                    <Field
                      label="Integrity risk"
                      value={`${Math.round(tree.risk_score.composite_risk * 100)}%`}
                    />
                    {tree.risk_score.fusion_score != null && (
                      <Field
                        label="Fusion score"
                        value={`${Math.round(tree.risk_score.fusion_score)}/100`}
                      />
                    )}
                    {tree.risk_score.field_score != null && (
                      <Field
                        label="Field / satellite"
                        value={`${Math.round(tree.risk_score.field_score)} / ${Math.round(tree.risk_score.satellite_score ?? 0)}`}
                      />
                    )}
                    <Field
                      label="Credit eligible"
                      value={
                        tree.risk_score.credit_eligible ? (
                          <span className="text-emerald-700">Yes</span>
                        ) : (
                          <span className="text-amber-700">No</span>
                        )
                      }
                    />
                    <Field label="Integrity flags" value={integrityFlags(tree.risk_score)} />
                    {auditReadyBlockers(tree.risk_score).length > 0 ? (
                      <Field
                        label="Audit-ready blockers"
                        value={
                          <ul className="space-y-2 text-sm text-amber-800">
                            {auditReadyBlockers(tree.risk_score).map((blocker) => {
                              const action = resolveIntegrityRemediation(blocker, remediationCtx);
                              return (
                                <li key={blocker} className="flex flex-wrap items-start justify-between gap-2">
                                  <span>{action.label}</span>
                                  {action.actionLabel && action.href && canWrite ? (
                                    <Link
                                      href={action.href}
                                      className="shrink-0 text-xs font-medium text-forest-700 hover:underline"
                                    >
                                      {action.actionLabel}
                                    </Link>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        }
                      />
                    ) : null}
                    {typeof tree.risk_score.fusion_details?.photo_span_days === "number" ? (
                      <Field
                        label="Photo evidence span"
                        value={`${Math.round(tree.risk_score.fusion_details.photo_span_days)} days`}
                      />
                    ) : null}
                  </>
                ) : tree.project_id ? (
                  <Field
                    label="Integrity fusion"
                    value={
                      <span className="text-sm text-stone-600">
                        Not computed yet.{" "}
                        <Link
                          href={`/projects/${tree.project_id}/credits`}
                          className="font-medium text-forest-700 hover:underline"
                        >
                          Recalculate on project
                        </Link>
                      </span>
                    }
                  />
                ) : null}
                <Field label="Program" value={tree.program_code?.replace(/_/g, " ") || "—"} />
                {tree.project_id && (
                  <Field
                    label="Project"
                    value={
                      <Link
                        href={`/projects/${tree.project_id}`}
                        className="text-forest-700 hover:underline"
                      >
                        Open project
                      </Link>
                    }
                  />
                )}
                {showChainage ? (
                  <Field
                    label="Chainage"
                    value={
                      tree.metadata?.chainage_km != null
                        ? String(tree.metadata.chainage_km)
                        : "—"
                    }
                  />
                ) : null}
                <Field
                  label="Survival"
                  value={
                    tree.metadata?.survival_status
                      ? String(tree.metadata.survival_status)
                      : "—"
                  }
                />
                <Field
                  label="Last geotag"
                  value={
                    tree.last_geotag_at
                      ? new Date(tree.last_geotag_at).toLocaleString()
                      : "—"
                  }
                />
                <Field
                  label="Carbon"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      {`${Number(tree.current_carbon_kg).toFixed(2)} kg`}
                      <CarbonEstimateLabel compact />
                    </span>
                  }
                />
                <Field
                  label="CO₂e"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      {`${co2e.toFixed(2)} kg`}
                      <CarbonEstimateLabel compact />
                    </span>
                  }
                />
                <Field
                  label="DBH"
                  value={tree.current_dbh_cm ? `${tree.current_dbh_cm} cm` : "—"}
                />
                <Field
                  label="Height"
                  value={tree.current_height_m ? `${tree.current_height_m} m` : "—"}
                />
                <Field
                  label="Canopy"
                  value={tree.current_canopy_m ? `${tree.current_canopy_m} m` : "—"}
                />
                <Field
                  label="Satellite"
                  value={tree.satellite_verified ? "Verified" : "Pending"}
                />
                <Field
                  label="Registered"
                  value={new Date(tree.registered_at).toLocaleString()}
                />
                <Field
                  label="Planted"
                  value={
                    tree.planted_at
                      ? new Date(tree.planted_at).toLocaleDateString()
                      : "—"
                  }
                />
              </dl>
            </div>
          </div>

          {tree.images.length > 1 && (
            <div className="card">
              <h2 className="mb-3 text-sm font-medium text-stone-700">
                All photos ({tree.images.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {tree.images.map((img) => (
                  <TreePhoto
                    key={img.id}
                    treeId={tree.id}
                    imageId={img.id}
                    alt=""
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "field" && (
        <div id="survival" className="grid scroll-mt-20 gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-3 text-sm font-medium text-stone-700">Location & survey</h2>
            <dl>
              <Field label="Latitude" value={tree.latitude?.toFixed(6) ?? "—"} />
              <Field label="Longitude" value={tree.longitude?.toFixed(6) ?? "—"} />
              <Field
                label="Altitude"
                value={tree.altitude_m != null ? `${tree.altitude_m} m` : "—"}
              />
              <Field
                label="Accuracy"
                value={tree.accuracy_m != null ? `±${tree.accuracy_m} m` : "—"}
              />
            </dl>
            <div className="mt-4 space-y-2">
              <label className="kpi-label">Survival status at survey</label>
              <select
                className="input"
                value={survivalStatus}
                onChange={(e) => setSurvivalStatus(e.target.value)}
                disabled={!canWrite}
              >
                <option value="live">Live</option>
                <option value="stressed">Stressed</option>
                <option value="dead">Dead</option>
                <option value="replaced">Replaced</option>
                <option value="missing">Missing / uprooted</option>
              </select>
            </div>
            {canWrite ? (
              <button
                type="button"
                className="btn-secondary mt-4"
                disabled={regeotag.isPending}
                onClick={handleRegeotag}
              >
                <MapPin className="h-4 w-4" />
                {regeotag.isPending ? "Updating GPS…" : "Re-geotag for survival survey"}
              </button>
            ) : null}
            {regeotag.error && (
              <p className="mt-2 text-sm text-rose-700">{errorMessage(regeotag.error)}</p>
            )}
            {complianceNote && (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {complianceNote}
              </p>
            )}
            {tree.project_id && (
              <p className="mt-2 text-xs text-stone-500">
                Compliance rules are re-checked on re-geotag for project-linked trees.
              </p>
            )}
          </div>

          <div id="follow-up-photo" className="card scroll-mt-20">
            <h2 className="mb-1 text-sm font-medium text-stone-700">Follow-up photos</h2>
            <p className="mb-3 text-xs text-stone-500">
              Add dated field photos to clear audit-ready blockers (minimum 2 photos spanning 30+
              days). {cameraOnly ? "Strict mode requires camera capture with GPS EXIF." : ""}
            </p>
            {canWrite ? (
              <PhotoUploadZone
                minPhotos={0}
                photoKeys={[]}
                previews={followUpPreviews}
                busy={uploadingPhoto}
                onAdd={addFollowUpPhoto}
                onRemove={(index) =>
                  setFollowUpPreviews((prev) => prev.filter((_, i) => i !== index))
                }
                cameraOnly={cameraOnly}
              />
            ) : (
              <p className="text-sm text-stone-500">Sign in with write access to add photos.</p>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-medium text-stone-700">Registration details</h2>
            {metadataEntries.length === 0 ? (
              <p className="text-sm text-stone-500">No extra registration details.</p>
            ) : (
              <dl>
                {metadataEntries.map(([key, value]) => (
                  <Field key={key} label={humanizeMetaKey(key)} value={String(value)} />
                ))}
              </dl>
            )}
          </div>

          <div className="lg:col-span-2">
            <TreeMeasurementsPanel treeId={id} />
          </div>
        </div>
      )}

      {tab === "intelligence" && (
        <div className="space-y-4">
          <AiScanUsagePanel compact />
          {scanUsage?.tier === "byot_metered" &&
          scanUsage.payment_enabled &&
          !scanUsage.can_scan ? (
            <BuyAiScanPacks
              compact
              onSuccess={() => {
                qc.invalidateQueries({ queryKey: ["ai-scan-usage"] });
              }}
            />
          ) : null}

          {analyze.error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage(analyze.error)}
            </div>
          )}

          <div id="ai-analysis" className="card scroll-mt-20">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-stone-700">AI analysis</h2>
              <div className="flex items-center gap-2">
                <DataTrustBadge mode={aiTrustMode} />
                {canWrite ? (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => analyze.mutate()}
                    disabled={analyze.isPending || scanUsage?.can_scan === false}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {analyze.isPending ? "Analyzing…" : "Run analysis"}
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mb-3 text-xs text-stone-500">
              {aiIntegration?.label ??
                (isTrustModeLive(aiTrustMode)
                  ? "Species and health use your configured live AI provider."
                  : "Results use the built-in estimate model until live AI providers are enabled.")}
            </p>
            {!analyses?.length ? (
              <p className="text-sm text-stone-500">
                No analysis yet. Run AI analysis to populate metrics.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-stone-50 text-stone-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Health</th>
                      <th className="px-3 py-2 text-right">DBH</th>
                      <th className="px-3 py-2 text-right">Height</th>
                      <th className="px-3 py-2 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a) => (
                      <tr key={a.id} className="border-t border-stone-100">
                        <td className="px-3 py-2">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          {healthBadge(a.health ?? "unknown")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {a.estimated_dbh_cm ? `${a.estimated_dbh_cm} cm` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {a.estimated_height_m ? `${a.estimated_height_m} m` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {a.overall_confidence != null
                            ? `${Math.round(a.overall_confidence * 100)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-stone-700">
                <Satellite className="mr-1 inline h-4 w-4" />
                Satellite monitoring
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <TrustChip tone={satTrustChip.tone} label={satTrustChip.label} />
                <DataTrustBadge mode={satTrustMode} />
              </div>
            </div>
            <p className="text-xs text-stone-500">
              {satIntegration?.label ??
                (isTrustModeLive(satTrustMode)
                  ? "Individual-tree NDVI from live Sentinel Hub scenes."
                  : "Individual-tree NDVI is simulated until per-tree live scenes are enabled. Plantation fence scans can use live Sentinel Hub when configured.")}
              {satProvider ? ` Provider: ${satProvider}.` : null}
            </p>

            {sat?.points?.length ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs text-stone-500">NDVI map</p>
                    <NdviImagePreview
                      treeId={id}
                      ndvi={sat.latest?.ndvi_mean ?? sat.points[sat.points.length - 1]?.ndvi}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-stone-500">NDVI parameters</p>
                    <NdviStatsPanel latest={sat.latest} resolutionLabel="10 m chip" />
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={sat.points.map((p) => ({
                        date: new Date(p.ts).toISOString().slice(0, 7),
                        ndvi: p.ndvi,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="date" fontSize={11} stroke="#78716c" />
                      <YAxis domain={[0, 1]} fontSize={11} stroke="#78716c" />
                      <Tooltip formatter={(value: number) => [value.toFixed(3), "NDVI"]} />
                      <Area type="monotone" dataKey="ndvi" stroke="#16a34a" fill="#16a34a33" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-500">
                No NDVI data yet.{" "}
                <Link href="/satellite" className="text-forest-700 underline">
                  Run satellite scan
                </Link>
              </p>
            )}

            <SatelliteHealthPanel kind="tree" targetId={id} />
            <SarTreePanel treeId={id} />
            {tree.plantation_id && (
              <PestIntelPanel kind="work-area" targetId={tree.plantation_id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
