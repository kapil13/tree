"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { OperationalTone } from "@/components/ui/intelligence/operational-status";

export type StatusTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;
export function portfolioOperationalStatus(
  t: StatusTranslator,
  input: {
    openViolations: number;
    criticalAlerts: number;
    unreadAlerts: number;
    sitesNeedingScan: number;
    survivalDue: number;
  },
): { tone: OperationalTone; label: string; summary: string } {
  const { openViolations, criticalAlerts, unreadAlerts, sitesNeedingScan, survivalDue } = input;

  if (openViolations > 0 || criticalAlerts > 0) {
    const parts: string[] = [];
    if (openViolations > 0) {
      parts.push(t("complianceIssues", { count: openViolations }));
    }
    if (criticalAlerts > 0) {
      parts.push(t("criticalAlerts", { count: criticalAlerts }));
    }
    return {
      tone: "critical",
      label: t("portfolioCriticalLabel"),
      summary: t("portfolioCriticalSummary", { issues: parts.join(" · ") }),
    };
  }
  if (unreadAlerts > 0 || sitesNeedingScan > 0) {
    return {
      tone: "attention",
      label: t("portfolioAttentionLabel"),
      summary: t("portfolioAttentionSummary", {
        details: [
          unreadAlerts > 0 ? t("unreadAlerts", { count: unreadAlerts }) : null,
          sitesNeedingScan > 0 ? t("sitesNeedScan", { count: sitesNeedingScan }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }),
    };
  }
  if (survivalDue > 0) {
    return {
      tone: "watch",
      label: t("portfolioWatchLabel"),
      summary: t("portfolioWatchSummary", { count: survivalDue }),
    };
  }
  return {
    tone: "healthy",
    label: t("portfolioHealthyLabel"),
    summary: t("portfolioHealthySummary"),
  };
}

export function fieldOperationalStatus(
  t: StatusTranslator,
  input: {
    openViolations: number;
    survivalDue: number;
    queueCount: number;
    geotagDue: number;
    unassigned: boolean;
  },
): { tone: OperationalTone; label: string; summary: string } {
  const { openViolations, survivalDue, queueCount, geotagDue, unassigned } = input;

  if (unassigned) {
    return {
      tone: "neutral",
      label: t("fieldNeutralLabel"),
      summary: t("fieldNeutralSummary"),
    };
  }
  if (openViolations > 0) {
    return {
      tone: "critical",
      label: t("fieldCriticalLabel"),
      summary: t("fieldCriticalSummary", { count: openViolations }),
    };
  }
  if (survivalDue > 0 || geotagDue > 0) {
    const parts: string[] = [];
    if (survivalDue > 0) parts.push(t("survivalChecks", { count: survivalDue }));
    if (geotagDue > 0) parts.push(t("geotagRefresh", { count: geotagDue }));
    return {
      tone: "attention",
      label: t("fieldAttentionLabel"),
      summary: t("fieldAttentionSummary", { details: parts.join(" · ") }),
    };
  }
  if (queueCount > 0) {
    return {
      tone: "watch",
      label: t("fieldWatchLabel"),
      summary: t("fieldWatchSummary", { count: queueCount }),
    };
  }
  return {
    tone: "healthy",
    label: t("fieldHealthyLabel"),
    summary: t("fieldHealthySummary"),
  };
}

export function citizenOperationalStatus(
  t: StatusTranslator,
  input: {
    treeCount: number;
    pctHealthy: number;
    stepsDone: number;
    stepsTotal: number;
  },
): { tone: OperationalTone; label: string; summary: string } {
  const { treeCount, pctHealthy, stepsDone, stepsTotal } = input;

  if (treeCount === 0) {
    return {
      tone: "neutral",
      label: t("citizenNeutralLabel"),
      summary: t("citizenNeutralSummary"),
    };
  }
  if (stepsDone < stepsTotal) {
    return {
      tone: "watch",
      label: t("citizenWatchLabel"),
      summary: t("citizenWatchSummary", { done: stepsDone, total: stepsTotal }),
    };
  }
  if (pctHealthy < 60 && treeCount > 0) {
    return {
      tone: "attention",
      label: t("citizenAttentionLabel"),
      summary: t("citizenAttentionSummary", { pct: Math.round(pctHealthy) }),
    };
  }
  return {
    tone: "healthy",
    label: t("citizenHealthyLabel"),
    summary: t("citizenHealthySummary", {
      count: treeCount,
      pct: Math.round(pctHealthy),
    }),
  };
}

export function alertsOperationalStatus(
  t: StatusTranslator,
  input: {
    unreadCount: number;
    criticalCount: number;
    highCount: number;
    totalCount: number;
  },
): { tone: OperationalTone; label: string; summary: string } {
  const { unreadCount, criticalCount, highCount, totalCount } = input;

  if (totalCount === 0) {
    return {
      tone: "healthy",
      label: t("alertsHealthyLabel"),
      summary: t("alertsHealthySummary"),
    };
  }
  if (criticalCount > 0) {
    return {
      tone: "critical",
      label: t("alertsCriticalLabel"),
      summary: t("alertsCriticalSummary", { critical: criticalCount, unread: unreadCount }),
    };
  }
  if (highCount > 0 || unreadCount > 0) {
    return {
      tone: "attention",
      label: t("alertsAttentionLabel"),
      summary: t("alertsAttentionSummary", {
        details: [
          unreadCount > 0 ? t("unread", { count: unreadCount }) : null,
          highCount > 0 ? t("highPriority", { count: highCount }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }),
    };
  }
  return {
    tone: "healthy",
    label: t("alertsReviewedLabel"),
    summary: t("alertsReviewedSummary", { count: totalCount }),
  };
}

export function bioacousticOperationalStatus(
  t: StatusTranslator,
  input: {
    totalRecordings: number;
    analyzedRecordings: number;
    threatenedSpecies: number;
    avgHealthScore: number;
  },
): { tone: OperationalTone; label: string; summary: string } {
  const { totalRecordings, analyzedRecordings, threatenedSpecies, avgHealthScore } = input;

  if (totalRecordings === 0) {
    return {
      tone: "neutral",
      label: t("bioNeutralLabel"),
      summary: t("bioNeutralSummary"),
    };
  }
  if (analyzedRecordings < totalRecordings) {
    return {
      tone: "watch",
      label: t("bioWatchLabel"),
      summary: t("bioWatchSummary", { analyzed: analyzedRecordings, total: totalRecordings }),
    };
  }
  if (threatenedSpecies > 0) {
    return {
      tone: "attention",
      label: t("bioAttentionLabel"),
      summary: t("bioAttentionSummary", {
        count: threatenedSpecies,
        score: Math.round(avgHealthScore),
      }),
    };
  }
  return {
    tone: "healthy",
    label: t("bioHealthyLabel"),
    summary: t("bioHealthySummary", {
      count: totalRecordings,
      score: Math.round(avgHealthScore),
    }),
  };
}

export function satelliteOperationalStatus(
  t: StatusTranslator,
  input: {
    fenceCount: number;
    siteSelected: boolean;
    ndviValue: number | null | undefined;
    verifiedTrees: number;
    staleSites: number;
  },
): { tone: OperationalTone; label: string; summary: string } {
  const { fenceCount, siteSelected, ndviValue, verifiedTrees, staleSites } = input;

  if (fenceCount === 0) {
    return {
      tone: "neutral",
      label: t("satNeutralLabel"),
      summary: t("satNeutralSummary"),
    };
  }
  if (!siteSelected) {
    return {
      tone: "watch",
      label: t("satWatchSelectLabel"),
      summary: t("satWatchSelectSummary", { count: fenceCount }),
    };
  }
  if (ndviValue == null) {
    return {
      tone: "attention",
      label: t("satAttentionLabel"),
      summary: t("satAttentionSummary"),
    };
  }
  if (staleSites > 0) {
    return {
      tone: "watch",
      label: t("satWatchStaleLabel"),
      summary: t("satWatchStaleSummary", {
        ndvi: ndviValue.toFixed(2),
        stale: staleSites,
        verified: verifiedTrees,
      }),
    };
  }
  return {
    tone: "healthy",
    label: t("satHealthyLabel"),
    summary: t("satHealthySummary", {
      ndvi: ndviValue.toFixed(2),
      verified: verifiedTrees,
    }),
  };
}

export function reportsOperationalStatus(
  t: StatusTranslator,
  input: {
    totalReports: number;
    pendingCount: number;
    failedCount: number;
    canGenerate: boolean;
  },
): { tone: OperationalTone; label: string; summary: string } {
  const { totalReports, pendingCount, failedCount, canGenerate } = input;

  if (!canGenerate) {
    return {
      tone: "neutral",
      label: t("reportsNeutralLabel"),
      summary: t("reportsNeutralSummary", { count: totalReports }),
    };
  }
  if (failedCount > 0) {
    return {
      tone: "critical",
      label: t("reportsCriticalLabel"),
      summary: t("reportsCriticalSummary", { failed: failedCount, pending: pendingCount }),
    };
  }
  if (pendingCount > 0) {
    return {
      tone: "watch",
      label: t("reportsWatchLabel"),
      summary: t("reportsWatchSummary", { pending: pendingCount, total: totalReports }),
    };
  }
  return {
    tone: "healthy",
    label: t("reportsHealthyLabel"),
    summary: t("reportsHealthySummary", { count: totalReports }),
  };
}

// projectsOperationalStatus uses the projects.* translation namespace
export function projectsOperationalStatus(
  t: StatusTranslator,
  violations: number,
  count: number,
): { tone: OperationalTone; label: string; summary: string } {
  if (count === 0) {
    return {
      tone: "neutral",
      label: t("opsNoProjects"),
      summary: t("opsNoProjectsSummary"),
    };
  }
  if (violations > 0) {
    return {
      tone: violations >= 5 ? "critical" : "attention",
      label: t("opsViolationsLabel", { count: violations }),
      summary: t("opsViolationsSummary"),
    };
  }
  return {
    tone: "healthy",
    label: t("opsHealthyLabel"),
    summary: t("opsHealthySummary", { count }),
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