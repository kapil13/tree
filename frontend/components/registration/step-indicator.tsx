"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type WizardStep = {
  id: string;
  label: string;
};

type StepIndicatorProps = {
  steps: WizardStep[];
  currentIndex: number;
};

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent md:block dark:via-stone-700" />
      <ol className="grid grid-cols-2 gap-3 md:flex md:items-start md:justify-between">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step.id}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl border px-3 py-2 transition-all md:flex-1 md:flex-col md:items-center md:px-2 md:py-3 md:text-center",
                active
                  ? "border-forest-300 bg-white shadow-md shadow-forest-500/10 dark:border-forest-700 dark:bg-stone-900"
                  : done
                    ? "border-forest-200/70 bg-forest-50/70 dark:border-forest-900 dark:bg-forest-950/30"
                    : "border-stone-200/70 bg-white/50 dark:border-stone-800 dark:bg-stone-900/40",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  active
                    ? "bg-forest-600 text-white shadow-lg shadow-forest-600/30"
                    : done
                      ? "bg-forest-100 text-forest-700 dark:bg-forest-900 dark:text-forest-300"
                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium leading-tight md:mt-2",
                  active
                    ? "text-stone-900 dark:text-stone-50"
                    : done
                      ? "text-forest-800 dark:text-forest-300"
                      : "text-stone-500",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
