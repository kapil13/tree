"use client";

import { ChevronDown, FolderKanban } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProjectContext } from "@/lib/project-context";
import { cn } from "@/lib/cn";

export function ProjectContextChip({ className }: { className?: string }) {
  const tc = useTranslations("chrome");
  const { projectId, setProjectId, projects, selectedProject, isLoading } = useProjectContext();

  if (isLoading && projects.length === 0) {
    return null;
  }

  if (projects.length === 0) {
    return null;
  }

  const label = selectedProject?.name ?? tc("allProjects");

  return (
    <div className={cn("relative min-w-0 max-w-[11rem] sm:max-w-[14rem]", className)}>
      <label className="sr-only" htmlFor="project-context-select">{tc("projectContext")}</label>
      <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
        <FolderKanban className="h-3.5 w-3.5" aria-hidden />
      </div>
      <select
        id="project-context-select"
        className="w-full appearance-none truncate rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-8 pr-8 text-xs font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        value={projectId ?? ""}
        onChange={(e) => setProjectId(e.target.value || null)}
        title={label}
      >
        <option value="">{tc("allProjects")}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
        aria-hidden
      />
    </div>
  );
}
