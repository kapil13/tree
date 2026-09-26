import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type OperationalTone = "healthy" | "watch" | "attention" | "critical" | "neutral";

const TONE_CLASS: Record<OperationalTone, string> = {
  healthy: "intel-status intel-status-healthy",
  watch: "intel-status intel-status-watch",
  attention: "intel-status intel-status-attention",
  critical: "intel-status intel-status-critical",
  neutral: "intel-status intel-status-neutral",
};

export function OperationalStatusBar({
  tone,
  label,
  summary,
  icon: Icon,
  action,
  className,
}: {
  tone: OperationalTone;
  label: string;
  summary: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(TONE_CLASS[tone], className)} role="status">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon ? (
          <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-90" aria-hidden />
        ) : (
          <span className="intel-status-dot mt-1.5 shrink-0" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="intel-status-label">{label}</p>
          <p className="intel-status-summary">{summary}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
