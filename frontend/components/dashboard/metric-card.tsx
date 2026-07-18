import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type MetricCardProps = {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: { label: string; positive?: boolean };
  accent?: "green" | "lime" | "sky" | "amber" | "violet";
  className?: string;
};

const ACCENT_CLASS = {
  green: "dash-metric--green",
  lime: "dash-metric--lime",
  sky: "dash-metric--sky",
  amber: "dash-metric--amber",
  violet: "dash-metric--violet",
};

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  accent = "green",
  className,
}: MetricCardProps) {
  return (
    <article className={cn("dash-metric", ACCENT_CLASS[accent], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="dash-metric-icon">
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span
            className={cn(
              "dash-metric-trend",
              trend.positive === true && "dash-metric-trend--up",
              trend.positive === false && "dash-metric-trend--down",
            )}
          >
            {trend.label}
          </span>
        )}
      </div>
      <p className="dash-metric-label">{label}</p>
      <p className="dash-metric-value">{value}</p>
      {sub && <p className="dash-metric-sub">{sub}</p>}
    </article>
  );
}
