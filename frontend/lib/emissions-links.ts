export function parseEmissionsSearchParams(searchParams: URLSearchParams) {
  return {
    projectId: searchParams.get("project")?.trim() || null,
    workAreaId: searchParams.get("workArea")?.trim() || null,
  };
}

export function emissionsHref(opts?: {
  projectId?: string | null;
  workAreaId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts?.projectId) params.set("project", opts.projectId);
  if (opts?.workAreaId) params.set("workArea", opts.workAreaId);
  const query = params.toString();
  return query ? `/emissions?${query}` : "/emissions";
}

export const DEMO_GHG_PROJECT_CODE = "DEMO-GHG-MINING";
