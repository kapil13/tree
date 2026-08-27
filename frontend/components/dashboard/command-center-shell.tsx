"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { OperationalTone } from "@/components/ui/intelligence/operational-status";

export function portfolioOperationalStatus(input: {
  openViolations: number;
  criticalAlerts: number;
  unreadAlerts: number;
  sitesNeedingScan: number;
  survivalDue: number;
}): { tone: OperationalTone; label: string; summary: string } {
  const { openViolations, criticalAlerts, unreadAlerts, sitesNeedingScan, survivalDue } = input;

  if (openViolations > 0 || criticalAlerts > 0) {
    const parts: string[] = [];
    if (openViolations > 0) parts.push(`${openViolations} compliance issue${openViolations === 1 ? "" : "s"}`);
    if (criticalAlerts > 0) parts.push(`${criticalAlerts} critical alert${criticalAlerts === 1 ? "" : "s"}`);
    return {
      tone: "critical",
      label: "Immediate attention required",
      summary: `${parts.join(" · ")}. Resolve before audit exports and reporting cycles.`,
    };
  }
  if (unreadAlerts > 0 || sitesNeedingScan > 0) {
    return {
      tone: "attention",
      label: "Monitoring follow-up needed",
      summary: [
        unreadAlerts > 0 ? `${unreadAlerts} unread alert${unreadAlerts === 1 ? "" : "s"}` : null,
        sitesNeedingScan > 0 ? `${sitesNeedingScan} site${sitesNeedingScan === 1 ? "" : "s"} need satellite refresh` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }
  if (survivalDue > 0) {
    return {
      tone: "watch",
      label: "Field surveys due",
      summary: `${survivalDue} tree${survivalDue === 1 ? "" : "s"} need survival re-check. Schedule field verification this week.`,
    };
  }
  return {
    tone: "healthy",
    label: "Portfolio operational",
    summary: "No open compliance violations or critical alerts. Continue monitoring and registration.",
  };
}

export function CommandCenterEvidence({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("intel-evidence-group", className)} open={defaultOpen}>
      <summary className="intel-evidence-summary">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{description}</p>
          ) : null}
        </div>
        <ChevronDown className="intel-evidence-chevron h-5 w-5 shrink-0 text-stone-400" aria-hidden />
      </summary>
      <div className="intel-evidence-body space-y-4">{children}</div>
    </details>
  );
}
