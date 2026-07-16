"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Square, Waves } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { bioacoustic, errorMessage, plantationFences } from "@/lib/api";

const MIN_SECONDS = 30;
const MAX_SECONDS = 60;

function iucnBadge(status: string) {
  const map: Record<string, string> = {
    "Critically Endangered": "bg-rose-100 text-rose-800",
    Endangered: "bg-orange-100 text-orange-900",
    Vulnerable: "bg-amber-100 text-amber-900",
    "Least Concern": "bg-green-100 text-green-800",
    "Not Evaluated": "bg-stone-100 text-stone-700",
  };
  return map[status] ?? "bg-stone-100 text-stone-700";
}

export default function BioacousticPage() {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fenceId, setFenceId] = useState<string>("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: fences } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list({ page_size: 100 }),
  });

  const { data: ecosystem } = useQuery({
    queryKey: ["ecosystem-health", fenceId],
    queryFn: () => plantationFences.ecosystemHealth(fenceId),
    enabled: Boolean(fenceId),
  });

  const { data: recordings, isLoading } = useQuery({
    queryKey: ["bioacoustic-recordings"],
    queryFn: bioacoustic.list,
  });

  const analyzeMut = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      bioacoustic.analyze(id, { force }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bioacoustic-recordings"] }),
  });

  const stopRecording = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setStatus("Uploading recording…");
        try {
          let lat = 17.385;
          let lon = 78.4867;
          try {
            const pos = await new Promise<GeolocationPosition>((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
            );
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          } catch {
            // fallback
          }

          const duration = Math.max(elapsed, MIN_SECONDS);
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          form.append("duration_seconds", String(duration));
          form.append("latitude", String(lat));
          form.append("longitude", String(lon));
          if (fenceId) form.append("plantation_fence_id", fenceId);

          const rec = await bioacoustic.uploadDirect(form);
          setStatus("Queued for BirdNET analysis…");
          await bioacoustic.analyze(rec.id);
          setStatus("Recording analyzed successfully.");
          qc.invalidateQueries({ queryKey: ["bioacoustic-recordings"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          if (fenceId) qc.invalidateQueries({ queryKey: ["ecosystem-health", fenceId] });
        } catch (e) {
          setError(errorMessage(e));
        }
      };
      mediaRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [elapsed, fenceId, qc, stopRecording]);

  async function downloadReport(kind: "biodiversity" | "esg") {
    if (!fenceId) {
      setError("Select a plantation site first to generate a report.");
      return;
    }
    try {
      const job = await bioacoustic.queueReport(fenceId, kind);
      window.open(`/api/v1/reports/${job.id}/download`, "_blank");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bioacoustic monitoring</h1>
        <p className="mt-1 text-sm text-stone-600">
          Record 30–60 seconds outdoors. BirdNET identifies bird species from your soundscape.
          Health scores are based on bird detections only.
        </p>
      </div>

      <div className="card grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Plantation site (optional)</label>
          <select
            className="input w-full"
            value={fenceId}
            onChange={(e) => setFenceId(e.target.value)}
          >
            <option value="">No site — GPS only</option>
            {fences?.items.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-500">
            Link recordings to a fence for biodiversity reports and NDVI correlation.
          </p>
        </div>
        {fenceId && (
          <div className="flex flex-wrap items-end gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={() => downloadReport("biodiversity")}>
              Biodiversity PDF
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => downloadReport("esg")}>
              ESG PDF
            </button>
          </div>
        )}
      </div>

      {ecosystem && (
        <div className="card">
          <h2 className="mb-3 text-sm font-medium text-stone-700">
            Ecosystem health — {ecosystem.fence_name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Ecosystem score" value={`${ecosystem.ecosystem_health_score}/100`} />
            <Metric label="Bioacoustic health" value={`${ecosystem.bioacoustic.avg_health_score}/100`} />
            <Metric label="NDVI" value={ecosystem.ndvi_mean?.toFixed(2) ?? "—"} />
            <Metric label="Correlation" value={ecosystem.correlation_score?.toFixed(2) ?? "—"} />
          </div>
          <p className="mt-3 text-sm text-stone-600">{ecosystem.interpretation}</p>
          {Object.keys(ecosystem.bioacoustic.taxon_breakdown || {}).length > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              Taxa:{" "}
              {Object.entries(ecosystem.bioacoustic.taxon_breakdown)
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      <div className="card flex flex-col items-center gap-4 py-8">
        <Waves className="h-10 w-10 text-forest-700" />
        <div className="text-3xl font-mono tabular-nums">{elapsed}s</div>
        <p className="text-sm text-stone-500">Target: {MIN_SECONDS}–{MAX_SECONDS} seconds</p>
        {!recording ? (
          <button className="btn-primary flex items-center gap-2" onClick={startRecording}>
            <Mic className="h-4 w-4" />
            Start recording
          </button>
        ) : (
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={stopRecording}
            disabled={elapsed < MIN_SECONDS}
          >
            <Square className="h-4 w-4" />
            {elapsed < MIN_SECONDS ? `Stop (${MIN_SECONDS - elapsed}s min)` : "Stop & analyze"}
          </button>
        )}
        {status && <p className="text-sm text-forest-800">{status}</p>}
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-medium text-stone-700">Recordings</h2>
        {isLoading && <p className="text-stone-500">Loading…</p>}
        {!isLoading && (!recordings || recordings.length === 0) && (
          <p className="text-stone-500">No recordings yet. Capture your first soundscape above.</p>
        )}
        <ul className="space-y-4">
          {recordings?.map((r) => (
            <li key={r.id} className="rounded-lg border border-stone-200 p-4 dark:border-stone-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {new Date(r.recorded_at).toLocaleString()} · {r.duration_seconds}s
                  </div>
                  <div className="text-xs text-stone-500">
                    {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)} · {r.status}
                    {r.plantation_fence_id ? " · linked to site" : ""}
                  </div>
                </div>
                {r.status === "analyzed" && (
                  <button
                    className="btn-secondary text-sm"
                    disabled={analyzeMut.isPending}
                    onClick={() => analyzeMut.mutate({ id: r.id, force: true })}
                  >
                    Re-analyze
                  </button>
                )}
                {r.status !== "analyzed" && r.status !== "failed" && (
                  <button
                    className="btn-secondary text-sm"
                    disabled={analyzeMut.isPending || r.status === "queued" || r.status === "analyzing"}
                    onClick={() => analyzeMut.mutate({ id: r.id })}
                  >
                    {r.status === "queued" || r.status === "analyzing" ? "Analyzing…" : "Analyze"}
                  </button>
                )}
              </div>
              {r.status === "analyzed" && (
                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  <Metric label="Health score" value={`${r.bioacoustic_health_score ?? "—"}/100`} />
                  <Metric label="Shannon H′" value={String(r.shannon_diversity_index ?? "—")} />
                  <Metric label="Simpson D" value={String(r.simpson_diversity_index ?? "—")} />
                  <Metric label="Species" value={String(r.total_species_count ?? "—")} />
                  <Metric label="AI confidence" value={`${((r.ai_confidence_score ?? 0) * 100).toFixed(0)}%`} />
                </div>
              )}
              {r.status === "failed" && r.analysis_error && (
                <p className="mt-2 text-sm text-rose-700">{r.analysis_error}</p>
              )}
              {r.analysis_summary && (
                <p className="mt-2 text-sm text-stone-600">{r.analysis_summary}</p>
              )}
              {r.species_detections?.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {[...r.species_detections]
                    .sort((a, b) => {
                      if (a.taxon_group === "bird" && b.taxon_group !== "bird") return -1;
                      if (b.taxon_group === "bird" && a.taxon_group !== "bird") return 1;
                      return b.call_count - a.call_count;
                    })
                    .map((s) => (
                    <li
                      key={`${r.id}-${s.scientific_name}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm dark:bg-stone-900"
                    >
                      <div>
                        <span className="font-medium">{s.common_name}</span>
                        <span className="ml-2 text-stone-500 italic">{s.scientific_name}</span>
                        <span className="ml-2 text-xs uppercase text-stone-400">
                          {s.taxon_group}
                          {s.taxon_group !== "bird" ? " · experimental" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">
                          {s.call_count} calls · {(s.confidence * 100).toFixed(0)}%
                        </span>
                        <span className={`rounded px-2 py-0.5 text-xs ${iucnBadge(s.iucn_status)}`}>
                          {s.iucn_status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-semibold text-forest-800">{value}</div>
    </div>
  );
}
