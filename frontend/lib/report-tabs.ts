/** Canonical report export tab ids (URL ?tab= values). */
export const REPORT_TAB_IDS = [
  "standard",
  "brsr",
  "iso14064",
  "tnfd",
  "ghg",
  "darwin",
  "goldStandard",
  "reddPlus",
  "parisNdc",
  "greenCredit",
  "etfHandoff",
  "sbtiFlag",
  "gbf",
  "iso14064Org",
] as const;

export type ReportTab = (typeof REPORT_TAB_IDS)[number];

export const STANDARD_REPORT_TABS = [
  "standard",
  "brsr",
  "iso14064",
  "tnfd",
  "ghg",
  "darwin",
] as const satisfies readonly ReportTab[];

export const FRAMEWORK_REPORT_TABS = [
  "goldStandard",
  "reddPlus",
  "parisNdc",
  "greenCredit",
  "etfHandoff",
  "sbtiFlag",
  "gbf",
  "iso14064Org",
] as const satisfies readonly ReportTab[];

export function parseReportTab(value: string | null): ReportTab | null {
  if (!value) return null;
  return REPORT_TAB_IDS.includes(value as ReportTab) ? (value as ReportTab) : null;
}

export function reportTabHref(tab: ReportTab): string {
  return tab === "standard" ? "/reports" : `/reports?tab=${tab}`;
}
