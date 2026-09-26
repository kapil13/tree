import { cn } from "@/lib/cn";

export type MetricItem = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "critical";
};

const TONE_VALUE: Record<NonNullable<MetricItem["tone"]>, string> = {
  default: "text-stone-900 dark:text-stone-50",
  positive: "text-forest-800 dark:text-forest-200",
  warning: "text-amber-900 dark:text-amber-200",
  critical: "text-rose-900 dark:text-rose-200",
};

export function MetricGrid({
  metrics,
  columns = 4,
  className,
}: {
  metrics: MetricItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : columns === 5
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          : columns === 6
            ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <dl className={cn("intel-metric-grid", colClass, className)}>
      {metrics.map((m) => (
        <div key={m.label} className="intel-metric">
          <dt className="intel-metric-label">{m.label}</dt>
          <dd className={cn("intel-metric-value", TONE_VALUE[m.tone ?? "default"])}>{m.value}</dd>
          {m.hint ? <dd className="intel-metric-hint">{m.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
