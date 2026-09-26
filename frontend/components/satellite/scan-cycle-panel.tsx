"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { plantingProjects } from "@/lib/api";

export function ScanCyclePanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["scan-cycle"],
    queryFn: () => plantingProjects.scanCycle(),
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading scan cycle…</p>;
  }
  if (isError || !data) {
    return null;
  }

  const registry = data.registry as {
    enrolled_trees?: number;
    due_now?: number;
    watch_work_areas?: number;
    distinct_scan_tiles?: number;
  };

  const staleJobs = data.scheduled_jobs.filter((j) => j.stale);

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
        <CalendarClock className="h-4 w-4 text-stone-500" />
        <h2 className="font-medium">Scan cycle</h2>
        <span className="ml-auto text-xs text-stone-500">
          {registry.enrolled_trees ?? 0} trees · {data.due_within_7_days} due this week
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.scheduled_jobs
          .filter((j) =>
            [
              "daily_tree_scan_sweep",
              "daily_satellite_watch_sweep",
              "weekly_tree_scan_target_backfill",
              "threat_watch_scan",
              "weekly_scan_cycle_digest",
            ].includes(j.job_name),
          )
          .map((job) => (
            <div
              key={job.job_name}
              className={`rounded-lg border px-3 py-2 text-sm ${
                job.stale
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-stone-200 bg-stone-50 text-stone-800"
              }`}
            >
              <div className="font-medium">{job.label}</div>
              <div className="mt-0.5 text-xs text-stone-600">
                {job.cadence} · {job.schedule_utc} UTC
              </div>
              <div className="mt-1 text-xs">
                {job.last_run ? (
                  <>
                    Last:{" "}
                    <span className={job.last_run.status === "error" ? "text-red-700" : ""}>
                      {job.last_run.status}
                    </span>
                    {job.last_run.finished_at ? (
                      <span className="text-stone-500">
                        {" "}
                        · {new Date(job.last_run.finished_at).toLocaleString()}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-stone-500">No runs recorded</span>
                )}
              </div>
            </div>
          ))}
      </div>
      {staleJobs.length > 0 ? (
        <p className="border-t border-stone-200 px-4 py-2 text-xs text-amber-800">
          {staleJobs.length} scheduled job(s) appear stale — check platform ops if sweeps are not
          running.
        </p>
      ) : null}
    </section>
  );
}
