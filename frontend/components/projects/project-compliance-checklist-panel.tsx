"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Sparkles } from "lucide-react";
import {
  type ChecklistAnswer,
  type ChecklistCode,
  type ChecklistEligibilityStatus,
  compliance,
  errorMessage,
} from "@/lib/api";
import { cn } from "@/lib/cn";

const ANSWERS: { value: ChecklistAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
  { value: "na", label: "N/A" },
];

const STATUS_CLASS: Record<ChecklistEligibilityStatus, string> = {
  not_started: "bg-stone-100 text-stone-700",
  in_progress: "bg-blue-100 text-blue-900",
  eligible: "bg-green-100 text-green-900",
  gaps_identified: "bg-amber-100 text-amber-900",
  not_eligible: "bg-rose-100 text-rose-900",
};

const STATUS_LABEL: Record<ChecklistEligibilityStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  eligible: "Eligible (self-assessed)",
  gaps_identified: "Gaps identified",
  not_eligible: "Not eligible",
};

export function ProjectComplianceChecklistPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [checklistCode, setChecklistCode] = useState<ChecklistCode>("verra_vm0047");
  const [draft, setDraft] = useState<Record<string, { answer?: ChecklistAnswer; notes?: string }>>(
    {},
  );

  const { data: catalog = [] } = useQuery({
    queryKey: ["compliance-checklists"],
    queryFn: () => compliance.checklists(),
  });

  const {
    data: state,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["project-checklist", projectId, checklistCode],
    queryFn: () => compliance.projectChecklist(projectId, checklistCode),
  });

  useEffect(() => {
    if (!state) return;
    const next: Record<string, { answer?: ChecklistAnswer; notes?: string }> = {};
    for (const item of state.items) {
      if (item.answer || item.notes) {
        next[item.id] = {
          answer: item.answer ?? undefined,
          notes: item.notes ?? undefined,
        };
      }
    }
    setDraft(next);
  }, [state]);

  const save = useMutation({
    mutationFn: () => compliance.saveProjectChecklist(projectId, checklistCode, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-checklist", projectId, checklistCode] });
      qc.invalidateQueries({ queryKey: ["project-checklist-summaries", projectId] });
    },
  });

  const grouped = useMemo(() => {
    if (!state) return [];
    const map = new Map<string, typeof state.items>();
    for (const item of state.items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [state]);

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading eligibility checklist…</p>;
  }

  if (error) {
    return (
      <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        <p className="font-medium">Could not load checklist</p>
        <p>{errorMessage(error)}</p>
        <button type="button" className="btn-secondary text-xs" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-forest-700" />
            <h2 className="text-lg font-semibold">Eligibility checklist</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_CLASS[state.eligibility_status],
              )}
            >
              {STATUS_LABEL[state.eligibility_status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {state.checklist.framework_reference} · {state.answered_required}/{state.required_count}{" "}
            required answered
          </p>
        </div>
        <div className="min-w-[220px]">
          <label className="label text-xs">Checklist profile</label>
          <select
            className="input text-sm"
            value={checklistCode}
            onChange={(e) => setChecklistCode(e.target.value as ChecklistCode)}
          >
            {(catalog.length ? catalog : [state.checklist]).map((c) => (
              <option key={c.code} value={c.code}>
                {c.short_label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {state.checklist.disclaimer}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Completion" value={`${state.completion_pct.toFixed(0)}%`} />
        <Metric label="Readiness score" value={`${state.score_pct.toFixed(0)}%`} />
        <Metric
          label="Auto-checked"
          value={`${state.items.filter((i) => i.source === "auto").length}`}
        />
      </div>

      <p className="text-sm text-stone-600">{state.checklist.description}</p>

      <div className="space-y-4">
        {grouped.map(([category, items]) => (
          <div key={category} className="rounded-lg border border-stone-200">
            <div className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
              {category}
            </div>
            <ul className="divide-y divide-stone-100">
              {items.map((item) => {
                const current = draft[item.id]?.answer ?? item.answer ?? "";
                const notes = draft[item.id]?.notes ?? item.notes ?? "";
                return (
                  <li key={item.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900">{item.question}</p>
                        <p className="mt-1 text-xs text-stone-500">{item.guidance}</p>
                        {item.source === "auto" && (
                          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-forest-700">
                            <Sparkles className="h-3 w-3" />
                            Auto-checked from project data
                          </p>
                        )}
                      </div>
                      <select
                        className="input w-28 text-xs"
                        value={current}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              answer: e.target.value as ChecklistAnswer,
                            },
                          }))
                        }
                      >
                        <option value="">—</option>
                        {ANSWERS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      className="input text-xs"
                      placeholder="Notes (optional)"
                      value={notes}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], notes: e.target.value },
                        }))
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {state.gaps.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-medium text-amber-900">Gaps to address</p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {state.gaps.map((gap) => (
              <li key={gap.item_id}>
                <span className="font-medium capitalize">{gap.answer}</span> — {gap.question}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={save.isPending || isFetching}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save checklist"}
        </button>
        {save.error ? (
          <p className="text-xs text-rose-700">{errorMessage(save.error)}</p>
        ) : null}
        {state.updated_at ? (
          <p className="text-xs text-stone-500">
            Last saved {new Date(state.updated_at).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}
