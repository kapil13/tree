"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Mic, Square, Waves } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { bioacoustic, errorMessage, plantationFences, type BioacousticRecording, type EcoacousticIndices } from "@/lib/api";

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
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
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
          setStatus("Running biodiversity assessment (noise filter → spectrogram → AI)…");
          await bioacoustic.analyze(rec.id);
          setStatus("Assessment complete — metrics stored with GPS and confidence scores.");
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
          const v = (data[i] - 128) / 128;
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
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [elapsed, fenceId, qc, stopRecording, stopSplMonitor]);

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
        <h1 className="text-2xl font-semibold">Biodiversity Assessment Engine</h1>
        <p className="mt-1 text-sm text-stone-600">
          Convert short ambient environmental recordings into scientifically meaningful biodiversity metrics.
          Record 60–180 seconds of soundscape (not voice). <strong>BirdNET</strong> identifies birds;
          <strong>Perch v2</strong> (when enabled) covers amphibians, mammals, insects, and reptiles.
          GBIF and IUCN enrich detections with regional context and conservation status.
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
            Link assessments to a site for MRV reports, NDVI correlation, and carbon-credit evidence.
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
            <Metric label="Biodiversity health" value={`${ecosystem.bioacoustic.avg_health_score}/100`} />
            <Metric label="NDVI" value={ecosystem.ndvi_mean?.toFixed(2) ?? "—"} />
            <Metric label="Correlation" value={ecosystem.correlation_score?.toFixed(2) ?? "—"} />
          </div>
          <p className="mt-3 text-sm text-stone-600">{ecosystem.interpretation}</p>
        </div>
      )}

      {regionalFauna && (
        <div className="card">
          <h2 className="mb-2 text-sm font-medium text-stone-700">
            Expected fauna at site (GBIF + IUCN)
          </h2>
          <p className="mb-3 text-xs text-stone-500">
            {regionalFauna.species_count} species reported within {regionalFauna.radius_km} km
            {regionalFauna.iucn_live ? " · live IUCN API" : " · IUCN catalog fallback"}
          </p>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
            {regionalFauna.species.slice(0, 12).map((s) => (
              <li key={s.gbif_usage_key} className="flex justify-between gap-2">
                <span>
                  {s.common_name}{" "}
                  <span className="text-stone-400 italic">{s.scientific_name}</span>
                </span>
                <span className="shrink-0 text-xs text-stone-500">
                  {s.occurrence_count} obs · {s.iucn_status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card flex flex-col items-center gap-4 py-8">
        <Waves className="h-10 w-10 text-forest-700" />
        <div className="text-3xl font-mono tabular-nums">{elapsed}s</div>
        <p className="text-sm text-stone-500">
          Target: {MIN_SECONDS}–{MAX_SECONDS} seconds ({PREFERRED_SECONDS}s preferred) · mono ambient soundscape
        </p>
        {(recording || approxSpl > 0) && (
          <div className="text-center">
            <p className="text-sm font-medium text-stone-700">
              Ambient SPL ≈ {approxSpl.toFixed(0)} dB
            </p>
            {noiseWarning && (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                High noise — traffic, wind, or machinery may reduce identification accuracy
              </p>
            )}
          </div>
        )}
        {!recording ? (
          <button className="btn-primary flex items-center gap-2" onClick={startRecording}>
            <Mic className="h-4 w-4" />
            Start ambient recording
          </button>
        ) : (
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={stopRecording}
            disabled={elapsed < MIN_SECONDS}
          >
            <Square className="h-4 w-4" />
            {elapsed < MIN_SECONDS ? `Stop (${MIN_SECONDS - elapsed}s min)` : "Stop & assess"}
          </button>
        )}
        {status && <p className="text-sm text-forest-800">{status}</p>}
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-medium text-stone-700">Assessment history</h2>
        {isLoading && <p className="text-stone-500">Loading…</p>}
        {!isLoading && (!recordings || recordings.length === 0) && (
          <p className="text-stone-500">No assessments yet. Capture your first ambient soundscape above.</p>
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
                      className="btn-secondary text-sm"
                      disabled={analyzeMut.isPending}
                      onClick={() => analyzeMut.mutate({ id: r.id, force: true })}
                    >
                      Re-assess
                    </button>
                  )}
                  {r.status !== "analyzed" && r.status !== "failed" && (
                    <button
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
                    <div className="mt-3 grid gap-3 md:grid-cols-5">
                      <Metric label="Biodiversity score" value={`${r.bioacoustic_health_score ?? "—"}/100`} />
                      <Metric label="Species richness" value={String(speciesRichness(r))} />
                      <Metric label="Shannon H′" value={String(r.shannon_diversity_index ?? "—")} />
                      <Metric label="Simpson D" value={String(r.simpson_diversity_index ?? "—")} />
                      <Metric label="AI confidence" value={`${((r.ai_confidence_score ?? 0) * 100).toFixed(0)}%`} />
                    </div>
                    {(spl || eco) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    )}
                  </>
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
