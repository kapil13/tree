export function alertsHref(opts?: { sar?: string; kind?: string; hazard?: string }): string {
  if (opts?.sar) return `/alerts?sar=${encodeURIComponent(opts.sar)}`;
  if (opts?.kind) return `/alerts?kind=${encodeURIComponent(opts.kind)}`;
  if (opts?.hazard) return `/alerts?hazard=${encodeURIComponent(opts.hazard)}`;
  return "/alerts";
}

/** Deep-link to alerts inbox filtered by alert kind (SAR kinds use the sar param). */
export function portfolioAlertKindHref(kind: string): string {
  if (kind.startsWith("sar_")) return alertsHref({ sar: kind });
  return alertsHref({ kind });
}

const EARLY_WARNING_INBOX_KIND: Record<string, string> = {
  fire: "fire_alert",
  flood_extent: "flood_extent_alert",
  flood: "flood_extent_alert",
  locust: "locust_watch",
};

/** Map threat-watch early_warning kind to inbox alert kind filter. */
export function earlyWarningInboxKind(earlyKind: string): string | null {
  return EARLY_WARNING_INBOX_KIND[earlyKind] ?? null;
}

export function satelliteFenceHref(fenceId: string): string {
  return `/satellite?fence=${encodeURIComponent(fenceId)}`;
}
