"use client";

import { useQuery } from "@tanstack/react-query";
import { Bug, CloudRain, Leaf, Loader2, Stethoscope } from "lucide-react";
import { plantationFences, plantingProjects } from "@/lib/api";

export type PestIntel = {
  work_area_id: string;
  work_area_name: string;
  project_id?: string | null;
  project_name?: string | null;
  composite_risk: string;
  pest_control_needed: boolean;
  disease_control_needed: boolean;
  ndvi_mean?: number | null;
  ndvi_trend?: string | null;
  interpretation?: string | null;
  tree_count: number;
  healthy_pct?: number | null;
  rain_mm_next_48h?: number;
  recommended_actions: string[];
  satellite_health?: { summary?: string; risk_level?: string } | null;
  weather?: {
    days?: Array<{
      date: string;
      description: string;
      temp_min_c: number;
      temp_max_c: number;
      precipitation_mm: number;
    }>;
  } | null;
};

const RISK_CLASS: Record<string, string> = {
  low: "border-green-200 bg-green-50 text-green-900",
  moderate: "border-amber-200 bg-amber-50 text-amber-900",
  high: "border-orange-200 bg-orange-50 text-orange-900",
  critical: "border-rose-300 bg-rose-50 text-rose-900",
};

type Props =
  | { kind: "work-area"; targetId: string }
  | { kind: "project"; targetId: string; workAreaId?: string };

export function PestIntelPanel(props: Props) {
  const { kind, targetId } = props;
  const workAreaId = props.kind === "project" ? props.workAreaId : undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: ["pest-intel", kind, targetId, workAreaId],
    queryFn: async () => {
      if (kind === "work-area") {
        return (await plantationFences.pestIntel(targetId)) as PestIntel;
      }
      const res = await plantingProjects.pestIntel(targetId, workAreaId);
      if (workAreaId && res && "composite_risk" in res) return res as PestIntel;
      return (res.highest_risk as PestIntel) ?? null;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pest & weather intel…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
        Pest intel unavailable. Run a satellite health scan on this work area first.
      </div>
    );
  }

  const risk = data.composite_risk || "low";
  const forecast = data.weather?.days?.slice(0, 3) ?? [];

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
          <Bug className="h-4 w-4 text-forest-700" />
          Pest & disease watch
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${RISK_CLASS[risk] ?? RISK_CLASS.low}`}>
          {risk}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-stone-50 p-2">
          <div className="text-stone-500">Trees in area</div>
          <div className="font-semibold">{data.tree_count}</div>
        </div>
        <div className="rounded-md bg-stone-50 p-2">
          <div className="text-stone-500">Healthy</div>
          <div className="font-semibold">{data.healthy_pct != null ? `${data.healthy_pct}%` : "—"}</div>
        </div>
        <div className="rounded-md bg-stone-50 p-2">
          <div className="text-stone-500">NDVI trend</div>
          <div className="font-semibold capitalize">{data.ndvi_trend ?? "—"}</div>
        </div>
        <div className="rounded-md bg-stone-50 p-2">
          <div className="text-stone-500">Rain 48h</div>
          <div className="font-semibold">{data.rain_mm_next_48h ?? 0} mm</div>
        </div>
      </div>

      {(data.pest_control_needed || data.disease_control_needed) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {data.pest_control_needed && (
            <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">Pest watch</span>
          )}
          {data.disease_control_needed && (
            <span className="rounded bg-rose-100 px-2 py-1 text-rose-900">Disease risk</span>
          )}
        </div>
      )}

      {data.satellite_health?.summary && (
        <p className="text-xs text-stone-600">
          <Stethoscope className="mr-1 inline h-3 w-3" />
          {data.satellite_health.summary}
        </p>
      )}

      {data.interpretation && (
        <p className="text-xs text-stone-600">{data.interpretation}</p>
      )}

      {forecast.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-stone-700">
            <CloudRain className="h-3 w-3" /> Forecast
          </div>
          <ul className="space-y-1 text-xs text-stone-600">
            {forecast.map((d) => (
              <li key={d.date}>
                {d.date}: {d.description}, {d.temp_min_c}–{d.temp_max_c}°C, {d.precipitation_mm} mm
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center gap-1 text-xs font-medium text-stone-700">
          <Leaf className="h-3 w-3" /> Recommended actions
        </div>
        <ul className="list-disc space-y-1 pl-4 text-xs text-stone-600">
          {(data.recommended_actions ?? []).map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
