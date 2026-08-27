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

export function fieldOperationalStatus(input: {
  openViolations: number;
  survivalDue: number;
  queueCount: number;
  geotagDue: number;
  unassigned: boolean;
}): { tone: OperationalTone; label: string; summary: string } {
  const { openViolations, survivalDue, queueCount, geotagDue, unassigned } = input;

  if (unassigned) {
    return {
      tone: "neutral",
      label: "Awaiting project assignment",
      summary: "No packages assigned yet. Ask your supervisor to add you on a project Team tab.",
    };
  }
  if (openViolations > 0) {
    return {
      tone: "critical",
      label: "Compliance items open",
      summary: `${openViolations} violation${openViolations === 1 ? "" : "s"} need resolution before the next audit window.`,
    };
  }
  if (survivalDue > 0 || geotagDue > 0) {
    const parts: string[] = [];
    if (survivalDue > 0) parts.push(`${survivalDue} survival check${survivalDue === 1 ? "" : "s"} due`);
    if (geotagDue > 0) parts.push(`${geotagDue} geotag refresh${geotagDue === 1 ? "" : "es"} needed`);
    return {
      tone: "attention",
      label: "Field surveys due",
      summary: parts.join(" · "),
    };
  }
  if (queueCount > 0) {
    return {
      tone: "watch",
      label: "Queue has follow-ups",
      summary: `${queueCount} item${queueCount === 1 ? "" : "s"} in your attention queue. Review before end of day.`,
    };
  }
  return {
    tone: "healthy",
    label: "Field queue clear",
    summary: "No survival checks, geotag updates, or open violations in your assigned packages.",
  };
}

export function citizenOperationalStatus(input: {
  treeCount: number;
  pctHealthy: number;
  stepsDone: number;
  stepsTotal: number;
}): { tone: OperationalTone; label: string; summary: string } {
  const { treeCount, pctHealthy, stepsDone, stepsTotal } = input;

  if (treeCount === 0) {
    return {
      tone: "neutral",
      label: "Start your grove",
      summary: "Tag your first tree to unlock carbon estimates, health tracking, and your personal map.",
    };
  }
  if (stepsDone < stepsTotal) {
    return {
      tone: "watch",
      label: "Onboarding in progress",
      summary: `${stepsDone} of ${stepsTotal} getting-started steps complete. Finish setup to unlock full insights.`,
    };
  }
  if (pctHealthy < 60 && treeCount > 0) {
    return {
      tone: "attention",
      label: "Canopy needs care",
      summary: `${Math.round(pctHealthy)}% of your trees are healthy. Run AI scans or field checks on stressed trees.`,
    };
  }
  return {
    tone: "healthy",
    label: "Grove is thriving",
    summary: `${treeCount} tree${treeCount === 1 ? "" : "s"} tagged · ${Math.round(pctHealthy)}% healthy canopy.`,
  };
}

export function alertsOperationalStatus(input: {
  unreadCount: number;
  criticalCount: number;
  highCount: number;
  totalCount: number;
}): { tone: OperationalTone; label: string; summary: string } {
  const { unreadCount, criticalCount, highCount, totalCount } = input;

  if (totalCount === 0) {
    return {
      tone: "healthy",
      label: "Inbox clear",
      summary: "No satellite, compliance, or field alerts match this filter.",
    };
  }
  if (criticalCount > 0) {
    return {
      tone: "critical",
      label: "Critical signals require review",
      summary: `${criticalCount} critical alert${criticalCount === 1 ? "" : "s"} · ${unreadCount} unread in inbox.`,
    };
  }
  if (highCount > 0 || unreadCount > 0) {
    return {
      tone: "attention",
      label: "Unread signals in inbox",
      summary: [
        unreadCount > 0 ? `${unreadCount} unread` : null,
        highCount > 0 ? `${highCount} high priority` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }
  return {
    tone: "healthy",
    label: "All signals reviewed",
    summary: `${totalCount} alert${totalCount === 1 ? "" : "s"} in inbox — none unread.`,
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
