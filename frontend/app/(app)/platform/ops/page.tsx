"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, CreditCard, Loader2, Server, ShieldCheck, Webhook, XCircle, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { plantingProjects } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { cn } from "@/lib/cn";

const TRIGGERABLE_JOBS = [
  { value: "daily_health_roundup", label: "Daily health roundup" },
  { value: "monthly_satellite_sweep", label: "Monthly satellite sweep" },
  { value: "daily_satellite_health_digest", label: "Daily satellite health digest" },
  { value: "threat_watch_scan", label: "Threat watch scan" },
  { value: "compliance_deadline_scan", label: "Compliance deadline scan" },
  { value: "survival_survey_reminders", label: "Survival survey reminders" },
  { value: "biodiversity_baseline", label: "Biodiversity baseline" },
];

type OpsTab = "health" | "webhooks" | "jobs" | "schemes" | "config";

const TABS: Array<{ id: OpsTab; label: string }> = [
  { id: "health", label: "Health" },
  { id: "webhooks", label: "Webhooks" },
  { id: "jobs", label: "Jobs" },
  { id: "schemes", label: "Schemes" },
  { id: "config", label: "Config" },
];

type StepUpAction =
  | { kind: "retry_webhook"; deliveryId: string }
  | { kind: "retry_job"; runId: string }
  | { kind: "trigger_job"; jobName: string };

