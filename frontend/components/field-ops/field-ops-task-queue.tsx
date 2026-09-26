"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  MapPin,
  ShieldAlert,
  TreePine,
} from "lucide-react";
import { violationActionHref } from "@/lib/compliance-violation-links";
import { projectSecondaryHref } from "@/lib/project-focused-ui";
import { survivalDueTreesHref } from "@/lib/trees-registry-links";
import { cn } from "@/lib/cn";

export type FieldOpsTaskKind =
  | "violation"
  | "survival"
  | "project"
  | "audit"
  | "closure"
  | "workflow";

export type FieldOpsTask = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warning" | "info";
  kind: FieldOpsTaskKind;
};

type FieldOpsSummary = {
  projects: Array<{
    id: string;
    name: string;
    code: string;
    open_violations: number;
    survival_due: number;
    audit_plots_due?: number;
  }>;
  recent_violations: Array<{
    id: string;
    project_id: string;
    project_name: string;
    severity: string;
    message: string;
    tree_id?: string | null;
  }>;
  priority_tasks?: Array<{
    id: string;
    kind: FieldOpsTaskKind;
    title: string;
    detail: string;
    href: string;
    tone: "critical" | "warning" | "info";
    project_id?: string;
  }>;
};

export function buildFieldOpsTasks(summary: FieldOpsSummary): FieldOpsTask[] {
  if (summary.priority_tasks && summary.priority_tasks.length > 0) {
    return summary.priority_tasks.map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.detail,
      href: task.href,
      tone: task.tone,
      kind: task.kind,
    }));
  }

  const tasks: FieldOpsTask[] = [];

  for (const violation of summary.recent_violations.slice(0, 8)) {
    tasks.push({
      id: `violation-${violation.id}`,
      title: violation.project_name,
      detail: violation.message,
      href: violationActionHref(violation.project_id, violation.tree_id),
      tone:
        violation.severity === "critical" || violation.severity === "high"
          ? "critical"
          : "warning",
      kind: "violation",
    });
  }

  for (const project of summary.projects) {
    const auditDue = project.audit_plots_due ?? 0;
    if (auditDue > 0) {
      tasks.push({
        id: `audit-${project.id}`,
        title: project.name,
        detail: `${auditDue} audit plot visit${auditDue === 1 ? "" : "s"} due`,
        href: "/field-ops?section=audit",
        tone: "warning",
        kind: "audit",
      });
    }

    if (project.survival_due > 0) {
      tasks.push({
        id: `survival-${project.id}`,
        title: project.name,
        detail: `${project.survival_due} survival / geotag check${project.survival_due === 1 ? "" : "s"} due`,
        href: survivalDueTreesHref(project.id),
        tone: "warning",
        kind: "survival",
      });
    }

    if (project.open_violations > 0 && tasks.length < 12) {
      const alreadyListed = tasks.some(
        (task) => task.kind === "violation" && task.title === project.name,
      );
      if (!alreadyListed) {
        tasks.push({
          id: `compliance-${project.id}`,
          title: project.name,
          detail: `${project.open_violations} open compliance violation${project.open_violations === 1 ? "" : "s"}`,
          href: projectSecondaryHref(project.id, "compliance"),
          tone: "critical",
          kind: "violation",
        });
      }
    }
  }

  return tasks.slice(0, 12);
}

function TaskIcon({ kind }: { kind: FieldOpsTask["kind"] }) {
  if (kind === "violation") return <AlertTriangle className="h-4 w-4" />;
  if (kind === "closure") return <ShieldAlert className="h-4 w-4" />;
  if (kind === "workflow") return <ListChecks className="h-4 w-4" />;
  if (kind === "audit") return <ClipboardCheck className="h-4 w-4" />;
  if (kind === "survival") return <MapPin className="h-4 w-4" />;
  return <TreePine className="h-4 w-4" />;
}

export function FieldOpsTaskQueue({ tasks }: { tasks: FieldOpsTask[] }) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
          <ClipboardList className="h-4 w-4 text-forest-700" />
          Task queue
        </div>
        <p className="mt-2 text-sm text-stone-600">
          No open violations or survival checks right now. Register trees or review projects when work resumes.
        </p>
        <Link href="/trees/new" className="btn-primary mt-3 inline-flex text-xs">
          Register a tree
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
          <ClipboardList className="h-4 w-4 text-forest-700" />
          Task queue
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Violations, closure alerts, audit visits, and survival checks across your projects
        </p>
      </div>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={task.href}
              className="flex items-start gap-3 px-4 py-3 transition hover:bg-stone-50 dark:hover:bg-stone-950/40"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  task.tone === "critical"
                    ? "bg-rose-100 text-rose-800"
                    : task.tone === "warning"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-sky-100 text-sky-900",
                )}
              >
                <TaskIcon kind={task.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-stone-900 dark:text-stone-50">{task.title}</span>
                <span className="mt-0.5 block text-sm text-stone-600 dark:text-stone-300">{task.detail}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-forest-700">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
