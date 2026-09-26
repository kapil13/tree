"use client";

import type { InterpretationChain } from "@/lib/api";

export function BiodiversityInterpretationChain({ chain }: { chain: InterpretationChain | undefined }) {
  if (!chain?.chain?.length) {
    return <p className="text-sm text-stone-500">Interpretation chain unavailable.</p>;
  }

  return (
    <ol className="space-y-3">
      {chain.chain.map((step, idx) => (
        <li
          key={step.stage ?? idx}
          className="rounded-lg border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-forest-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-100 text-forest-800">
              {idx + 1}
            </span>
            {step.title ?? step.stage}
          </div>
          <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{step.summary}</p>
          {step.export_blockers && step.export_blockers.length > 0 && (
            <p className="mt-1 text-xs text-amber-800">
              Export blockers: {step.export_blockers.join(", ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
