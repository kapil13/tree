"use client";

import { useMemo } from "react";
import { APIProvider, Map as GoogleMap, Polygon } from "@vis.gl/react-google-maps";
import { type AuditBoundary, geoJsonRingToPaths } from "@/lib/audit-field-visit";
import { FALLBACK_MAP_CENTER } from "@/lib/map-defaults";
import { cn } from "@/lib/cn";

const GRADE_FILL: Record<string, { fill: string; stroke: string }> = {
  green: { fill: "#22c55e", stroke: "#15803d" },
  amber: { fill: "#f59e0b", stroke: "#b45309" },
  red: { fill: "#ef4444", stroke: "#b91c1c" },
  grey: { fill: "#a8a29e", stroke: "#78716c" },
};

type ConfidenceBlock = {
  boundary_version_id?: string;
  boundary_name?: string | null;
  confidence_grade: string;
};

export function AuditConfidenceMap({
  boundaries,
  blocks,
  height = "360px",
}: {
  boundaries: AuditBoundary[];
  blocks: ConfidenceBlock[];
  height?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const gradeByBoundary = useMemo(() => {
    const map = new Map<string, string>();
    for (const block of blocks) {
      if (block.boundary_version_id) {
        map.set(block.boundary_version_id, block.confidence_grade);
      }
    }
    return map;
  }, [blocks]);

  const boundaryLayers = useMemo(
    () =>
      boundaries.map((b) => ({
        id: b.id,
        name: b.name,
        paths: geoJsonRingToPaths(b.boundary),
        grade: gradeByBoundary.get(b.id) ?? "grey",
      })),
    [boundaries, gradeByBoundary],
  );

  const center = useMemo(() => {
    const points = boundaryLayers.flatMap((b) => b.paths);
    if (points.length === 0) return FALLBACK_MAP_CENTER;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { lat, lng };
  }, [boundaryLayers]);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view the confidence map on real geography.
      </div>
    );
  }

  if (boundaries.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Import or draw block boundaries during intake to see the confidence map.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        {(["green", "amber", "red", "grey"] as const).map((grade) => (
          <span key={grade} className="inline-flex items-center gap-1.5">
            <span
              className={cn("h-3 w-3 rounded-sm ring-1 ring-black/10")}
              style={{ backgroundColor: GRADE_FILL[grade].fill }}
            />
            {grade}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-stone-200" style={{ height }}>
        <APIProvider apiKey={apiKey}>
          <GoogleMap
            defaultCenter={center}
            defaultZoom={12}
            mapTypeId="satellite"
            gestureHandling="greedy"
            disableDefaultUI
            style={{ width: "100%", height: "100%" }}
          >
            {boundaryLayers.map((b) => {
              const colors = GRADE_FILL[b.grade] ?? GRADE_FILL.grey;
              if (b.paths.length === 0) return null;
              return (
                <Polygon
                  key={b.id}
                  paths={b.paths}
                  fillColor={colors.fill}
                  fillOpacity={0.45}
                  strokeColor={colors.stroke}
                  strokeWeight={2}
                />
              );
            })}
          </GoogleMap>
        </APIProvider>
      </div>
    </div>
  );
}
