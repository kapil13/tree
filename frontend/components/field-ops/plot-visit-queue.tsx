"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3X3, MapPin } from "lucide-react";
import { errorMessage, plotMonitoring, type PlotMonitoringPlot } from "@/lib/api";
import { useProjectContext } from "@/lib/project-context";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";

type PlotWithProject = PlotMonitoringPlot & {
  project_id: string;
  project_name: string;
};

export function PlotVisitQueue() {
  const { user } = useAuth();
  const { projects, projectId } = useProjectContext();
  const qc = useQueryClient();
  const [activePlot, setActivePlot] = useState<PlotWithProject | null>(null);
  const [notes, setNotes] = useState("");

  const scopedProjects = useMemo(
    () => (projectId ? projects.filter((p) => p.id === projectId) : projects),
    [projectId, projects],
  );

  const plotsQ = useQuery({
    queryKey: scopedKey(user, "plot-visit-queue", projectId ?? "all"),
    queryFn: async () => {
      const rows: PlotWithProject[] = [];
      for (const project of scopedProjects) {
        const summary = await plotMonitoring.summary(project.id);
        if (!summary.has_design || summary.mode === "full_census") continue;
        const plots = await plotMonitoring.listPlots(project.id);
        for (const plot of plots) {
          if (plot.status === "visited") continue;
          rows.push({ ...plot, project_id: project.id, project_name: project.name });
        }
      }
      return rows;
    },
    enabled: scopedProjects.length > 0,
  });

  const recordVisit = useMutation({
    mutationFn: () =>
      plotMonitoring.createVisit(activePlot!.id, {
        notes: notes.trim() || undefined,
        observations: [{ alive: true }],
      }),
    onSuccess: () => {
      setActivePlot(null);
      setNotes("");
      void qc.invalidateQueries({ queryKey: scopedKey(user, "plot-visit-queue") });
      void qc.invalidateQueries({ queryKey: scopedKey(user, "field-brief") });
    },
  });

  const duePlots = plotsQ.data ?? [];

  if (scopedProjects.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
          <Grid3X3 className="h-4 w-4 text-forest-700" />
          Plot visits due
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Stratified monitoring plots waiting for a field visit
        </p>
      </div>
      {plotsQ.isLoading ? (
        <p className="px-4 py-6 text-sm text-stone-500">Loading plots…</p>
      ) : duePlots.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500">All assigned plots are visited for the current scope.</p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {duePlots.slice(0, 8).map((plot) => (
            <li key={plot.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-stone-900 dark:text-stone-50">{plot.plot_code}</p>
                <p className="text-xs text-stone-500">{plot.project_name}</p>
                <p className="mt-1 text-xs text-stone-500">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {plot.center.coordinates[1].toFixed(5)}, {plot.center.coordinates[0].toFixed(5)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/projects/${plot.project_id}`} className="btn-secondary text-xs">
                  Open project
                </Link>
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={() => {
                    setActivePlot(plot);
                    setNotes("");
                  }}
                >
                  Record visit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {activePlot ? (
        <div className="border-t border-stone-100 px-4 py-4 dark:border-stone-800">
          <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
            Visit {activePlot.plot_code}
          </p>
          <textarea
            className="input mt-2 w-full text-sm"
            rows={3}
            placeholder="Field notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={recordVisit.isPending}
              onClick={() => recordVisit.mutate()}
            >
              {recordVisit.isPending ? "Saving…" : "Submit visit"}
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setActivePlot(null)}>
              Cancel
            </button>
          </div>
          {recordVisit.error ? (
            <p className="mt-2 text-xs text-rose-700">{errorMessage(recordVisit.error)}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
