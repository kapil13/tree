"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { PlantationFenceMap } from "@/components/plantation-fence-map";
import { SatelliteSiteDetailPanel } from "@/components/satellite/satellite-site-detail-panel";
import { bhoonidhi, plantationFences, plantingProjects } from "@/lib/api";
import { formatAreaHa } from "@/lib/geo";
import { parseSatelliteSearchParams, satelliteHref } from "@/lib/satellite-links";
import { cn } from "@/lib/cn";

type Props = {
  /** Initial fence id from URL */
  initialFenceId?: string | null;
  /** When set, filter sites to this project's work areas */
  projectId?: string | null;
};

export function SatelliteWorkspace({ initialFenceId, projectId }: Props) {
  const router = useRouter();
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(initialFenceId ?? null);
  const [ndviRefresh, setNdviRefresh] = useState(0);

  const { data: fencePage, isLoading: fencesLoading } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list(),
  });

  const { data: projectWorkAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId!),
    enabled: Boolean(projectId),
  });

  const { data: bhoonidhiStatus } = useQuery({
    queryKey: ["bhoonidhi-status"],
    queryFn: bhoonidhi.status,
  });

  const projectFenceIds = useMemo(
    () => (projectId ? projectWorkAreas.map((wa) => wa.id) : undefined),
    [projectId, projectWorkAreas],
  );

  const visibleFences = useMemo(() => {
    const all = fencePage?.items ?? [];
    if (!projectFenceIds?.length) return all;
    const allowed = new Set(projectFenceIds);
    return all.filter((f) => allowed.has(f.id));
  }, [fencePage?.items, projectFenceIds]);

  useEffect(() => {
    if (initialFenceId) {
      setSelectedFenceId(initialFenceId);
    }
  }, [initialFenceId]);

  useEffect(() => {
    if (selectedFenceId) return;
    if (initialFenceId && visibleFences.some((f) => f.id === initialFenceId)) {
      setSelectedFenceId(initialFenceId);
      return;
    }
    if (visibleFences.length === 1) {
      setSelectedFenceId(visibleFences[0]!.id);
    }
  }, [selectedFenceId, initialFenceId, visibleFences]);

  const selectedFence = visibleFences.find((f) => f.id === selectedFenceId) ?? null;

  function syncUrl(fenceId: string | null) {
    const href = satelliteHref({ fenceId, projectId });
    router.replace(href, { scroll: false });
  }

  function handleSelectFence(fenceId: string | null) {
    setSelectedFenceId(fenceId);
    syncUrl(fenceId);
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-100/50 shadow-sm dark:border-stone-800 dark:bg-stone-900/40 lg:min-h-[720px] lg:flex-row">
      <div className="flex min-h-[48vh] min-w-0 flex-1 flex-col border-b border-stone-200/80 lg:border-b-0 lg:border-r dark:border-stone-800">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-950">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Site map</p>
            <p className="text-sm text-stone-600">
              {projectId
                ? `${visibleFences.length} work area${visibleFences.length === 1 ? "" : "s"} for this project`
                : `${visibleFences.length} plantation site${visibleFences.length === 1 ? "" : "s"} in your org`}
            </p>
          </div>
          {visibleFences.length > 0 && (
            <div className="flex min-w-[200px] flex-1 items-center gap-2 sm:max-w-sm">
              <MapPin className="h-4 w-4 shrink-0 text-stone-400" />
              <select
                id="satellite-fence"
                className="input w-full text-sm"
                value={selectedFenceId ?? ""}
                onChange={(e) => handleSelectFence(e.target.value || null)}
              >
                <option value="">Select a site…</option>
                {visibleFences.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.area_ha != null ? ` · ${formatAreaHa(f.area_ha)}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 p-3">
          {fencesLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              Loading sites…
            </div>
          ) : (
            <PlantationFenceMap
              mapType="satellite"
              height="100%"
              className="h-full min-h-[420px]"
              selectedFenceId={selectedFenceId}
              onFenceSelect={handleSelectFence}
              hideSidebar
              restrictToFenceIds={projectFenceIds}
            />
          )}
        </div>

        {visibleFences.length > 1 && (
          <div className="shrink-0 border-t border-stone-200/80 bg-white px-4 py-2 dark:border-stone-800 dark:bg-stone-950">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleFences.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFence(f.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    selectedFenceId === f.id
                      ? "border-forest-500 bg-forest-50 text-forest-900"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex w-full shrink-0 flex-col bg-white dark:bg-stone-950 lg:w-[min(440px,42%)] xl:w-[min(480px,40%)]">
        {selectedFence ? (
          <SatelliteSiteDetailPanel
            fence={selectedFence}
            ndviRefresh={ndviRefresh}
            onScanComplete={() => setNdviRefresh((n) => n + 1)}
            onDelete={() => handleSelectFence(null)}
            bhoonidhiConfigured={bhoonidhiStatus?.configured ?? false}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
            <MapPin className="h-10 w-10 text-stone-300" />
            <p className="mt-4 text-base font-medium text-stone-800">Select a site on the map</p>
            <p className="mt-2 max-w-xs text-sm text-stone-500">
              Click a polygon or choose from the dropdown to view NDVI, weather, radar integrity, and
              health alerts for that boundary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Reads URL search params and renders the workspace (for use in page.tsx). */
export function SatelliteWorkspaceFromUrl() {
  const searchParams = useSearchParams();
  const { fenceId, projectId } = parseSatelliteSearchParams(searchParams);
  return <SatelliteWorkspace initialFenceId={fenceId} projectId={projectId} />;
}
