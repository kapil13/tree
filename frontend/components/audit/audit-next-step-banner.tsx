"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import type { AuditPhase } from "@/lib/audit-workspace";
import { defaultAuditPhase } from "@/lib/audit-workspace";

export function AuditNextStepBanner({
  engagementStatus,
  activePhase,
  onSelectPhase,
}: {
  engagementStatus: string;
  activePhase: AuditPhase;
  onSelectPhase: (phase: AuditPhase) => void;
}) {
  const t = useTranslations("auditWorkspace");
  const nextPhase = defaultAuditPhase(engagementStatus);

  if (activePhase === nextPhase || engagementStatus === "attested") {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-forest-200 bg-forest-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-forest-900 dark:bg-forest-950/30"
      role="status"
    >
      <div>
        <p className="text-sm font-semibold text-forest-900 dark:text-forest-100">{t("nextStep.title")}</p>
        <p className="mt-0.5 text-sm text-forest-800/80 dark:text-forest-200/80">
          {t("nextStep.desc", { phase: t(`phase.${nextPhase}`) })}
        </p>
      </div>
      <button
        type="button"
        className="btn-primary inline-flex shrink-0 items-center gap-2 text-sm"
        onClick={() => onSelectPhase(nextPhase)}
      >
        {t("nextStep.action", { phase: t(`phaseShort.${nextPhase}`) })}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
