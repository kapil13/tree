"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type EmissionsPipelineStep = {
  id: "register" | "model" | "scan" | "fuse";
  label: string;
  detail: string;
  done: boolean;
  active: boolean;
  disabled?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  busy?: boolean;
};

export function EmissionsGuidedPipeline({ steps }: { steps: EmissionsPipelineStep[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={cn(
            "rounded-xl border px-3 py-3 text-sm",
            step.done
              ? "border-emerald-200 bg-emerald-50/70"
              : step.active
                ? "border-forest-300 bg-forest-50/50"
                : "border-stone-200 bg-white",
          )}
        >
          <div className="flex items-start gap-2">
            {step.busy ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-forest-700" aria-hidden />
            ) : step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-stone-900">
                {index + 1}. {step.label}
              </p>
              <p className="mt-0.5 text-xs text-stone-600">{step.detail}</p>
              {step.onAction && !step.done ? (
                <button
                  type="button"
                  className="btn-secondary mt-2 text-xs"
                  disabled={step.disabled || step.busy}
                  onClick={step.onAction}
                >
                  {step.busy ? "Working…" : step.actionLabel ?? "Run"}
                </button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
