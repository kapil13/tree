"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { errorMessage, plantingProjects } from "@/lib/api";

export function ProjectNprtAssessmentPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [score, setScore] = useState("50");
  const [notes, setNotes] = useState("");

  const history = useQuery({
    queryKey: ["project-risk", projectId],
    queryFn: () => plantingProjects.listRiskAssessments(projectId),
  });

  const create = useMutation({
    mutationFn: () =>
      plantingProjects.createRiskAssessment(projectId, {
        nprt_score: Number(score),
        notes: notes || undefined,
        factors: { fire_risk: Number(score), drought_risk: Number(score) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-risk", projectId] });
      qc.invalidateQueries({ queryKey: ["credit-ledger", projectId] });
      setNotes("");
    },
  });

  const latest = history.data?.[0];

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-700">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-700" />
        <h3 className="text-sm font-medium text-stone-800">NPRT risk assessment</h3>
      </div>
      <p className="mb-3 text-xs text-stone-500">
        Non-Permanence Risk Tool score (0–100) maps to a dynamic buffer of 10–30% on project credits.
      </p>
      {latest ? (
        <p className="mb-3 text-xs text-stone-600">
          Latest: score <strong>{latest.nprt_score}</strong> → buffer{" "}
          <strong>{(latest.buffer_pct * 100).toFixed(0)}%</strong> (
          {new Date(latest.assessed_at).toLocaleString()})
        </p>
      ) : (
        <p className="mb-3 text-xs text-stone-500">No assessment yet — using methodology default (20%).</p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs">NPRT score (0–100)</label>
          <input
            className="input mt-1 w-28"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="label text-xs">Notes (optional)</label>
          <input
            className="input mt-1 w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fire, drought, tenure…"
          />
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Saving…" : "Save assessment"}
        </button>
      </div>
      {create.error ? <p className="mt-2 text-xs text-rose-700">{errorMessage(create.error)}</p> : null}
    </div>
  );
}
