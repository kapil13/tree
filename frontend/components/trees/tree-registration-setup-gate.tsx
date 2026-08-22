"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { PlantingProject } from "@/lib/api";
import type { ProjectSetupStatus } from "@/lib/project-setup-readiness";
import { projectSetupHref } from "@/lib/project-focused-ui";
import { cn } from "@/lib/cn";

type Props = {
  project: PlantingProject;
  status: ProjectSetupStatus;
};

export function TreeRegistrationSetupGate({ project, status }: Props) {
  return (
    <div className="card mx-auto max-w-3xl space-y-4 border-amber-200 bg-amber-50/80">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-amber-950">Finish project setup first</h2>
          <p className="text-sm text-amber-900">
            Tree registration for <strong>{project.name}</strong> needs a few one-time settings.
            You will only enter GPS, photos, and species per tree — not permit or legal fields
            again.
          </p>
          {status.blockReason && (
            <p className="text-sm font-medium text-amber-950">{status.blockReason}</p>
          )}
        </div>
      </div>

      <ol className="space-y-2">
        {status.steps
          .filter((step) => step.required)
          .map((step) => (
            <li
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2 text-sm",
                step.complete
                  ? "border-green-200 bg-green-50/80 text-green-900"
                  : "border-amber-200 bg-white/80 text-amber-950",
              )}
            >
              {step.complete ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{step.label}</p>
                {step.description && (
                  <p className="text-xs opacity-80">{step.description}</p>
                )}
              </div>
              {!step.complete && step.href && (
                <Link href={step.href} className="shrink-0 text-xs font-semibold text-forest-800 underline">
                  Fix
                </Link>
              )}
            </li>
          ))}
      </ol>

      <Link
        href={projectSetupHref(project.id)}
        className="btn-primary inline-flex"
      >
        Open project setup
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
