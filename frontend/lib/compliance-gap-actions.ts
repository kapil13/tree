import {
  parseProjectSecondaryTab,
  projectOverviewHref,
  projectSecondaryHref,
  projectSetupHref,
  type ProjectSecondaryTab,
} from "@/lib/project-focused-ui";
import { complianceAnchorToSection, projectComplianceHref } from "@/lib/compliance-links";
import { satelliteHref } from "@/lib/satellite-links";

export type ProjectTab = "overview" | "compliance" | "credits" | "trees" | "team" | "settings";

export type ComplianceGapAction = {
  label: string;
  tab?: ProjectTab;
  anchor?: string;
  href?: string;
};

export type GapContext = {
  projectId: string;
  primaryWorkAreaId?: string | null;
  /** When true, satellite gap actions deep-link to this project's map workspace. */
  satelliteWatchEnabled?: boolean;
};

export function projectTabHref(
  projectId: string,
  tab: ProjectTab,
  anchor?: string,
): string {
  if (tab === "overview" || tab === "trees") {
    const base = projectOverviewHref(projectId);
    return anchor ? `${base}#${anchor}` : base;
  }
  if (parseProjectSecondaryTab(tab)) {
    if (tab === "compliance") {
      const section = anchor ? complianceAnchorToSection(anchor) ?? anchor : undefined;
      return projectComplianceHref(projectId, section ?? undefined);
    }
    const base = projectSecondaryHref(projectId, tab as ProjectSecondaryTab);
    return anchor ? `${base}#${anchor}` : base;
  }
  return projectOverviewHref(projectId);
}

function monitoringSatelliteHref(ctx: GapContext): string {
  return satelliteHref({
    fenceId: ctx.primaryWorkAreaId,
    projectId: ctx.satelliteWatchEnabled ? ctx.projectId : undefined,
  });
}

const AUTO_KEY_ACTIONS: Record<
  string,
  Omit<ComplianceGapAction, "href"> & { href?: string | ((ctx: GapContext) => string) }
> = {
  has_trees: {
    label: "Register tree",
    href: (ctx) => `/trees/new?project=${ctx.projectId}`,
  },
  has_work_areas: {
    label: "Draw work areas",
    href: (ctx) => projectSetupHref(ctx.projectId, 4),
  },
  geo_tagged_majority: {
    label: "Review trees",
    tab: "trees",
  },
  satellite_coverage: {
    label: "Run satellite scan",
    href: (ctx) =>
      ctx.satelliteWatchEnabled ? monitoringSatelliteHref(ctx) : "/portfolio-health?tab=monitoring",
  },
  work_area_scan_coverage: {
    label: "Run NDVI scan",
    href: (ctx) => monitoringSatelliteHref(ctx),
  },
  no_block_violations: {
    label: "Fix violations",
    tab: "compliance",
    anchor: "violations",
  },
  no_open_violations: {
    label: "View violations",
    tab: "compliance",
    anchor: "violations",
  },
  survival_survey_configured: {
    label: "Save survey cadence",
    tab: "settings",
  },
  credit_ledger_synced: {
    label: "Sync credit ledger",
    tab: "credits",
  },
  leakage_documented: {
    label: "Add leakage account",
    tab: "credits",
  },
  nprt_assessed: {
    label: "Run NPRT assessment",
    tab: "credits",
  },
  sar_permanence_risk: {
    label: "Review SAR integrity",
    href: (ctx) =>
      ctx.satelliteWatchEnabled ? monitoringSatelliteHref(ctx) : "/portfolio-health?tab=monitoring",
  },
  estate_metadata_complete: {
    label: "Complete estate details",
    href: (ctx) => projectSetupHref(ctx.projectId, 3),
  },
  ca_ref_documented: {
    label: "Retire serial with CA ref",
    tab: "credits",
  },
  article6_authorization_ref: {
    label: "Add authorization ref",
    tab: "settings",
  },
  article6_serials_present: {
    label: "Open credits ledger",
    tab: "credits",
  },
  ps6_biodiversity_evidence: {
    label: "Run bioacoustic / satellite monitoring",
    href: "/portfolio-health?tab=monitoring",
  },
  ses_risk_screened: {
    label: "Upload safeguard documents",
    tab: "compliance",
  },
  active_standard_attached: {
    label: "Review planting standard",
    tab: "overview",
    href: (ctx) => projectSetupHref(ctx.projectId, 2),
  },
  native_species_tracked: {
    label: "Register native species",
    href: (ctx) => `/trees/new?project=${ctx.projectId}`,
  },
};

const ITEM_ID_ACTIONS: Record<string, ComplianceGapAction> = {
  post_2009_planting: { label: "Answer in checklist", tab: "compliance", anchor: "checklist" },
  non_forest_baseline: { label: "Answer in checklist", tab: "compliance", anchor: "checklist" },
  buffer_acknowledged: { label: "Answer in checklist", tab: "compliance", anchor: "checklist" },
  strata_documented: { label: "Register trees", tab: "trees" },
  credit_ledger_ready: { label: "Open credits", tab: "credits" },
  geo_tagged_records: { label: "Review trees", tab: "trees" },
  no_blocking_violations: { label: "Fix violations", tab: "compliance", anchor: "violations" },
  survival_monitoring: { label: "Project settings", tab: "settings" },
  alert_review_cadence: { label: "Review alerts", href: "/alerts" },
  baseline_metadata: { label: "Complete estate details", tab: "overview" },
};

export function resolveComplianceGapAction(
  gap: { item_id: string; auto_key?: string | null },
  ctx: GapContext,
): ComplianceGapAction {
  if (gap.auto_key && AUTO_KEY_ACTIONS[gap.auto_key]) {
    const action = AUTO_KEY_ACTIONS[gap.auto_key];
    const href =
      typeof action.href === "function" ? action.href(ctx) : action.href;
    const resolvedHref =
      href ??
      (action.tab ? projectTabHref(ctx.projectId, action.tab, action.anchor) : undefined);
    return {
      label: action.label,
      tab: action.tab,
      anchor: action.anchor,
      href: resolvedHref,
    };
  }

  if (ITEM_ID_ACTIONS[gap.item_id]) {
    const action = ITEM_ID_ACTIONS[gap.item_id];
    const href =
      gap.item_id === "baseline_metadata"
        ? projectSetupHref(ctx.projectId, 3)
        : action.href ??
          (action.tab ? projectTabHref(ctx.projectId, action.tab, action.anchor) : undefined);
    return {
      label: action.label,
      tab: action.tab,
      anchor: action.anchor,
      href,
    };
  }

  return {
    label: "Open checklist",
    tab: "compliance",
    anchor: "checklist",
    href: projectTabHref(ctx.projectId, "compliance", "checklist"),
  };
}
