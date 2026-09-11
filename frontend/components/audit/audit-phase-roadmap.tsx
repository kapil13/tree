"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

const PHASE_ORDER = [
  "intake_complete",
  "analysis_ready",
  "confidence_mapped",
  "risk_assessed",
  "sampling_planned",
  "field_verified",
  "export_ready",
  "under_review",
  "attested",
] as const;

const STEP_IDS = [
  "satellite",
  "confidence",
  "risk",
  "sampling",
  "field",
  "export",
  "attestation",
] as const;

const STEP_UNLOCK_STATUS: Record<(typeof STEP_IDS)[number], string> = {
  satellite: "intake_complete",
  confidence: "analysis_ready",
  risk: "confidence_mapped",
  sampling: "risk_assessed",
  field: "sampling_planned",
  export: "field_verified",
  attestation: "export_ready",
};

function statusIndex(status: string): number {
  const idx = PHASE_ORDER.indexOf(status as (typeof PHASE_ORDER)[number]);
  return idx >= 0 ? idx : 0;
}

export function AuditPhaseRoadmap({ status }: { status: string }) {
  const t = useTranslations("auditRoadmap");
  const currentIdx = statusIndex(status);

  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-900/40">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t("title")}</h2>
      <p className="mt-1 text-xs text-stone-500">{t("subtitle")}</p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEP_IDS.map((stepId) => {
          const unlockIdx = statusIndex(STEP_UNLOCK_STATUS[stepId]);
          const done = currentIdx > unlockIdx || status === "attested";
          const active = currentIdx === unlockIdx && status !== "attested";
          const locked = currentIdx < unlockIdx;

          return (
            <li
              key={stepId}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                done && "border-emerald-200 bg-emerald-50/80 text-emerald-900",
                active && "border-forest-300 bg-white ring-1 ring-forest-200 dark:bg-stone-950",
                locked && "border-stone-200 bg-white/60 text-stone-500 dark:bg-stone-950/40",
              )}
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : active ? (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" aria-hidden />
              ) : (
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
              )}
              <div>
                <p className="font-medium">{t(`steps.${stepId}.title`)}</p>
                <p className="mt-0.5 text-stone-500">{t(`steps.${stepId}.action`)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
