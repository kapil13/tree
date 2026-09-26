"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  resolveComplianceGapAction,
  type GapContext,
  type ProjectTab,
} from "@/lib/compliance-gap-actions";

type ComplianceGap = {
  item_id: string;
  question: string;
  answer: string;
  category: string;
  auto_key?: string | null;
};

export function ComplianceGapList({
  gaps,
  projectId,
  gapContext,
  onNavigateTab,
  onScrollToAnchor,
}: {
  gaps: ComplianceGap[];
  projectId: string;
  gapContext?: Partial<GapContext>;
  onNavigateTab?: (tab: ProjectTab) => void;
  onScrollToAnchor?: (anchor: string) => void;
}) {
  if (!gaps.length) return null;

  const ctx: GapContext = {
    projectId,
    primaryWorkAreaId: gapContext?.primaryWorkAreaId,
    satelliteWatchEnabled: gapContext?.satelliteWatchEnabled,
  };

  function handleAction(action: ReturnType<typeof resolveComplianceGapAction>) {
    if (action.tab && onNavigateTab) {
      onNavigateTab(action.tab);
    }
    if (action.anchor && onScrollToAnchor) {
      window.setTimeout(() => onScrollToAnchor(action.anchor!), 150);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
      <p className="text-sm font-medium text-amber-900">Gaps to address</p>
      <ul className="mt-3 space-y-3">
        {gaps.map((gap) => {
          const action = resolveComplianceGapAction(gap, ctx);
          return (
            <li
              key={gap.item_id}
              className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-white/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-xs text-amber-900">
                <span className="font-semibold capitalize">{gap.answer}</span>
                <span className="text-amber-700"> · {gap.category}</span>
                <p className="mt-0.5 text-stone-700">{gap.question}</p>
              </div>
              {action.href ? (
                <Link href={action.href} className="btn-secondary shrink-0 text-xs">
                  {action.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-secondary shrink-0 text-xs"
                  onClick={() => handleAction(action)}
                >
                  {action.label}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
