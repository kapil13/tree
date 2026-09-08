import type { AppLocale } from "@/i18n/request";

type BriefTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Map known English API brief lines to i18n keys when locale is Hindi. */
export function localizeExecutiveBriefLine(
  line: string | undefined | null,
  locale: AppLocale,
  t: BriefTranslator,
): string {
  if (!line || locale !== "hi") return line ?? "";

  const exact: Record<string, string> = {
    "No trees registered yet — add plantations to begin monitoring.": t("briefNoTrees"),
    "Monitored zones are within expected parameters.": t("briefOperational"),
  };
  if (exact[line]) return exact[line];

  const patterns: Array<{ re: RegExp; key: string; pick?: (m: RegExpMatchArray) => Record<string, string | number> }> = [
    {
      re: /^(\d+) work area(s)? need inspection based on threat signals\.$/,
      key: "briefInspectionZones",
      pick: (m) => ({ count: Number(m[1]) }),
    },
    {
      re: /^(\d+) unread alert(s)? require supervisor attention\.$/,
      key: "briefUnreadAlerts",
      pick: (m) => ({ count: Number(m[1]) }),
    },
    {
      re: /^Portfolio composite risk is (high|critical) — review threat watch\.$/,
      key: "briefHighRisk",
      pick: (m) => ({ risk: m[1] }),
    },
    {
      re: /^(\d+) weather alert(s)? across your work areas in the next 48 hours\.$/,
      key: "briefWeatherAlerts",
      pick: (m) => ({ count: Number(m[1]) }),
    },
    {
      re: /^(\d+) site(s)? flagged for elevated pest risk\.$/,
      key: "briefPestRisk",
      pick: (m) => ({ count: Number(m[1]) }),
    },
  ];

  for (const { re, key, pick } of patterns) {
    const m = line.match(re);
    if (m) return t(key, pick?.(m));
  }

  return line;
}
