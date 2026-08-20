/** Sprint A: focused project page layout (no tab bar; trees on main scroll). */
export function isProjectFocusedUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PROJECT_FOCUSED_UI === "1";
}

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
