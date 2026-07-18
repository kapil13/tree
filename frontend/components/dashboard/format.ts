export function fmtNum(n: number, suffix = "", digits = 2) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: digits })}${suffix}`;
}

export function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const HEALTH_COLORS: Record<string, string> = {
  healthy: "#16a34a",
  moderate: "#f59e0b",
  unhealthy: "#dc2626",
  unknown: "#78716c",
};

export const CHART_COLORS = ["#16a34a", "#84cc16", "#0ea5e9", "#f59e0b", "#a855f7", "#0f766e", "#dc2626"];

export const SEVERITY_STYLES: Record<string, string> = {
  critical: "dash-severity-critical",
  high: "dash-severity-high",
  medium: "dash-severity-medium",
  low: "dash-severity-low",
  info: "dash-severity-info",
};
