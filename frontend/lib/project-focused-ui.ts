/** Sprint A: focused project page — secondary sections via ?tab= URLs. */
export const PROJECT_SECONDARY_TABS = [
  "compliance",
  "credits",
  "team",
  "settings",
] as const;

export type ProjectSecondaryTab = (typeof PROJECT_SECONDARY_TABS)[number];

export function parseProjectSecondaryTab(
  value: string | null,
): ProjectSecondaryTab | null {
  if (!value) return null;
  return PROJECT_SECONDARY_TABS.includes(value as ProjectSecondaryTab)
    ? (value as ProjectSecondaryTab)
    : null;
}

/** Marker string embedded in the focused layout for deploy verification. */
export const PROJECT_FOCUSED_LAYOUT_MARKER = "project-focused-layout-v1";
