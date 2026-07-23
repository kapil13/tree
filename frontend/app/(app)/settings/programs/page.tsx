"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Lock } from "lucide-react";
import { SettingsSection } from "@/components/settings/settings-section";
import { plantingPrograms } from "@/lib/api";
import { getProgramTheme } from "@/components/registration/program-theme";
import { cn } from "@/lib/cn";

export default function SettingsProgramsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["planting-programs", "memberships"],
    queryFn: () => plantingPrograms.memberships(),
  });

  const enrolled = new Set((data?.enrolled || []).map((p) => p.code));

  return (
    <SettingsSection
      title="Your programs"
      description="BYOT Public is active on every account. Government, NHAI, ESG, and NGO programs require admin approval — request access coming in the next release."
    >
      <div className="card space-y-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-stone-500">Loading programs…</p>
        ) : (
          (data?.available || []).map((program) => {
            const checked = enrolled.has(program.code);
            const theme = getProgramTheme(program.code);
            const Icon = theme.icon;
            const locked = !program.is_default;

            return (
              <div
                key={program.code}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3",
                  checked
                    ? "border-forest-300 bg-forest-50/50 dark:border-forest-800 dark:bg-forest-950/20"
                    : "border-stone-200 dark:border-stone-700",
                  locked && "opacity-80",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                    theme.gradient,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 dark:text-stone-50">{program.name}</p>
                    {program.is_default ? (
                      <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        <Lock className="h-3 w-3" />
                        Request access
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-500">{program.description}</p>
                </div>
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-forest-600 bg-forest-600 text-white"
                      : "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900",
                  )}
                  aria-hidden
                >
                  {checked ? <Check className="h-3 w-3" /> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </SettingsSection>
  );
}
