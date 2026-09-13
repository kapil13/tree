export function mapHref(opts?: { projectId?: string | null }): string {
  if (opts?.projectId) return `/map?project=${opts.projectId}`;
  return "/map";
}
