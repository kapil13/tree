"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { PlantationFenceMap } from "@/components/plantation-fence-map";
import { SatelliteSiteDetailSections } from "@/components/satellite/satellite-site-detail-sections";
import { SatelliteSiteSummaryRail } from "@/components/satellite/satellite-site-summary-rail";
import { bhoonidhi, plantationFences, plantingProjects } from "@/lib/api";
import { formatAreaHa } from "@/lib/geo";
import { parseSatelliteSearchParams, satelliteHref } from "@/lib/satellite-links";
import { cn } from "@/lib/cn";

type Props = {
  initialFenceId?: string | null;
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white px-4 py-3 shadow-sm dark:border-stone-800 dark:bg-stone-950">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Site map
          </p>
          <p className="text-sm text-stone-600">
            {projectId
              ? `${visibleFences.length} work area${visibleFences.length === 1 ? "" : "s"} for this project`
              : `${visibleFences.length} plantation site${visibleFences.length === 1 ? "" : "s"} in your org`}
          </p>
        </div>
        {visibleFences.length > 0 && (
          <div className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-md">
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

      {visibleFences.length > 1 && (
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-200/90 bg-white px-3 py-2 shadow-sm dark:border-stone-800 dark:bg-stone-950">
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
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-100/50 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
        <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.95fr)] lg:h-[min(560px,62vh)]">
          <div className="relative min-h-[360px] border-b border-stone-200/80 p-3 lg:min-h-0 lg:border-b-0 lg:border-r dark:border-stone-800">
            {fencesLoading ? (
              <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-stone-500">
                Loading sites…
              </div>
            ) : (
              <PlantationFenceMap
                mapType="satellite"
                height="100%"
                className="h-full min-h-[360px] lg:min-h-0"
                selectedFenceId={selectedFenceId}
                onFenceSelect={handleSelectFence}
                hideSidebar
                restrictToFenceIds={projectFenceIds}
              />
            )}
            {!selectedFence && !fencesLoading ? (
              <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-xl bg-white/70 p-6 text-center backdrop-blur-sm dark:bg-stone-950/70">
                <div>
                  <MapPin className="mx-auto h-8 w-8 text-stone-300" />
                  <p className="mt-3 text-sm font-medium text-stone-800">
                    Select a site on the map
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Click a polygon or choose from the dropdown.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-h-[320px] lg:min-h-0 lg:overflow-hidden">
            {selectedFence ? (
              <SatelliteSiteSummaryRail
                fence={selectedFence}
                onScanComplete={() => setNdviRefresh((n) => n + 1)}
                onDelete={() => handleSelectFence(null)}
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center text-sm text-stone-500 lg:min-h-0">
                Vegetation overview appears here when a site is selected.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedFence ? (
        <SatelliteSiteDetailSections
          fence={selectedFence}
          ndviRefresh={ndviRefresh}
          bhoonidhiConfigured={bhoonidhiStatus?.configured ?? false}
        />
      ) : null}
    </div>
  );
}

export function SatelliteWorkspaceFromUrl() {
  const searchParams = useSearchParams();
  const { fenceId, projectId } = parseSatelliteSearchParams(searchParams);
  return <SatelliteWorkspace initialFenceId={fenceId} projectId={projectId} />;
}
