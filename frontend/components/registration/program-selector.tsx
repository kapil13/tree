"use client";

import { Check } from "lucide-react";
import type { PlantingProgram } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getProgramTheme } from "./program-theme";

type ProgramSelectorProps = {
  programs: PlantingProgram[];
  value: string;
  onChange: (code: string) => void;
};

export function ProgramSelector({ programs, value, onChange }: ProgramSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {programs.map((program) => {
        const theme = getProgramTheme(program.code);
        const Icon = theme.icon;
        const active = program.code === value;
        return (
          <button
            key={program.code}
            type="button"
            onClick={() => onChange(program.code)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
              "bg-white/80 backdrop-blur-xl dark:bg-stone-900/70",
              active
                ? cn("border-transparent ring-2 shadow-xl", theme.ring, theme.glow)
                : "border-stone-200/80 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg dark:border-stone-700/80",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity",
                theme.gradient,
                active ? "opacity-40" : "group-hover:opacity-30",
              )}
            />
            <div className="relative flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                  theme.gradient,
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                    {program.name}
                  </h3>
                  {active && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {program.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", theme.chip)}>
                    {program.audience}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {program.min_photos} photo{program.min_photos === 1 ? "" : "s"} min
                  </span>
                  {program.is_default && (
                    <span className="rounded-full bg-stone-900 px-2.5 py-0.5 text-[11px] font-medium text-white dark:bg-stone-100 dark:text-stone-900">
                      Always on
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
