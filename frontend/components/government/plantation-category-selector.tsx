"use client";

import { Building2, Landmark, Route, Trees } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  GOVERNMENT_PLANTATION_CATEGORIES,
  type GovernmentPlantationCategory,
} from "@/lib/government-plantation-categories";
import { cn } from "@/lib/cn";

const CATEGORY_ICONS: Record<GovernmentPlantationCategory, LucideIcon> = {
  highway: Route,
  forest_ca: Trees,
  municipal: Landmark,
  other_government: Building2,
};

type PlantationCategorySelectorProps = {
  value: GovernmentPlantationCategory | null;
  onChange: (category: GovernmentPlantationCategory) => void;
  disabled?: boolean;
};

export function PlantationCategorySelector({
  value,
  onChange,
  disabled = false,
}: PlantationCategorySelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {GOVERNMENT_PLANTATION_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.code];
        const selected = value === category.code;
        return (
          <button
            key={category.code}
            type="button"
            disabled={disabled}
            onClick={() => onChange(category.code)}
            className={cn(
              "rounded-2xl border p-4 text-left transition",
              disabled && "cursor-not-allowed opacity-60",
              selected
                ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-700 dark:bg-blue-950/40"
                : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/50",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  selected
                    ? "bg-blue-600 text-white"
                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-stone-900 dark:text-stone-50">
                  {category.label}
                </span>
                <span className="block text-xs leading-relaxed text-stone-500">{category.hint}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
