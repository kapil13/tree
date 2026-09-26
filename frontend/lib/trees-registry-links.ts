export type TreesRegistryCategory =
  | "attention"
  | "missing_evidence"
  | "geotag_due"
  | "unverified"
  | "healthy";

export function treesRegistryHref(opts?: {
  projectId?: string | null;
  workAreaId?: string | null;
  category?: TreesRegistryCategory | "";
}): string {
  const params = new URLSearchParams();
  if (opts?.projectId) params.set("project", opts.projectId);
  if (opts?.workAreaId) params.set("work_area", opts.workAreaId);
  if (opts?.category) params.set("category", opts.category);
  const query = params.toString();
  return query ? `/trees?${query}` : "/trees";
}

/** Deep link to survival / geotag work — first due tree when known, else filtered registry. */
export function survivalDueTreesHref(
  projectId: string,
  firstTreeId?: string | null,
): string {
  if (firstTreeId) return `/trees/${firstTreeId}#survival`;
  return treesRegistryHref({ projectId, category: "geotag_due" });
}

export function parseTreesRegistryCategory(
  value: string | null,
): TreesRegistryCategory | "" {
  if (!value) return "";
  const allowed: TreesRegistryCategory[] = [
    "attention",
    "missing_evidence",
    "geotag_due",
    "unverified",
    "healthy",
  ];
  return allowed.includes(value as TreesRegistryCategory)
    ? (value as TreesRegistryCategory)
    : "";
}
