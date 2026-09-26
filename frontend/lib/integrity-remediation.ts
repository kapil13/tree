import { satelliteHref } from "@/lib/satellite-links";

export type IntegrityRemediationContext = {
  treeId?: string;
  projectId?: string;
  workAreaId?: string | null;
  satelliteWatchEnabled?: boolean;
};

export type IntegrityRemediationAction = {
  label: string;
  description?: string;
  actionLabel?: string;
  href?: string;
  hash?: string;
};

const BLOCKER_LABELS: Record<string, string> = {
  insufficient_photos: "Need at least 2 photos",
  photo_span_too_short: "Photos must span 30+ days",
  satellite_scan_stale: "Satellite scan older than 90 days",
  fusion_below_audit_minimum: "Fusion score below 75",
  missing_exif: "Missing camera EXIF",
  missing_photo_gps: "Photo missing GPS",
  missing_photo_timestamp: "Photo missing timestamp",
  photo_timestamp_stale: "Photo older than 7 days",
  not_satellite_corroborated: "Not satellite corroborated",
  duplicate_photo: "Duplicate photo",
  duplicate_coordinate: "Duplicate coordinate",
  satellite_not_verified: "Satellite not verified",
  ai_confidence_low: "Low AI confidence",
  regeotag_mismatch: "Re-geotag mismatch",
  sar_integrity_below_minimum: "SAR forest integrity below minimum",
  optical_scan_stale: "Work area optical scan stale",
};

type RemediationTemplate = {
  description?: string;
  actionLabel?: string;
  hash?: string;
  href?: string | ((ctx: IntegrityRemediationContext) => string | undefined);
};

const BLOCKER_ACTIONS: Record<string, RemediationTemplate> = {
  insufficient_photos: {
    description: "Add a follow-up field photo from the tree detail page.",
    actionLabel: "Add follow-up photo",
    hash: "follow-up-photo",
  },
  photo_span_too_short: {
    description: "Return after 30+ days and upload another dated photo.",
    actionLabel: "Add follow-up photo",
    hash: "follow-up-photo",
  },
  missing_exif: {
    description: "Capture a new photo with the in-app camera (strict mode).",
    actionLabel: "Add camera photo",
    hash: "follow-up-photo",
  },
  missing_photo_gps: {
    description: "Enable location on the device and capture a new photo in the field.",
    actionLabel: "Add GPS photo",
    hash: "follow-up-photo",
  },
  missing_photo_timestamp: {
    description: "Use the camera capture flow so EXIF timestamp is preserved.",
    actionLabel: "Add camera photo",
    hash: "follow-up-photo",
  },
  photo_timestamp_stale: {
    description: "Take a fresh camera photo within the last 7 days.",
    actionLabel: "Add fresh photo",
    hash: "follow-up-photo",
  },
  regeotag_mismatch: {
    description: "Run a survival survey with GPS and an optional survey photo.",
    actionLabel: "Run survival survey",
    hash: "survival",
  },
  satellite_scan_stale: {
    description: "Trigger a new satellite health scan for this tree or work area.",
    actionLabel: "Open satellite monitoring",
    href: (ctx) =>
      ctx.projectId
        ? satelliteHref({
            projectId: ctx.projectId,
            fenceId: ctx.workAreaId ?? undefined,
          })
        : "/satellite",
  },
  satellite_not_verified: {
    description: "Run satellite NDVI or health analysis to corroborate the tree.",
    actionLabel: "Open satellite monitoring",
    href: (ctx) =>
      ctx.projectId
        ? satelliteHref({
            projectId: ctx.projectId,
            fenceId: ctx.workAreaId ?? undefined,
          })
        : "/satellite",
  },
  not_satellite_corroborated: {
    description: "Complete field verification and satellite corroboration first.",
    actionLabel: "Open intelligence tab",
    hash: "ai-analysis",
  },
  fusion_below_audit_minimum: {
    description: "Resolve integrity flags and re-run fusion on the project.",
    actionLabel: "View project integrity",
    href: (ctx) => (ctx.projectId ? `/projects/${ctx.projectId}/credits` : undefined),
  },
  ai_confidence_low: {
    description: "Run an AI health scan to refresh species and health confidence.",
    actionLabel: "Run AI analysis",
    hash: "ai-analysis",
  },
  duplicate_photo: {
    description: "Replace with an original camera capture from the field.",
    actionLabel: "Add new photo",
    hash: "follow-up-photo",
  },
  duplicate_coordinate: {
    description: "Verify GPS at the planting pit and correct duplicate registrations.",
    actionLabel: "Run survival survey",
    hash: "survival",
  },
  sar_integrity_below_minimum: {
    description: "Review SAR forest integrity and schedule field verification.",
    actionLabel: "Review SAR integrity",
    href: (ctx) =>
      ctx.projectId
        ? satelliteHref({
            projectId: ctx.projectId,
            fenceId: ctx.workAreaId ?? undefined,
          })
        : "/satellite",
  },
  optical_scan_stale: {
    description: "Run an NDVI sweep on stale work areas from the satellite workspace.",
    actionLabel: "Run NDVI scan",
    href: (ctx) =>
      ctx.projectId
        ? satelliteHref({
            projectId: ctx.projectId,
            fenceId: ctx.workAreaId ?? undefined,
          })
        : "/satellite",
  },
};

export function auditBlockerLabel(reason: string): string {
  return BLOCKER_LABELS[reason] ?? reason.replace(/_/g, " ");
}

export function resolveIntegrityRemediation(
  reason: string,
  ctx: IntegrityRemediationContext = {},
): IntegrityRemediationAction {
  const label = auditBlockerLabel(reason);
  const template = BLOCKER_ACTIONS[reason];
  if (!template) {
    return { label };
  }

  const href =
    typeof template.href === "function" ? template.href(ctx) : template.href;
  const treeHref =
    ctx.treeId && (template.hash || href)
      ? href ?? `/trees/${ctx.treeId}${template.hash ? `#${template.hash}` : ""}`
      : href;

  return {
    label,
    description: template.description,
    actionLabel: template.actionLabel,
    href: treeHref,
    hash: template.hash,
  };
}

export function monitoringGateReasonLabel(reason: string): string {
  return auditBlockerLabel(reason);
}

export function resolveMonitoringGateRemediation(
  reason: string,
  ctx: IntegrityRemediationContext = {},
): IntegrityRemediationAction {
  return resolveIntegrityRemediation(reason, ctx);
}

export type IntegrityGateFailureDetail = {
  message?: string;
  blocking_trees?: Array<{
    tree_id: string;
    public_code: string;
    verification_status: string;
    fusion_score: number | null;
    credit_eligible: boolean;
    reasons: string[];
  }>;
  monitoring_gate?: {
    passed?: boolean;
    reasons?: string[];
    message?: string;
  };
};

export function parseIntegrityGateFailure(err: unknown): IntegrityGateFailureDetail | null {
  if (!err || typeof err !== "object") return null;
  const response = (err as { response?: { data?: { detail?: unknown } } }).response;
  const detail = response?.data?.detail;
  if (!detail || typeof detail !== "object" || detail === null) return null;
  const fusion = (detail as { integrity_fusion?: IntegrityGateFailureDetail }).integrity_fusion;
  if (!fusion || typeof fusion !== "object") return null;
  return {
    message: typeof fusion.message === "string" ? fusion.message : undefined,
    blocking_trees: Array.isArray(fusion.blocking_trees) ? fusion.blocking_trees : undefined,
    monitoring_gate:
      fusion.monitoring_gate && typeof fusion.monitoring_gate === "object"
        ? fusion.monitoring_gate
        : undefined,
  };
}
