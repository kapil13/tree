"use client";

import { useQuery } from "@tanstack/react-query";
import { Info, Leaf, Sparkles } from "lucide-react";
import { plantingProjects, type SpeciesSuggestion } from "@/lib/api";
import { cn } from "@/lib/cn";

type LocationParams = {
  state_code?: string;
  state_name?: string;
  district_code?: string;
  district_name?: string;
};

type Props = {
  projectId: string;
  location?: LocationParams;
  selectedSpecies?: string;
  onSelectSpecies?: (name: string) => void;
  compact?: boolean;
  className?: string;
};

function locationKey(location?: LocationParams): string {
  if (!location) return "";
  return [
    location.state_code ?? "",
    location.district_code ?? "",
    location.state_name ?? "",
    location.district_name ?? "",
  ].join("|");
}

export function SuggestedSpeciesPanel({
  projectId,
  location,
  selectedSpecies,
  onSelectSpecies,
  compact = false,
  className,
}: Props) {
  const locKey = locationKey(location);
  const hasLocation = Boolean(location?.state_code?.trim());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["species-suggestions", projectId, locKey],
    queryFn: () =>
      plantingProjects.speciesSuggestions(projectId, {
        state_code: location?.state_code || undefined,
        state_name: location?.state_name || undefined,
        district_code: location?.district_code || undefined,
        district_name: location?.district_name || undefined,
      }),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  const suggestions = data?.suggestions ?? [];

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-stone-200 bg-stone-50/60 p-4 text-sm text-stone-500",
          className,
        )}
      >
        Loading species suggestions…
      </div>
    );
  }

  if (isError || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-white to-white p-4",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">
            Suggested species for this project
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {hasLocation
              ? `Based on ${location?.state_name || "state"}${location?.district_name ? `, ${location.district_name}` : ""} and your planting scheme.`
              : "Based on your planting scheme. Add state and district in project setup for local natives."}
          </p>
        </div>
      </div>

      <div className={cn("mt-3 flex flex-wrap gap-2", compact && "gap-1.5")}>
        {suggestions.map((item) => (
          <SpeciesChip
            key={item.common_name}
            item={item}
            selected={selectedSpecies === item.common_name}
            onSelect={onSelectSpecies}
            compact={compact}
          />
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-100 bg-white/70 px-3 py-2 text-xs text-stone-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
        <p>
          {data?.disclaimer ??
            "Suggestions only — you may register other species. Scheme compliance rules still apply where configured."}
        </p>
      </div>
    </div>
  );
}

function SpeciesChip({
  item,
  selected,
  onSelect,
  compact,
}: {
  item: SpeciesSuggestion;
  selected?: boolean;
  onSelect?: (name: string) => void;
  compact?: boolean;
}) {
  const title = [item.scientific_name, ...item.reasons].filter(Boolean).join(" · ");

  if (onSelect) {
    return (
      <button
        type="button"
        title={title}
        onClick={() => onSelect(item.common_name)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
          selected
            ? "border-forest-600 bg-forest-50 text-forest-800"
            : "border-sky-200 bg-white text-stone-700 hover:border-sky-400 hover:bg-sky-50",
          compact && "px-2 py-0.5 text-[11px]",
        )}
      >
        <Leaf className="h-3 w-3 shrink-0" />
        {item.common_name}
      </button>
    );
  }

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-stone-700",
        compact && "px-2 py-0.5 text-[11px]",
      )}
    >
      <Leaf className="h-3 w-3 shrink-0 text-sky-700" />
      {item.common_name}
    </span>
  );
}
