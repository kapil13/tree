/** Shared types and helpers for homepage marketing intelligence sections. */

export type ReportCategoryId = "carbon" | "biodiversity" | "disclosure" | "compliance" | "all";

export type MarketingReportItem = {
  category: ReportCategoryId;
  tag: string;
  title: string;
  description: string;
  formats: string;
  status?: "live" | "beta";
  featured?: boolean;
  signed?: boolean;
  evidence_hint?: string;
  action?: "generate" | "download" | "view";
  href?: string;
  accent?: string;
};

export type ReportCategory = {
  id: ReportCategoryId;
  label: string;
};

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: "all", label: "All exports" },
  { id: "carbon", label: "Carbon & GHG" },
  { id: "biodiversity", label: "Biodiversity & Nature" },
  { id: "disclosure", label: "Climate / ESG / Disclosure" },
  { id: "compliance", label: "Compliance / Inventory" },
];

export function normalizeReportItems(content: Record<string, unknown>): MarketingReportItem[] {
  const rawItems = content.items;
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    return rawItems.map((item) => {
      const row = item as Record<string, string | boolean>;
      return {
        category: (row.category as ReportCategoryId) || "compliance",
        tag: String(row.tag || "EXPORT"),
        title: String(row.title || ""),
        description: String(row.description || ""),
        formats: String(row.formats || "PDF · XLSX"),
        status: row.status === "beta" ? "beta" : "live",
        featured: Boolean(row.featured),
        signed: Boolean(row.signed),
        evidence_hint: row.evidence_hint ? String(row.evidence_hint) : undefined,
        action: (row.action as MarketingReportItem["action"]) || "generate",
        href: row.href ? String(row.href) : "/auth?mode=signin&next=/reports",
        accent: row.accent ? String(row.accent) : undefined,
      };
    });
  }

  const groups = content.groups;
  if (!Array.isArray(groups)) return [];

  const themeToCategory: Record<string, ReportCategoryId> = {
    bio: "biodiversity",
    ghg: "carbon",
  };

  return groups.flatMap((group) => {
    const g = group as Record<string, unknown>;
    const category = themeToCategory[String(g.theme || "")] ?? "compliance";
    const items = Array.isArray(g.items) ? g.items : [];
    return items.map((item) => {
      const row = item as Record<string, string>;
      return {
        category,
        tag: String(row.tag || "EXPORT"),
        title: String(row.title || ""),
        description: String(row.description || ""),
        formats: String(row.formats || "PDF · XLSX"),
        status: "live" as const,
        featured: false,
        signed: false,
        action: "generate" as const,
        href: "/auth?mode=signin&next=/reports",
        accent: row.accent,
      };
    });
  });
}

/** Demo-only species rows for the public homepage preview. Not live detections. */
export const BIODIVERSITY_DEMO_SPECIES = [
  { name: "Indian Peafowl", scientific: "Pavo cristatus", confidence: 94.2, status: "verified" as const },
  { name: "Common Myna", scientific: "Acridotheres tristis", confidence: 91.7, status: "verified" as const },
  { name: "Asian Koel", scientific: "Eudynamys scolopaceus", confidence: 87.4, status: "review" as const },
];

/** Demo-only GHG dashboard values for the public homepage preview. */
export const GHG_DEMO_DASHBOARD = {
  projectLabel: "Sample plantation corridor",
  monitoringPeriod: "Last 90 days",
  areaHa: 124.6,
  dataStatus: "Demo interface",
  totalTco2e: 1840,
  deltaPct: 2.4,
  intensityTco2ePerHa: 14.8,
  sources: [
    { label: "Biomass loss", pct: 28, tco2e: 515 },
    { label: "Agriculture", pct: 22, tco2e: 405 },
    { label: "Livestock", pct: 18, tco2e: 331 },
    { label: "Energy / transport", pct: 16, tco2e: 294 },
    { label: "Fire / degradation", pct: 10, tco2e: 184 },
    { label: "Other", pct: 6, tco2e: 111 },
  ],
  trend: [
    { period: "Jan", value: 1620 },
    { period: "Feb", value: 1710 },
    { period: "Mar", value: 1780 },
    { period: "Apr", value: 1840 },
  ],
  removalsTco2e: 420,
  netBalanceTco2e: 1420,
};
