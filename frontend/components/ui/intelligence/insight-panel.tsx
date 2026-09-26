import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function InsightPanel({
  title,
  interpretation,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  interpretation: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("intel-panel", className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="intel-panel-icon">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="intel-panel-title">{title}</h2>
          <p className="intel-panel-interpretation">{interpretation}</p>
          {children ? <div className="mt-4 space-y-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
