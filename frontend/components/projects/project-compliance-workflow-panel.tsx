"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  ListChecks,
  Loader2,
  SkipForward,
} from "lucide-react";
import {
  type ComplianceWorkflowStep,
  type ComplianceWorkflowStepStatus,
  compliance,
  errorMessage,
  plantingProjects,
} from "@/lib/api";
import { cn } from "@/lib/cn";

const STATUS_ICON: Record<ComplianceWorkflowStepStatus, typeof CheckCircle2> = {
  done: CheckCircle2,
  partial: CircleDashed,
  pending: Circle,
  skipped: SkipForward,
};

const STATUS_CLASS: Record<ComplianceWorkflowStepStatus, string> = {
  done: "text-emerald-600",
  partial: "text-amber-600",
  pending: "text-stone-300",
  skipped: "text-stone-400",
};

type ProjectTab = "overview" | "compliance" | "credits" | "trees" | "team" | "settings";

export function ProjectComplianceWorkflowPanel({
  projectId,
  projectMetadata,
  onNavigateTab,
  onScrollToAnchor,
  onSelectChecklist,
}: {
  projectId: string;
  projectMetadata?: Record<string, unknown>;
  onNavigateTab?: (tab: ProjectTab) => void;
  onScrollToAnchor?: (anchor: string) => void;
  onSelectChecklist?: (code: string) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["compliance-workflow", projectId],
    queryFn: () => compliance.projectWorkflow(projectId),
  });

  const saveSurveyCadence = useMutation({
    mutationFn: (days: number) =>
      plantingProjects.update(projectId, {
        metadata: {
          ...projectMetadata,
          survey_interval_days: days === 15 ? 15 : 30,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-workflow", projectId] });
      qc.invalidateQueries({ queryKey: ["planting-project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-checklist", projectId] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading compliance workflow…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        <p className="font-medium">Could not load workflow</p>
        <p className="mt-1">{errorMessage(error)}</p>
        <button type="button" className="btn-secondary mt-2 text-xs" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  function handleStepAction(step: ComplianceWorkflowStep) {
    if (step.action_anchor === "checklist" && step.recommended_checklist && onSelectChecklist) {
      onSelectChecklist(step.recommended_checklist);
    }
    if (step.action_tab && onNavigateTab) {
      onNavigateTab(step.action_tab as ProjectTab);
    }
    if (step.action_anchor && onScrollToAnchor) {
      window.setTimeout(() => onScrollToAnchor(step.action_anchor!), 150);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-forest-200 bg-gradient-to-br from-forest-50/80 to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-forest-700" />
            <h2 className="text-lg font-semibold text-stone-900">Compliance readiness</h2>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {data.progress.done} of {data.progress.total} required steps complete
            {data.progress.partial > 0 ? ` · ${data.progress.partial} in progress` : ""}
            {" · "}
            Recommended: <strong>{data.recommended_checklist_label}</strong>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-forest-800">{data.progress.pct.toFixed(0)}%</p>
          <p className="text-xs text-stone-500">readiness</p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-forest-600 transition-all"
          style={{ width: `${data.progress.pct}%` }}
        />
      </div>

      <ol className="space-y-2">
        {data.steps.map((step, index) => {
          const Icon = STATUS_ICON[step.status];
          const href = step.action_href;
          const content = (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 transition",
                step.status === "done"
                  ? "border-emerald-200/80 bg-emerald-50/50"
                  : step.status === "partial"
                    ? "border-amber-200/80 bg-amber-50/40"
                    : step.optional
                      ? "border-stone-200 bg-stone-50/50"
                      : "border-stone-200 bg-white hover:border-forest-200",
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", STATUS_CLASS[step.status])} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-stone-900">
                    {index + 1}. {step.title}
                  </p>
                  {step.optional ? (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase text-stone-500">
                      Optional
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-stone-500">{step.description}</p>
                {step.metric ? (
                  <p className="mt-1 text-xs font-medium text-stone-600">{step.metric}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {href ? (
                    <Link href={href} className="btn-secondary text-xs">
                      {step.action_label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => handleStepAction(step)}
                    >
                      {step.action_label}
                    </button>
                  )}
                  {step.quick_fix?.survey_interval_days != null ? (
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={saveSurveyCadence.isPending}
                      onClick={() =>
                        saveSurveyCadence.mutate(step.quick_fix!.survey_interval_days)
                      }
                    >
                      {saveSurveyCadence.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Save {step.quick_fix.survey_interval_days}-day cadence
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );

          return <li key={step.id}>{content}</li>;
        })}
      </ol>
    </div>
  );
}
