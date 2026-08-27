import { cn } from "@/lib/cn";

export type PreparednessBrief = {
  headline: string;
  meaning: string;
  prepare: string[];
  urgency?: "today" | "this_week" | "monitor" | string;
  category?: string;
};

const URGENCY_LABEL: Record<string, string> = {
  today: "Act today",
  this_week: "Prepare this week",
  monitor: "Keep monitoring",
};

const CATEGORY_LABEL: Record<string, string> = {
  weather: "Weather",
  methane: "Methane / emissions",
  pest: "Pest & disease",
  satellite: "Satellite / radar",
  canopy: "Canopy health",
  compliance: "Compliance",
  general: "General",
};

export function getAlertInterpretation(
  payload?: Record<string, unknown> | null,
): PreparednessBrief | null {
  if (!payload?.interpretation || typeof payload.interpretation !== "object") {
    return null;
  }
  const i = payload.interpretation as PreparednessBrief;
  if (!i.headline || !i.meaning) return null;
  return {
    headline: i.headline,
    meaning: i.meaning,
    prepare: Array.isArray(i.prepare) ? i.prepare : [],
    urgency: i.urgency,
    category: i.category,
  };
}

export function urgencyLabel(urgency?: string) {
  return URGENCY_LABEL[urgency ?? "monitor"] ?? "Keep monitoring";
}

export function categoryLabel(category?: string) {
  return CATEGORY_LABEL[category ?? "general"] ?? "Alert";
}

export function AlertPreparednessBlock({
  brief,
  className,
  compact = false,
}: {
  brief: PreparednessBrief;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-stone-200 bg-stone-50/80 p-3 dark:border-stone-700 dark:bg-stone-900/40",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-forest-100 px-2 py-0.5 font-medium text-forest-900 dark:bg-forest-950 dark:text-forest-100">
          {categoryLabel(brief.category)}
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {urgencyLabel(brief.urgency)}
        </span>
      </div>
      {!compact ? (
        <p className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-50">{brief.headline}</p>
      ) : null}
      <p className={cn("text-sm leading-relaxed text-stone-700 dark:text-stone-300", !compact && "mt-1")}>
        {brief.meaning}
      </p>
      {brief.prepare.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">How to prepare</p>
          <ul className="mt-1.5 space-y-1 text-sm text-stone-700 dark:text-stone-300">
            {brief.prepare.map((step) => (
              <li key={step} className="flex gap-2">
                <span className="text-forest-600" aria-hidden>
                  •
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
