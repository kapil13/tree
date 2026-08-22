"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { ProjectSetupStatus } from "@/lib/project-setup-readiness";
import { cn } from "@/lib/cn";

export function ProjectSetupChecklist({
  status,
  compact = false,
}: {
  status: ProjectSetupStatus;
  compact?: boolean;
}) {
  const incomplete = status.steps.filter((s) => s.required && !s.complete);

  if (status.setupComplete) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold">Setup complete</p>
        <p className="mt-1 text-emerald-900/90">
          Scheme references, planting standard, and work areas are ready. You can register trees.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3",
        compact && "text-sm",
      )}
    >
      <p className="font-semibold text-amber-950">Finish project setup</p>
      <p className="mt-1 text-xs text-amber-900/90">
        Complete these steps before registering trees
        {status.blockReason ? `: ${status.blockReason}` : "."}
      </p>
      <ul className="mt-3 space-y-2">
        {status.steps
          .filter((s) => s.required)
          .map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-sm">
              {step.complete ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0 flex-1">
                <span className={step.complete ? "text-stone-600 line-through" : "font-medium text-stone-900"}>
                  {step.label}
                </span>
                {!step.complete && step.description && (
                  <p className="text-xs text-stone-600">{step.description}</p>
                )}
                {!step.complete && step.href && (
                  <Link href={step.href} className="text-xs font-medium text-forest-700 hover:underline">
                    Continue in setup wizard →
                  </Link>
                )}
              </div>
            </li>
          ))}
      </ul>
      {incomplete.some((s) => s.id === "work_areas") && (
        <Link
          href={status.steps.find((s) => s.id === "work_areas")?.href ?? "#work-areas"}
          className="mt-3 inline-block text-xs font-medium text-forest-700 hover:underline"
        >
          Draw work areas in setup wizard →
        </Link>
      )}
    </div>
  );
}
