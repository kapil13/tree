"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Square, Waves } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { bioacoustic, errorMessage } from "@/lib/api";

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
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: recordings, isLoading } = useQuery({
    queryKey: ["bioacoustic-recordings"],
    queryFn: bioacoustic.list,
  });

  const analyzeMut = useMutation({
    mutationFn: (id: string) => bioacoustic.analyze(id),
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
            // fallback Hyderabad
          }

          const duration = Math.max(elapsed, MIN_SECONDS);
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          form.append("duration_seconds", String(duration));
          form.append("latitude", String(lat));
          form.append("longitude", String(lon));

          const rec = await bioacoustic.uploadDirect(form);
          setStatus("Analyzing biodiversity…");
          await bioacoustic.analyze(rec.id);
          setStatus("Recording analyzed successfully.");
          qc.invalidateQueries({ queryKey: ["bioacoustic-recordings"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
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
  }, [elapsed, qc, stopRecording]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bioacoustic monitoring</h1>
        <p className="mt-1 text-sm text-stone-600">
          Record 30–60 seconds of ambient sound. AI identifies wildlife, validates IUCN status, and
          computes Shannon diversity and a bioacoustic health score.
        </p>
      </div>

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
                  </div>
                </div>
                {r.status !== "analyzed" && (
                  <button
                    className="btn-secondary text-sm"
                    disabled={analyzeMut.isPending}
                    onClick={() => analyzeMut.mutate(r.id)}
                  >
                    Analyze
                  </button>
                )}
              </div>
              {r.status === "analyzed" && (
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <Metric label="Health score" value={`${r.bioacoustic_health_score ?? "—"}/100`} />
                  <Metric label="Shannon H′" value={String(r.shannon_diversity_index ?? "—")} />
                  <Metric label="Species" value={String(r.total_species_count ?? "—")} />
                  <Metric label="AI confidence" value={`${((r.ai_confidence_score ?? 0) * 100).toFixed(0)}%`} />
                </div>
              )}
              {r.analysis_summary && (
                <p className="mt-2 text-sm text-stone-600">{r.analysis_summary}</p>
              )}
              {r.species_detections?.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {r.species_detections.map((s) => (
                    <li
                      key={`${r.id}-${s.scientific_name}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm dark:bg-stone-900"
                    >
                      <div>
                        <span className="font-medium">{s.common_name}</span>
                        <span className="ml-2 text-stone-500 italic">{s.scientific_name}</span>
                        <span className="ml-2 text-xs uppercase text-stone-400">{s.taxon_group}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">
                          {s.call_count} calls · {(s.confidence * 100).toFixed(0)}%
                        </span>
                        <span className={`rounded px-2 py-0.5 text-xs ${iucnBadge(s.iucn_status)}`}>
                          {s.iucn_status}
                        </span>
                        {s.iucn_url && (
                          <a
                            href={s.iucn_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-forest-700 underline"
                          >
                            IUCN
                          </a>
                        )}
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
