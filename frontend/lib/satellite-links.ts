/** Deep links into the satellite monitoring workspace. */

export function satelliteHref(options?: {
  fenceId?: string | null;
  projectId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options?.fenceId) params.set("fence", options.fenceId);
  if (options?.projectId) params.set("project", options.projectId);
  const qs = params.toString();
  return qs ? `/satellite?${qs}` : "/satellite";
}

export function parseSatelliteSearchParams(searchParams: URLSearchParams): {
  fenceId: string | null;
  projectId: string | null;
} {
  const fenceId =
    searchParams.get("fence") ??
    searchParams.get("fence_id") ??
    searchParams.get("work_area_id");
  const projectId = searchParams.get("project") ?? searchParams.get("project_id");
  return { fenceId, projectId };
}
