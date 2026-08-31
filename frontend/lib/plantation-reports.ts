import type { PlantingProject } from "@/lib/api";

export function projectFinancialYear(project: PlantingProject): string {
  const location = project.metadata?.location;
  if (location && typeof location === "object" && "financial_year" in location) {
    const fy = (location as { financial_year?: unknown }).financial_year;
    if (typeof fy === "string" && fy.trim()) return fy.trim();
  }
  return "Unassigned";
}

export function projectLocationLabel(project: PlantingProject): string {
  const location = project.metadata?.location;
  if (!location || typeof location !== "object") return "—";
  const loc = location as Record<string, unknown>;
  const parts = [loc.state_name, loc.district_name, loc.village_name].filter(
    (p) => typeof p === "string" && p.trim(),
  ) as string[];
  return parts.length ? parts.join(" · ") : "—";
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => escape(String(cell ?? ""))).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
