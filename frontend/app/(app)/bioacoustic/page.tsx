"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  bioacoustic,
  errorMessage,
  plantationFences,
  type BioacousticRecording,
  type EcoacousticIndices,
} from "@/lib/api";

const MIN_SECONDS = 60;
const MAX_SECONDS = 180;
const PREFERRED_SECONDS = 120;
const SPL_WARNING_DB = 62;

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

function splMetrics(rec: BioacousticRecording) {
  return rec.preprocessing?.spl_metrics;
}

function ecoacousticIndices(rec: BioacousticRecording): EcoacousticIndices | undefined {
  const fromPre = rec.preprocessing?.ecoacoustic_indices;
  if (fromPre) return fromPre;
  return undefined;
}

function analysisPipeline(rec: BioacousticRecording): string | undefined {
  const fromPre = rec.preprocessing?.analysis_pipeline;
  if (typeof fromPre === "string") return fromPre;
  return rec.species_detections?.[0]?.pipeline_source;
}

function speciesRichness(rec: BioacousticRecording) {
  const aboveThreshold = rec.species_detections?.filter((s) => !s.needs_review && s.confidence >= 0.7);
  return aboveThreshold?.length ?? rec.total_species_count ?? 0;
}

export default function BioacousticPage() {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [approxSpl, setApproxSpl] = useState(0);
  const [noiseWarning, setNoiseWarning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fenceId, setFenceId] = useState<string>("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const splIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: fences } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list({ page_size: 100 }),
  });

  const { data: ecosystem } = useQuery({
    queryKey: ["ecosystem-health", fenceId],
    queryFn: () => plantationFences.ecosystemHealth(fenceId),
    enabled: Boolean(fenceId),
  });

  const { data: regionalFauna } = useQuery({
    queryKey: ["regional-fauna"],
    queryFn: async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
        );
        return bioacoustic.regionalFauna(pos.coords.latitude, pos.coords.longitude);
      } catch {
        return bioacoustic.regionalFauna(17.385, 78.4867);
      }
    },
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

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      splIntervalRef.current && clearInterval(splIntervalRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  const stopSplMonitor = useCallback(() => {
    splIntervalRef.current && clearInterval(splIntervalRef.current);
    splIntervalRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;
    stopSplMonitor();
    mediaRef.current?.stop();
    setRecording(false);
  }, [stopSplMonitor]);

  const startRecording = useCallback(async () => {
    setError(null);
    setStatus(null);
    setApproxSpl(0);
    setNoiseWarning(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopSplMonitor();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setStatus("Uploading ambient recording…");
        try {
          let lat = 17.385;
          let lon = 78.4867;
          try {
            const pos = await new Promise<GeolocationPosition>((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
            );
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          } catch {
            // fallback
          }

          const duration = Math.max(elapsedRef.current, MIN_SECONDS);
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          form.append("duration_seconds", String(duration));
          form.append("latitude", String(lat));
          form.append("longitude", String(lon));
          if (fenceId) form.append("plantation_fence_id", fenceId);

          const rec = await bioacoustic.uploadDirect(form);
          setStatus("Analyzing soundscape…");
          await bioacoustic.analyze(rec.id);
          setStatus("Assessment complete.");
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
      elapsedRef.current = 0;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      splIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i]! - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const dbfs = 20 * Math.log10(rms + 1e-12);
        const approx = dbfs + 90;
        setApproxSpl(approx);
        setNoiseWarning(approx >= SPL_WARNING_DB);
      }, 300);

      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          elapsedRef.current = next;
          if (next >= MAX_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [fenceId, qc, stopRecording, stopSplMonitor]);

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
      <PageHeader
        title="Biodiversity"
        description="Record a short ambient soundscape (not voice) to detect species and track site health."
      />

      <section className="relative overflow-hidden rounded-3xl border border-forest-200 bg-gradient-to-br from-forest-800 via-forest-700 to-emerald-800 px-6 py-10 text-center text-white shadow-sm sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200/90">
          Field recording
        </p>
        <div className="mt-4 font-mono text-5xl tabular-nums tracking-tight sm:text-6xl">
          {elapsed}s
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm text-emerald-50/85">
          Aim for {MIN_SECONDS}–{MAX_SECONDS} seconds ({PREFERRED_SECONDS}s preferred). Hold the phone
          still and capture ambient nature sound.
        </p>

        <div className="mx-auto mt-5 max-w-sm text-left">
          <label className="mb-1 block text-xs font-medium text-emerald-100/90">
            Plantation site (optional)
          </label>
          <select
            className="input w-full border-0 bg-white/95 text-stone-900"
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
        </div>

        {(recording || approxSpl > 0) && (
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-emerald-50">
              Ambient level ≈ {approxSpl.toFixed(0)} dB
            </p>
            {noiseWarning && (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-amber-100">
                <AlertTriangle className="h-3.5 w-3.5" />
                High noise — traffic, wind, or machinery may reduce accuracy
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          {!recording ? (
            <button
              type="button"
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white text-forest-800 shadow-lg transition hover:scale-105 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => void startRecording()}
              aria-label="Start ambient recording"
            >
              <Mic className="h-9 w-9" />
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:bg-rose-600 disabled:opacity-50"
              onClick={stopRecording}
              disabled={elapsed < MIN_SECONDS}
              aria-label={elapsed < MIN_SECONDS ? `Stop after ${MIN_SECONDS - elapsed}s` : "Stop and assess"}
            >
              <Square className="h-8 w-8 fill-current" />
            </button>
          )}
        </div>
        <p className="mt-3 text-sm font-medium text-emerald-50">
          {!recording
            ? "Tap to record"
            : elapsed < MIN_SECONDS
              ? `Recording… ${MIN_SECONDS - elapsed}s until you can stop`
              : "Tap to stop & assess"}
        </p>
        {status && <p className="mt-3 text-sm text-emerald-100">{status}</p>}
        {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}

        {fenceId && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/25 hover:bg-white/20"
              onClick={() => void downloadReport("biodiversity")}
            >
              Biodiversity PDF
            </button>
            <button
              type="button"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/25 hover:bg-white/20"
              onClick={() => void downloadReport("esg")}
            >
              ESG PDF
            </button>
          </div>
        )}
      </section>

      {ecosystem && (
        <div className="card">
          <h2 className="mb-3 text-sm font-medium text-stone-700">
            Ecosystem health — {ecosystem.fence_name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Ecosystem score" value={`${ecosystem.ecosystem_health_score}/100`} />
            <Metric label="Biodiversity health" value={`${ecosystem.bioacoustic.avg_health_score}/100`} />
            <Metric label="NDVI" value={ecosystem.ndvi_mean?.toFixed(2) ?? "—"} />
            <Metric label="Correlation" value={ecosystem.correlation_score?.toFixed(2) ?? "—"} />
          </div>
          <p className="mt-3 text-sm text-stone-600">{ecosystem.interpretation}</p>
        </div>
      )}

      <details className="card group">
        <summary className="cursor-pointer text-sm font-medium text-stone-800">
          Details — Shannon, Simpson, GBIF & IUCN
        </summary>
        <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
          <p className="text-xs text-stone-500">
            Diversity indices and regional fauna context for deeper analysis. Day-to-day field work
            only needs the Record control above.
          </p>
          {regionalFauna ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-stone-700">
                Expected fauna nearby (GBIF + IUCN)
              </h3>
              <p className="mb-3 text-xs text-stone-500">
                {regionalFauna.species_count} species reported within {regionalFauna.radius_km} km
                {regionalFauna.iucn_live ? " · live IUCN" : " · IUCN catalog fallback"}
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {regionalFauna.species.slice(0, 12).map((s) => (
                  <li key={s.gbif_usage_key} className="flex justify-between gap-2">
                    <span>
                      {s.common_name}{" "}
                      <span className="italic text-stone-400">{s.scientific_name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-stone-500">
                      {s.occurrence_count} obs · {s.iucn_status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Loading regional fauna…</p>
          )}
        </div>
      </details>

      <div className="card">
        <h2 className="mb-4 text-sm font-medium text-stone-700">Assessment history</h2>
        {isLoading && <p className="text-stone-500">Loading…</p>}
        {!isLoading && (!recordings || recordings.length === 0) && (
          <EmptyState
            icon={Mic}
            title="No assessments yet"
            description="Tap Record above to capture your first ambient soundscape."
          />
        )}
        <ul className="space-y-4">
          {recordings?.map((r) => {
            const spl = splMetrics(r);
            const eco = ecoacousticIndices(r);
            return (
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
                      type="button"
                      className="btn-secondary text-sm"
                      disabled={analyzeMut.isPending}
                      onClick={() => analyzeMut.mutate({ id: r.id, force: true })}
                    >
                      Re-assess
                    </button>
                  )}
                  {r.status !== "analyzed" && r.status !== "failed" && (
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      disabled={analyzeMut.isPending || r.status === "queued" || r.status === "analyzing"}
                      onClick={() => analyzeMut.mutate({ id: r.id })}
                    >
                      {r.status === "queued" || r.status === "analyzing" ? "Assessing…" : "Assess"}
                    </button>
                  )}
                </div>
                {r.status === "analyzed" && (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Metric label="Biodiversity score" value={`${r.bioacoustic_health_score ?? "—"}/100`} />
                      <Metric label="Species richness" value={String(speciesRichness(r))} />
                      <Metric label="AI confidence" value={`${((r.ai_confidence_score ?? 0) * 100).toFixed(0)}%`} />
                    </div>
                    <details className="mt-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3 text-sm dark:border-stone-700 dark:bg-stone-900/40">
                      <summary className="cursor-pointer font-medium text-stone-700">
                        Diversity indices & acoustic detail
                      </summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Metric label="Shannon H′" value={String(r.shannon_diversity_index ?? "—")} />
                        <Metric label="Simpson D" value={String(r.simpson_diversity_index ?? "—")} />
                        {spl && (
                          <>
                            <Metric label="Avg SPL (approx)" value={`${spl.avg_db_spl_approx ?? "—"} dB`} />
                            <Metric label="SNR (approx)" value={`${spl.snr_db_approx ?? "—"} dB`} />
                          </>
                        )}
                        {eco && (
                          <>
                            <Metric label="ACI" value={eco.acoustic_complexity_index?.toFixed(1) ?? "—"} />
                            <Metric label="NDSI" value={eco.ndsi?.toFixed(2) ?? "—"} />
                            <Metric label="ADI" value={eco.acoustic_diversity_index?.toFixed(2) ?? "—"} />
                            <Metric label="Bioacoustic index" value={eco.bioacoustic_index?.toFixed(2) ?? "—"} />
                          </>
                        )}
                      </div>
                    </details>
                  </>
                )}
                {r.status === "failed" && r.analysis_error && (
                  <p className="mt-2 text-sm text-rose-700">{r.analysis_error}</p>
                )}
                {r.analysis_summary && (
                  <p className="mt-2 text-sm text-stone-600">{r.analysis_summary}</p>
                )}
                {r.status === "analyzed" && analysisPipeline(r) === "stub-bioacoustic-v1" && (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    This assessment used the development stub engine, not the live bird ID model.
                  </p>
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
                            <span className="ml-2 italic text-stone-500">{s.scientific_name}</span>
                            <span className="ml-2 text-xs uppercase text-stone-400">
                              {s.taxon_group}
                              {s.is_native && " · native"}
                              {s.regional_occurrence_match === true && " · GBIF site match"}
                              {s.needs_review && " · needs review (<70%)"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">
                              {s.call_count} detections · {(s.confidence * 100).toFixed(0)}%
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
            );
          })}
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
