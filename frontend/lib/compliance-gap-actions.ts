export type ProjectTab = "overview" | "compliance" | "credits" | "trees" | "team" | "settings";

export type ComplianceGapAction = {
  label: string;
  tab?: ProjectTab;
  anchor?: string;
  href?: string;
};

type GapContext = {
  projectId: string;
};

const AUTO_KEY_ACTIONS: Record<string, Omit<ComplianceGapAction, "href"> & { href?: string | ((ctx: GapContext) => string) }> = {
  has_trees: {
    label: "Register tree",
    href: (ctx) => `/trees/new?project=${ctx.projectId}`,
  },
  has_work_areas: {
    label: "Draw work areas",
    tab: "overview",
  },
  geo_tagged_majority: {
    label: "Review trees",
    tab: "trees",
  },
  satellite_coverage: {
    label: "Run satellite scan",
    href: "/portfolio-health?tab=monitoring",
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
  active_standard_attached: {
    label: "Review planting standard",
    tab: "overview",
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
};

export function resolveComplianceGapAction(
  gap: { item_id: string; auto_key?: string | null },
  ctx: GapContext,
): ComplianceGapAction {
  if (gap.auto_key && AUTO_KEY_ACTIONS[gap.auto_key]) {
    const action = AUTO_KEY_ACTIONS[gap.auto_key];
    const href =
      typeof action.href === "function" ? action.href(ctx) : action.href;
    return {
      label: action.label,
      tab: action.tab,
      anchor: action.anchor,
      href,
    };
  }

  if (ITEM_ID_ACTIONS[gap.item_id]) {
    return ITEM_ID_ACTIONS[gap.item_id];
  }

  return {
    label: "Open checklist",
    tab: "compliance",
    anchor: "checklist",
  };
}
