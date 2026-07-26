"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, CircleDashed, ListChecks, Loader2 } from "lucide-react";
import {
  type ComplianceWorkflowStep,
  type ComplianceWorkflowStepStatus,
  compliance,
  plantingProjects,
} from "@/lib/api";
import { cn } from "@/lib/cn";

const STATUS_ICON: Record<ComplianceWorkflowStepStatus, typeof CheckCircle2> = {
  done: CheckCircle2,
  partial: CircleDashed,
  pending: Circle,
  skipped: Circle,
};

const STATUS_CLASS: Record<ComplianceWorkflowStepStatus, string> = {
  done: "text-emerald-600",
  partial: "text-amber-600",
  pending: "text-stone-400",
  skipped: "text-stone-300",
};

function nextActionableSteps(steps: ComplianceWorkflowStep[], limit = 3) {
  const required = steps.filter((s) => !s.optional);
  const open = required.filter((s) => s.status !== "done");
  return open.slice(0, limit);
}

export function ProjectComplianceWorkflowWidget({
  projectId,
  projectMetadata,
  onOpenCompliance,
}: {
  projectId: string;
  projectMetadata?: Record<string, unknown>;
  onOpenCompliance?: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
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
    },
  });

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 w-40 rounded bg-stone-200" />
        <div className="mt-3 h-2 rounded-full bg-stone-200" />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const upcoming = nextActionableSteps(data.steps);
  const surveyQuickFix = data.steps.find(
    (s) => s.id === "survey_cadence" && s.quick_fix?.survey_interval_days != null,
  );

  return (
    <div className="card border-forest-200/80 bg-gradient-to-r from-forest-50/60 to-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-forest-700" />
            <h2 className="text-sm font-semibold text-stone-900">Compliance readiness</h2>
            <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-medium text-forest-800">
              {data.recommended_checklist_label}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-600">
            {data.progress.done} of {data.progress.total} required steps complete
            {data.progress.partial > 0 ? ` · ${data.progress.partial} in progress` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-semibold text-forest-800">{data.progress.pct.toFixed(0)}%</p>
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={onOpenCompliance}>
            View workflow
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-forest-600 transition-all"
          style={{ width: `${data.progress.pct}%` }}
        />
      </div>

      {upcoming.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {upcoming.map((step) => {
            const Icon = STATUS_ICON[step.status];
            return (
              <li
                key={step.id}
                className="flex items-center gap-2 rounded-lg border border-stone-100 bg-white/80 px-3 py-2 text-xs"
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", STATUS_CLASS[step.status])} />
                <span className="min-w-0 flex-1 truncate font-medium text-stone-800">{step.title}</span>
                {step.metric ? (
                  <span className="hidden shrink-0 text-stone-500 sm:inline">{step.metric}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          All required steps complete — review the checklist and export reports.
        </p>
      )}

      {surveyQuickFix?.quick_fix?.survey_interval_days != null ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
          <p className="text-xs text-stone-600">Quick fix: save survey cadence for checklist auto-checks.</p>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={saveSurveyCadence.isPending}
            onClick={() => saveSurveyCadence.mutate(surveyQuickFix.quick_fix!.survey_interval_days)}
          >
            {saveSurveyCadence.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Save {surveyQuickFix.quick_fix.survey_interval_days}-day cadence
          </button>
        </div>
      ) : null}
    </div>
  );
}
