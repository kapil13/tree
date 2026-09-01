export function alertsHref(opts?: { sar?: string }): string {
  if (opts?.sar) return `/alerts?sar=${encodeURIComponent(opts.sar)}`;
  return "/alerts";
}
