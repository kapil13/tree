"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Server, XCircle } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { platformAdmin } from "@/lib/platform-api";
import { cn } from "@/lib/cn";

export default function PlatformOpsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-ops-summary"],
    queryFn: () => platformAdmin.opsSummary(),
  });

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => platformAdmin.settings(),
  });

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Worker health, external integrations, and recent monitoring job runs.
          </p>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {isLoading || !data ? (
          <p className="text-sm text-stone-500">Loading operations summary…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <HealthCard
                label="Overall"
                status={data.status}
                hint={`${data.jobs.recent_count} recent job runs`}
              />
              <HealthCard
                label="Celery workers"
                status={data.workers.celery.reachable ? "ok" : "error"}
                hint={
                  data.workers.celery.workers.length
                    ? data.workers.celery.workers.join(", ")
                    : data.workers.celery.error || "No workers responding"
                }
              />
              <HealthCard
                label="Integrations"
                status={data.integrations.status}
                hint={`${Object.keys(data.integrations.integrations).length} providers checked`}
              />
              <HealthCard
                label="Failed jobs (recent)"
                status={data.workers.failed_job_count > 0 ? "degraded" : "ok"}
                hint={`${data.workers.failed_job_count} failures in recent window`}
              />
            </div>

            <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="text-lg font-semibold">Integrations</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(data.integrations.integrations).map(([key, info]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-stone-100 px-4 py-3 dark:border-stone-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{key.replace(/_/g, " ")}</span>
                      <IntegrationStatus status={info.status} />
                    </div>
                    {"label" in info && info.label ? (
                      <p className="mt-1 text-xs text-stone-500">{info.label}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {data.workers.bioacoustic ? (
              <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-lg font-semibold">Bioacoustic pipeline</h2>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {Object.entries(data.workers.bioacoustic).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 border-b border-stone-50 py-1 dark:border-stone-800">
                      <dt className="text-stone-500">{key.replace(/_/g, " ")}</dt>
                      <dd className="font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-forest-700" />
                <h2 className="text-lg font-semibold">Recent job runs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-stone-500">
                    <tr>
                      <th className="px-2 py-2 font-medium">Job</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Finished</th>
                      <th className="px-2 py-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.recent.map((job, idx) => (
                      <tr key={`${job.job_name}-${idx}`} className="border-t border-stone-100 dark:border-stone-800">
                        <td className="px-2 py-2 font-mono text-xs">{job.job_name}</td>
                        <td className="px-2 py-2">
                          <IntegrationStatus status={job.status} />
                        </td>
                        <td className="px-2 py-2 text-xs text-stone-500">
                          {job.finished_at ? new Date(job.finished_at).toLocaleString() : "—"}
                        </td>
                        <td className="max-w-xs truncate px-2 py-2 text-xs text-red-600">
                          {job.error || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {settings ? (
              <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-lg font-semibold">System configuration</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Read-only snapshot of integration and feature flags ({settings.app_env} · v
                  {settings.app_version}).
                </p>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {Object.entries(settings).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-4 border-b border-stone-50 py-1 dark:border-stone-800"
                    >
                      <dt className="text-stone-500">{key.replace(/_/g, " ")}</dt>
                      <dd className="font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PlatformShell>
  );
}

function HealthCard({
  label,
  status,
  hint,
}: {
  label: string;
  status: string;
  hint: string;
}) {
  const ok = status === "ok";
  const degraded = status === "degraded" || status === "estimate" || status === "configured";
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2 text-stone-500">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : degraded ? (
          <Server className="h-4 w-4 text-amber-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn("mt-3 text-xl font-semibold capitalize", ok ? "text-emerald-700" : degraded ? "text-amber-700" : "text-red-700")}>
        {status}
      </div>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </div>
  );
}

function IntegrationStatus({ status }: { status: string }) {
  const styles =
    status === "ok" || status === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "error" || status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles}`}>
      {status}
    </span>
  );
}