export default function PlatformOpsPage() {
  const [tab, setTab] = useState<OpsTab>("health");
  const [apoCsv, setApoCsv] = useState("");
  const [triggerJobName, setTriggerJobName] = useState(TRIGGERABLE_JOBS[0]?.value ?? "");
  const [backfillLimit, setBackfillLimit] = useState(50);
  const [backfillAsync, setBackfillAsync] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpAction, setStepUpAction] = useState<StepUpAction | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-ops-summary"],
    queryFn: () => platformAdmin.opsSummary(),
  });

  const { data: schemeSummary, refetch: refetchSchemes } = useQuery({
    queryKey: ["platform-scheme-summary"],
    queryFn: () => platformAdmin.schemeSummary(),
  });

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => platformAdmin.settings(),
  });

  const { data: failedWebhooks, refetch: refetchWebhooks } = useQuery({
    queryKey: ["platform-failed-webhooks"],
    queryFn: () => platformAdmin.listFailedWebhooks(50),
  });

  const { data: paymentEvents, refetch: refetchPaymentEvents } = useQuery({
    queryKey: ["platform-payment-events"],
    queryFn: () => platformAdmin.listPaymentEvents({ limit: 50 }),
  });

  const pingIntegrations = useMutation({
    mutationFn: () => platformAdmin.pingIntegrations(),
    onSuccess: () => {
      notifyPlatformAction("Integration ping complete.");
      void refetch();
    },
    onError: (err) => notifyPlatformError(err),
  });

  const apoImport = useMutation({
    mutationFn: () => platformAdmin.importCampaApo(apoCsv),
    onSuccess: () => {
      refetchSchemes();
      setApoCsv("");
      notifyPlatformAction("APO import complete.");
    },
    onError: (err) => notifyPlatformError(err),
  });

  const integrityBackfill = useMutation({
    mutationFn: () =>
      plantingProjects.backfillIntegrityFusion({
        limit: backfillLimit,
        async: backfillAsync,
      }),
    onSuccess: (result) => {
      if (result.status === "queued") {
        notifyPlatformAction(
          `Integrity fusion backfill queued (task ${result.task_id ?? "—"}, limit ${result.limit_projects ?? backfillLimit}).`,
        );
      } else {
        notifyPlatformAction(
          `Integrity fusion backfill complete: ${result.projects_processed ?? 0} projects, ${result.trees_refreshed ?? 0} trees refreshed.`,
        );
      }
    },
    onError: (err) => notifyPlatformError(err),
  });

  const stepUpMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!stepUpAction) return;
      if (stepUpAction.kind === "retry_webhook") {
        return platformAdmin.retryWebhook(stepUpAction.deliveryId, password);
      }
      if (stepUpAction.kind === "retry_job") {
        return platformAdmin.retryJob(stepUpAction.runId, password);
      }
      return platformAdmin.triggerJob(stepUpAction.jobName, password);
    },
    onSuccess: (result) => {
      const action = stepUpAction;
      setStepUpOpen(false);
      setStepUpAction(null);
      if (action?.kind === "retry_webhook") {
        const webhookResult = result as { status?: string };
        notifyPlatformAction(`Webhook retry queued (${webhookResult?.status ?? "queued"}).`, {
          audit: { actionPrefix: "platform.ops.webhook_retry" },
        });
        void refetchWebhooks();
      } else if (action?.kind === "retry_job") {
        const jobResult = result as { job_name?: string };
        notifyPlatformAction(`Job retry queued: ${jobResult?.job_name ?? "job"}.`, {
          audit: { actionPrefix: "platform.ops.job_retry" },
        });
        void refetch();
      } else if (action?.kind === "trigger_job") {
        const jobResult = result as { job_name?: string };
        notifyPlatformAction(`Job triggered: ${jobResult?.job_name ?? "job"}.`, {
          audit: { actionPrefix: "platform.ops.job_trigger" },
        });
        void refetch();
      }
    },
    onError: (err) => notifyPlatformError(err),
  });

  const openStepUp = (action: StepUpAction) => {
    setStepUpAction(action);
    setStepUpOpen(true);
  };

  const failedJobs = data?.jobs.recent.filter((job) => job.status === "failed") ?? [];
  const tabBadges = useMemo(
    () => ({
      webhooks: failedWebhooks?.length ?? 0,
      jobs: data?.workers.failed_job_count ?? 0,
    }),
    [failedWebhooks?.length, data?.workers.failed_job_count],
  );

  return (
    <PlatformShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Worker health, integrations, webhooks, payments, and background jobs.
          </p>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={isFetching}
            onClick={() => {
              void refetch();
              void refetchWebhooks();
              void refetchPaymentEvents();
            }}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div
          className="inline-flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-stone-100/80 p-1 dark:border-stone-800 dark:bg-stone-900"
          role="tablist"
          aria-label="Operations sections"
        >
          {TABS.map((item) => {
            const badge =
              item.id === "webhooks"
                ? tabBadges.webhooks
                : item.id === "jobs"
                  ? tabBadges.jobs
                  : 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === item.id
                    ? "bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-50"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
                )}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                {badge > 0 ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {isLoading || !data ? (
          <p className="text-sm text-stone-500">Loading operations summary…</p>
        ) : (
          <>
            {tab === "health" ? (
              <div className="space-y-6">
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Integrations</h2>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={pingIntegrations.isPending}
                      onClick={() => pingIntegrations.mutate()}
                    >
                      {pingIntegrations.isPending ? (
                        <>
                          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                          Pinging…
                        </>
                      ) : (
                        <>
                          <Zap className="mr-1 inline h-3 w-3" />
                          Ping integrations
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(
                      pingIntegrations.data?.integrations ?? data.integrations.integrations,
                    ).map(([key, info]) => (
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
                        {"error" in info && info.error ? (
                          <p className="mt-1 text-xs text-red-600">{String(info.error)}</p>
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
              </div>
            ) : null}

            {tab === "webhooks" ? (
              <div className="space-y-6">
                <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                  <div className="mb-4 flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-forest-700" />
                    <h2 className="text-lg font-semibold">Failed webhook deliveries</h2>
                  </div>
                  {!failedWebhooks?.length ? (
                    <p className="text-sm text-stone-500">No failed webhook deliveries.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-stone-500">
                          <tr>
                            <th className="px-2 py-2 font-medium">Organization</th>
                            <th className="px-2 py-2 font-medium">Endpoint</th>
                            <th className="px-2 py-2 font-medium">Event</th>
                            <th className="px-2 py-2 font-medium">Attempts</th>
                            <th className="px-2 py-2 font-medium">Error</th>
                            <th className="px-2 py-2 font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {failedWebhooks.map((w) => (
                            <tr key={w.id} className="border-t border-stone-100 dark:border-stone-800">
                              <td className="px-2 py-2">{w.organization_name}</td>
                              <td className="max-w-[180px] truncate px-2 py-2 font-mono text-xs">
                                {w.webhook_url}
                              </td>
                              <td className="px-2 py-2">{w.event_type}</td>
                              <td className="px-2 py-2">{w.attempt_count}</td>
                              <td className="max-w-xs truncate px-2 py-2 text-xs text-red-600">
                                {w.error_message || "—"}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  className="btn-secondary text-xs"
                                  onClick={() =>
                                    openStepUp({ kind: "retry_webhook", deliveryId: w.id })
                                  }
                                >
                                  Retry
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                  <div className="mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-forest-700" />
                    <h2 className="text-lg font-semibold">Failed payment webhook events</h2>
                  </div>
                  {!paymentEvents?.length ? (
                    <p className="text-sm text-stone-500">No failed payment events.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-stone-500">
                          <tr>
                            <th className="px-2 py-2 font-medium">Event ID</th>
                            <th className="px-2 py-2 font-medium">Type</th>
                            <th className="px-2 py-2 font-medium">Provider</th>
                            <th className="px-2 py-2 font-medium">Received</th>
                            <th className="px-2 py-2 font-medium">Payload</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentEvents.map((e) => (
                            <tr key={e.id} className="border-t border-stone-100 dark:border-stone-800">
                              <td className="px-2 py-2 font-mono text-xs">{e.event_id}</td>
                              <td className="px-2 py-2">{e.event_type}</td>
                              <td className="px-2 py-2">{e.provider}</td>
                              <td className="px-2 py-2 text-xs text-stone-500">
                                {new Date(e.created_at).toLocaleString()}
                              </td>
                              <td className="max-w-xs truncate px-2 py-2 text-xs text-stone-600">
                                {e.payload_preview}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            ) : null}

            {tab === "jobs" ? (
              <div className="space-y-6">
              <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-forest-700" />
                    <h2 className="text-lg font-semibold">Monitoring jobs</h2>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="kpi-label">Trigger job</label>
                      <select
                        className="input mt-1 min-w-[220px] text-sm"
                        value={triggerJobName}
                        onChange={(e) => setTriggerJobName(e.target.value)}
                      >
                        {TRIGGERABLE_JOBS.map((job) => (
                          <option key={job.value} value={job.value}>
                            {job.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={!triggerJobName}
                      onClick={() => openStepUp({ kind: "trigger_job", jobName: triggerJobName })}
                    >
                      Trigger
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-stone-500">
                      <tr>
                        <th className="px-2 py-2 font-medium">Job</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Finished</th>
                        <th className="px-2 py-2 font-medium">Error</th>
                        <th className="px-2 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.jobs.recent.map((job) => (
                        <tr key={job.id} className="border-t border-stone-100 dark:border-stone-800">
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
                          <td className="px-2 py-2 text-right">
                            {job.status === "failed" ? (
                              <button
                                type="button"
                                className="btn-secondary text-xs"
                                onClick={() => openStepUp({ kind: "retry_job", runId: job.id })}
                              >
                                Retry
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {failedJobs.length > 0 ? (
                  <p className="mt-3 text-xs text-amber-700">
                    {failedJobs.length} failed run(s) in the recent window — retry requires step-up
                    verification.
                  </p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-forest-700" />
                    <div>
                      <h2 className="text-lg font-semibold">Integrity fusion backfill</h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Recompute fusion scores for projects with trees missing scores. Nightly beat
                        runs automatically; use this for manual catch-up after deploy.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="kpi-label">Project limit</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      className="input mt-1 w-28 text-sm"
                      value={backfillLimit}
                      onChange={(e) => setBackfillLimit(Number(e.target.value) || 50)}
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-sm text-stone-600">
                    <input
                      type="checkbox"
                      checked={backfillAsync}
                      onChange={(e) => setBackfillAsync(e.target.checked)}
                    />
                    Queue via Celery
                  </label>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={integrityBackfill.isPending}
                    onClick={() => integrityBackfill.mutate()}
                  >
                    {integrityBackfill.isPending ? "Running…" : "Run backfill"}
                  </button>
                </div>
                {integrityBackfill.data ? (
                  <p className="mt-3 text-xs text-stone-600">
                    {integrityBackfill.data.status === "queued"
                      ? `Queued task ${integrityBackfill.data.task_id ?? "—"}`
                      : `Processed ${integrityBackfill.data.projects_processed ?? 0} projects · ${integrityBackfill.data.trees_refreshed ?? 0} trees refreshed`}
                  </p>
                ) : null}
              </section>
              </div>
            ) : null}

            {tab === "schemes" ? (
              schemeSummary ? (
                <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                  <h2 className="text-lg font-semibold">Central scheme rollup</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {schemeSummary.tagged_project_count} tagged projects ·{" "}
                    {schemeSummary.untagged_project_count} without scheme
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-stone-500">
                        <tr>
                          <th className="px-2 py-2 font-medium">Scheme</th>
                          <th className="px-2 py-2 font-medium">Ministry</th>
                          <th className="px-2 py-2 font-medium">Projects</th>
                          <th className="px-2 py-2 font-medium">Trees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schemeSummary.by_scheme.map((row) => (
                          <tr
                            key={row.scheme_code}
                            className="border-t border-stone-100 dark:border-stone-800"
                          >
                            <td className="px-2 py-2">{row.scheme_label}</td>
                            <td className="px-2 py-2 text-stone-600">{row.ministry ?? "—"}</td>
                            <td className="px-2 py-2">{row.project_count}</td>
                            <td className="px-2 py-2">{row.tree_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 border-t border-stone-100 pt-4 dark:border-stone-800">
                    <h3 className="text-sm font-medium">CAMPA APO CSV import</h3>
                    <p className="mt-1 text-xs text-stone-500">
                      Paste CSV with columns: pca_number, state_name, apo_financial_year, project_code,
                      project_name
                    </p>
                    <textarea
                      className="input mt-2 min-h-[100px] font-mono text-xs"
                      value={apoCsv}
                      onChange={(e) => setApoCsv(e.target.value)}
                      placeholder="pca_number,state_name,apo_financial_year,project_code,project_name"
                    />
                    <button
                      type="button"
                      className="btn-secondary mt-2 text-xs"
                      disabled={apoImport.isPending || apoCsv.trim().length < 10}
                      onClick={() => apoImport.mutate()}
                    >
                      {apoImport.isPending ? "Importing…" : "Import APO rows"}
                    </button>
                    {apoImport.data ? (
                      <p className="mt-2 text-xs text-stone-600">
                        Imported {apoImport.data.imported} project
                        {apoImport.data.imported === 1 ? "" : "s"}
                        {apoImport.data.unmatched.length > 0 &&
                          ` · ${apoImport.data.unmatched.length} unmatched codes`}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : (
                <p className="text-sm text-stone-500">Loading scheme rollup…</p>
              )
            ) : null}

            {tab === "config" ? (
              settings ? (
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
              ) : (
                <p className="text-sm text-stone-500">Loading configuration…</p>
              )
            ) : null}
          </>
        )}
      </div>

      <StepUpModal
        open={stepUpOpen}
        title={
          stepUpAction?.kind === "retry_webhook"
            ? "Retry webhook delivery"
            : stepUpAction?.kind === "retry_job"
              ? "Retry monitoring job"
              : "Trigger monitoring job"
        }
        description="Re-enter your admin password to confirm this operations action."
        confirmLabel={
          stepUpAction?.kind === "trigger_job"
            ? "Trigger job"
            : stepUpAction?.kind === "retry_job"
              ? "Retry job"
              : "Retry webhook"
        }
        busy={stepUpMutation.isPending}
        onClose={() => {
          setStepUpOpen(false);
          setStepUpAction(null);
        }}
        onConfirm={(password) => stepUpMutation.mutate(password)}
      />
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
      <div
        className={cn(
          "mt-3 text-xl font-semibold capitalize",
          ok ? "text-emerald-700" : degraded ? "text-amber-700" : "text-red-700",
        )}
      >
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
