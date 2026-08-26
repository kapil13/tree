"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, Satellite, Wind } from "lucide-react";
import { EmissionsPlumeMap } from "@/components/projects/emissions-plume-map";
import {
  errorMessage,
  plantingProjects,
  type DispersionRunResult,
  type TropomiScanResult,
  type WorkArea,
} from "@/lib/api";

function ringCentroid(boundary: WorkArea["boundary"]): [number, number] {
  const ring = boundary.coordinates[0] ?? [];
  if (ring.length === 0) return [0, 0];
  let lng = 0;
  let lat = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i += 1) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return [lng / n, lat / n];
}

export function ProjectEmissionsPanel({
  projectId,
  workAreas,
}: {
  projectId: string;
  workAreas: WorkArea[];
}) {
  const qc = useQueryClient();
  const [workAreaId, setWorkAreaId] = useState(workAreas[0]?.id ?? "");
  const [name, setName] = useState("Methane source");
  const [rate, setRate] = useState("10");
  const [plumeResult, setPlumeResult] = useState<DispersionRunResult | null>(null);
  const [tropomiScan, setTropomiScan] = useState<TropomiScanResult | null>(null);

  const selectedArea = useMemo(
    () => workAreas.find((a) => a.id === workAreaId) ?? workAreas[0],
    [workAreaId, workAreas],
  );

  const centroid = selectedArea ? ringCentroid(selectedArea.boundary) : [0, 0];

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["emission-sources", projectId, workAreaId],
    queryFn: () =>
      plantingProjects.listEmissionSources(projectId, workAreaId || undefined),
    enabled: Boolean(projectId),
  });

  const { data: latestPlume } = useQuery({
    queryKey: ["dispersion-latest", projectId, workAreaId],
    queryFn: () => plantingProjects.getLatestDispersion(projectId, workAreaId),
    enabled: Boolean(projectId && workAreaId),
  });

  const { data: scanHistory = [] } = useQuery({
    queryKey: ["tropomi-scans", projectId, workAreaId],
    queryFn: () => plantingProjects.listTropomiScans(projectId, workAreaId, 3),
    enabled: Boolean(projectId && workAreaId),
  });

  useEffect(() => {
    if (latestPlume) setPlumeResult(latestPlume);
  }, [latestPlume]);

  useEffect(() => {
    if (scanHistory.length > 0) setTropomiScan(scanHistory[0]);
  }, [scanHistory]);

  const createMut = useMutation({
    mutationFn: () => {
      if (!selectedArea) throw new Error("Select a work area");
      return plantingProjects.createEmissionSource(projectId, {
        work_area_id: selectedArea.id,
        name,
        source_type: "landfill",
        gas_type: "CH4",
        geometry_kind: "point",
        point: { type: "Point", coordinates: centroid },
        emission_rate_g_s: Number(rate),
        release_height_m: 2,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emission-sources", projectId] });
    },
  });

  const runMut = useMutation({
    mutationFn: () => {
      const active = sources.filter((s) => s.status === "active");
      if (!selectedArea || active.length === 0) {
        throw new Error("Add an active emission source first");
      }
      return plantingProjects.runDispersion(projectId, {
        work_area_id: selectedArea.id,
        emission_source_ids: active.map((s) => s.id),
        duration_hours: 24,
        downwind_km: 10,
        crosswind_km: 2,
      });
    },
    onSuccess: (data) => {
      setPlumeResult(data);
      qc.invalidateQueries({ queryKey: ["dispersion-latest", projectId, workAreaId] });
    },
  });

  const scanMut = useMutation({
    mutationFn: () => {
      if (!selectedArea) throw new Error("Select a work area");
      return plantingProjects.runTropomiScan(projectId, selectedArea.id, { months: 12 });
    },
    onSuccess: (data) => {
      setTropomiScan(data);
      qc.invalidateQueries({ queryKey: ["tropomi-scans", projectId, workAreaId] });
    },
  });

  if (workAreas.length === 0) {
    return (
      <div className="card text-sm text-stone-600">
        Draw a work area on the project map before registering GHG / methane sources.
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-start gap-3">
        <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" />
        <div>
          <h2 className="text-lg font-semibold text-stone-900">GHG & methane dispersion</h2>
          <p className="mt-1 text-sm text-stone-600">
            Register emission sources inside your work area boundary. Plume modeling uses free
            Open-Meteo wind data and may extend downwind outside the polygon. TROPOMI CH₄ scans
            use Copernicus Sentinel Hub over a buffered ROI.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-xs">Work area</label>
          <select
            className="input text-sm"
            value={workAreaId}
            onChange={(e) => setWorkAreaId(e.target.value)}
          >
            {workAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Source name</label>
          <input className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">CH₄ emission rate (g/s)</label>
          <input
            className="input text-sm"
            type="number"
            min={0.001}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-primary w-full text-sm"
            disabled={createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? "Saving…" : "Add point source (centroid)"}
          </button>
        </div>
      </div>

      {createMut.error ? (
        <p className="text-sm text-rose-700">{errorMessage(createMut.error)}</p>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-stone-800">Registered sources</h3>
        {isLoading ? (
          <p className="mt-2 text-sm text-stone-500">Loading…</p>
        ) : sources.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No emission sources yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            {sources.map((s) => (
              <li key={s.id} className="rounded-lg border border-stone-200 px-3 py-2">
                <span className="font-medium">{s.name}</span> — {s.gas_type}{" "}
                {s.emission_rate_g_s != null ? `(${s.emission_rate_g_s} g/s)` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
          disabled={runMut.isPending || sources.length === 0}
          onClick={() => runMut.mutate()}
        >
          <Wind className="h-4 w-4" />
          {runMut.isPending ? "Running plume model…" : "Run dispersion simulation"}
        </button>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
          disabled={scanMut.isPending || !selectedArea}
          onClick={() => scanMut.mutate()}
        >
          <Satellite className="h-4 w-4" />
          {scanMut.isPending ? "Scanning TROPOMI CH₄…" : "Run TROPOMI CH₄ scan"}
        </button>
      </div>

      {runMut.error ? (
        <p className="text-sm text-rose-700">{errorMessage(runMut.error)}</p>
      ) : null}
      {scanMut.error ? (
        <p className="text-sm text-rose-700">{errorMessage(scanMut.error)}</p>
      ) : null}

      {selectedArea ? (
        <EmissionsPlumeMap
          workArea={selectedArea}
          sources={sources}
          plume={plumeResult}
          roiGeojson={tropomiScan?.roi_geojson ?? null}
        />
      ) : null}

      {plumeResult ? (
        <div className="rounded-xl border border-forest-200 bg-forest-50/50 p-4 text-sm text-stone-800">
          <p className="font-semibold text-forest-900">Latest plume result</p>
          <ul className="mt-2 space-y-1">
            <li>Gas: {plumeResult.gas_type}</li>
            <li>Wind: {plumeResult.wind_speed_ms} m/s from {plumeResult.wind_direction_deg}°</li>
            <li>Stability: class {plumeResult.stability_class}</li>
            <li>
              Peak ground concentration: {plumeResult.max_concentration_ug_m3.toFixed(2)} µg/m³
            </li>
            <li>
              Downwind reach modeled: {plumeResult.downwind_km} km (may extend outside work area)
            </li>
          </ul>
        </div>
      ) : null}

      {tropomiScan ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm text-stone-800">
          <p className="font-semibold text-sky-900">Latest TROPOMI CH₄ scan</p>
          <ul className="mt-2 space-y-1">
            <li>Latest mean: {tropomiScan.summary.latest_mean_ppb} ppb</li>
            {tropomiScan.summary.baseline_ppb != null ? (
              <li>Baseline (median): {tropomiScan.summary.baseline_ppb} ppb</li>
            ) : null}
            {tropomiScan.summary.anomaly_ppb != null ? (
              <li>Anomaly: {tropomiScan.summary.anomaly_ppb > 0 ? "+" : ""}
                {tropomiScan.summary.anomaly_ppb} ppb</li>
            ) : null}
            <li>ROI buffer: {tropomiScan.buffer_km} km around work area</li>
            <li>Months in series: {tropomiScan.summary.months}</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
