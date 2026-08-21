/** Sprint D: focused project page — secondary sections as sub-routes. */
export const PROJECT_SECONDARY_TABS = [
  "compliance",
  "credits",
  "team",
  "settings",
] as const;

export type ProjectSecondaryTab = (typeof PROJECT_SECONDARY_TABS)[number];

export type ProjectWorkspaceSection = "overview" | ProjectSecondaryTab;

export function parseProjectSecondaryTab(
  value: string | null,
): ProjectSecondaryTab | null {
  if (!value) return null;
  return PROJECT_SECONDARY_TABS.includes(value as ProjectSecondaryTab)
    ? (value as ProjectSecondaryTab)
    : null;
}

export function parseProjectSecondarySegment(
  segment: string | null | undefined,
): ProjectSecondaryTab | null {
  return parseProjectSecondaryTab(segment ?? null);
}

export function projectOverviewHref(projectId: string): string {
  return `/projects/${projectId}`;
}

export function projectSecondaryHref(
  projectId: string,
  tab: ProjectSecondaryTab,
): string {
  return `/projects/${projectId}/${tab}`;
}

/** Map legacy ?tab= values to sub-routes (overview/trees → main page). */
export function resolveLegacyProjectTabHref(
  projectId: string,
  tab: string | null,
): string | null {
  const secondary = parseProjectSecondaryTab(tab);
  if (secondary) return projectSecondaryHref(projectId, secondary);
  if (tab === "overview" || tab === "trees") return projectOverviewHref(projectId);
  return null;
}

export const PROJECT_SECONDARY_LABELS: Record<ProjectSecondaryTab, string> = {
  compliance: "Compliance",
  credits: "Credits & reports",
  team: "Team & work areas",
  settings: "Programme settings",
};

/** Short labels for compact sub-nav on small screens. */
export const PROJECT_SECONDARY_SHORT_LABELS: Record<ProjectSecondaryTab, string> = {
  compliance: "Compliance",
  credits: "Credits",
  team: "Team",
  settings: "Settings",
};

export const PROJECT_WORKSPACE_NAV: Array<{
  id: ProjectWorkspaceSection;
  label: string;
  shortLabel: string;
}> = [
  { id: "overview", label: "Overview", shortLabel: "Overview" },
  {
    id: "compliance",
    label: PROJECT_SECONDARY_LABELS.compliance,
    shortLabel: PROJECT_SECONDARY_SHORT_LABELS.compliance,
  },
  {
    id: "credits",
    label: PROJECT_SECONDARY_LABELS.credits,
    shortLabel: PROJECT_SECONDARY_SHORT_LABELS.credits,
  },
  {
    id: "team",
    label: PROJECT_SECONDARY_LABELS.team,
    shortLabel: PROJECT_SECONDARY_SHORT_LABELS.team,
  },
  {
    id: "settings",
    label: PROJECT_SECONDARY_LABELS.settings,
    shortLabel: PROJECT_SECONDARY_SHORT_LABELS.settings,
  },
];

/** Marker string embedded in the focused layout for deploy verification. */
export const PROJECT_FOCUSED_LAYOUT_MARKER = "project-focused-layout-v3";
