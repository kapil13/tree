export function alertsHref(opts?: { sar?: string; kind?: string }): string {
  if (opts?.sar) return `/alerts?sar=${encodeURIComponent(opts.sar)}`;
  if (opts?.kind) return `/alerts?kind=${encodeURIComponent(opts.kind)}`;
  return "/alerts";
}

/** Deep-link to alerts inbox filtered by alert kind (SAR kinds use the sar param). */
export function portfolioAlertKindHref(kind: string): string {
  if (kind.startsWith("sar_")) return alertsHref({ sar: kind });
  return alertsHref({ kind });
}
