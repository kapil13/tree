"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Marker } from "@vis.gl/react-google-maps";
import { Bug, Droplets, Flame } from "lucide-react";
import { plantationFences, threats, type FireDetection } from "@/lib/api";
import type { PestIntel } from "@/components/pest-intel-panel";

export type HazardLayerToggles = {
  fire: boolean;
  flood: boolean;
  locust: boolean;
};

const DEFAULT_TOGGLES: HazardLayerToggles = {
  fire: true,
  flood: true,
  locust: true,
};

function fireMarkerIcon(confidence: string): string {
  const color =
    confidence.toLowerCase() === "high" || confidence.toLowerCase() === "h"
      ? "#dc2626"
      : "#ea580c";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.25"/>
    <path fill="${color}" d="M12 3c-1.5 2.5-3 4.2-3 6.5a3 3 0 1 0 6 0c0-2.3-1.5-4-3-6.5zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function centroidMarkerIcon(color: string, symbol: "flood" | "locust"): string {
  const inner =
    symbol === "flood"
      ? `<path fill="white" d="M12 4c-2 3-4 5.5-4 8a4 4 0 1 0 8 0c0-2.5-2-5-4-8z"/>`
      : `<circle cx="12" cy="13" r="3" fill="white"/><path fill="white" d="M8 9h2v2H8zm6 0h2v2h-2z"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2"/>
    ${inner}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

type LegendProps = {
  toggles: HazardLayerToggles;
  onToggle: (key: keyof HazardLayerToggles) => void;
  fireCount?: number;
  floodActive?: boolean;
  locustActive?: boolean;
  firmsConfigured?: boolean;
};

export function HazardMapLegend({
  toggles,
  onToggle,
  fireCount = 0,
  floodActive = false,
  locustActive = false,
  firmsConfigured = true,
}: LegendProps) {
  const items = [
    {
      key: "fire" as const,
      label: "Active fires (FIRMS)",
      count: fireCount,
      icon: Flame,
      color: "text-orange-600",
      hint: firmsConfigured ? undefined : "FIRMS key not configured",
    },
    {
      key: "flood" as const,
      label: "Flood extent watch",
      active: floodActive,
      icon: Droplets,
      color: "text-sky-600",
    },
    {
      key: "locust" as const,
      label: "Locust corridor",
      active: locustActive,
      icon: Bug,
      color: "text-amber-700",
    },
  ];

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-3 z-10 max-w-[240px] rounded-xl border border-stone-200/90 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-stone-700 dark:bg-stone-950/95"
      aria-label="Hazard map layers"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
        Hazard layers
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-700 dark:text-stone-200">
              <input
                type="checkbox"
                className="rounded border-stone-300"
                checked={toggles[item.key]}
                onChange={() => onToggle(item.key)}
              />
              <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.color}`} />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.count != null && item.count > 0 && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800">
                  {item.count}
                </span>
              )}
              {item.active && (
                <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                  watch
                </span>
              )}
            </label>
            {item.hint && (
              <p className="ml-6 mt-0.5 text-[10px] text-stone-400">{item.hint}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type OverlayProps = {
  fenceId: string;
  toggles: HazardLayerToggles;
};

export function HazardMapMarkers({ fenceId, toggles }: OverlayProps) {
  const { data: fires } = useQuery({
    queryKey: ["threats-fires", fenceId],
    queryFn: () => threats.fires(fenceId),
    enabled: toggles.fire,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: intel } = useQuery({
    queryKey: ["pest-intel", "work-area", fenceId],
    queryFn: () => plantationFences.pestIntel(fenceId) as Promise<PestIntel>,
    enabled: toggles.flood || toggles.locust,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const fireMarkers = useMemo(() => {
    if (!toggles.fire || !fires?.detections?.length) return [];
    return fires.detections.map((det: FireDetection, idx: number) => (
      <Marker
        key={`fire-${det.latitude}-${det.longitude}-${idx}`}
        position={{ lat: det.latitude, lng: det.longitude }}
        title={`Fire detection (${det.confidence})${det.frp ? ` · FRP ${det.frp.toFixed(0)}` : ""}`}
        icon={fireMarkerIcon(det.confidence)}
      />
    ));
  }, [fires?.detections, toggles.fire]);

  const centroid = useMemo(() => {
    if (!intel?.latitude || !intel?.longitude) return null;
    return { lat: intel.latitude, lng: intel.longitude };
  }, [intel?.latitude, intel?.longitude]);

  const floodActive =
    intel?.flood_extent_watch?.risk_level != null &&
    intel.flood_extent_watch.risk_level !== "none";
  const locustActive = (intel?.early_warnings ?? []).some((w) => w.kind === "locust");

  const siteMarkers = useMemo(() => {
    if (!centroid) return [];
    const markers = [];
    if (toggles.flood && floodActive) {
      markers.push(
        <Marker
          key="flood-watch"
          position={centroid}
          title="Flood extent watch at work-area centroid"
          icon={centroidMarkerIcon("#0284c7", "flood")}
        />,
      );
    }
    if (toggles.locust && locustActive) {
      markers.push(
        <Marker
          key="locust-watch"
          position={centroid}
          title="Locust corridor watch"
          icon={centroidMarkerIcon("#b45309", "locust")}
        />,
      );
    }
    return markers;
  }, [centroid, floodActive, locustActive, toggles.flood, toggles.locust]);

  return (
    <>
      {fireMarkers}
      {siteMarkers}
    </>
  );
}

export function useHazardMapLayers(fenceId: string | null) {
  const [toggles, setToggles] = useState<HazardLayerToggles>(DEFAULT_TOGGLES);

  const { data: fires } = useQuery({
    queryKey: ["threats-fires", fenceId],
    queryFn: () => threats.fires(fenceId!),
    enabled: Boolean(fenceId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: intel } = useQuery({
    queryKey: ["pest-intel", "work-area", fenceId],
    queryFn: () => plantationFences.pestIntel(fenceId!) as Promise<PestIntel>,
    enabled: Boolean(fenceId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const floodActive =
    intel?.flood_extent_watch?.risk_level != null &&
    intel.flood_extent_watch.risk_level !== "none";
  const locustActive = (intel?.early_warnings ?? []).some((w) => w.kind === "locust");

  function toggleLayer(key: keyof HazardLayerToggles) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return {
    toggles,
    toggleLayer,
    fireCount: fires?.fire_count ?? 0,
    firmsConfigured: fires?.firms_configured ?? true,
    floodActive,
    locustActive,
  };
}
