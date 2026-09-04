"use client";

import {
  BadgeCheck,
  Building2,
  Globe2,
  HardHat,
  Leaf,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AudiencePreset, PlantingAudience } from "@/lib/audience";

const AUDIENCE_ICONS: Record<PlantingAudience, LucideIcon> = {
  mining: HardHat,
  corporate_esg: BadgeCheck,
  government: Building2,
  international: Globe2,
  general: Leaf,
};

const AUDIENCE_ACCENT: Record<PlantingAudience, string> = {
  mining: "from-amber-500/15 to-orange-600/5 ring-amber-500/25 hover:ring-amber-500/45",
  corporate_esg: "from-emerald-500/15 to-forest-600/5 ring-emerald-500/25 hover:ring-emerald-500/45",
  government: "from-sky-500/15 to-blue-600/5 ring-sky-500/25 hover:ring-sky-500/45",
  international: "from-violet-500/15 to-indigo-600/5 ring-violet-500/25 hover:ring-violet-500/45",
  general: "from-stone-400/15 to-stone-500/5 ring-stone-400/25 hover:ring-stone-400/45",
};

type AudiencePickerProps = {
  presets: AudiencePreset[];
  selected?: PlantingAudience | null;
  busy?: boolean;
  onSelect: (audience: PlantingAudience) => void;
};

export function AudiencePicker({ presets, selected, busy, onSelect }: AudiencePickerProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Who are you planting for?
        </h1>
        <p className="text-sm leading-relaxed text-stone-600">
          This tailors scheme suggestions, dashboard shortcuts, and compliance defaults. You can
          still access every scheme when creating a project.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((preset) => {
          const code = preset.code;
          const Icon = AUDIENCE_ICONS[code];
          const isSelected = selected === code;
          return (
            <button
              key={code}
              type="button"
              disabled={busy}
              onClick={() => onSelect(code)}
              className={cn(
                "group rounded-2xl border bg-gradient-to-br p-4 text-left ring-1 transition",
                "disabled:cursor-not-allowed disabled:opacity-60",
                AUDIENCE_ACCENT[code],
                isSelected ? "border-forest-500 shadow-md" : "border-white/80",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-forest-800 shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm font-semibold text-stone-900">{preset.label}</span>
                  <span className="block text-xs leading-relaxed text-stone-600">
                    {preset.description}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {busy ? (
        <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving your selection…
        </div>
      ) : null}
    </div>
  );
}
