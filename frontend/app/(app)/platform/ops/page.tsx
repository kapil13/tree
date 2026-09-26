"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Activity, CheckCircle2, CreditCard, Loader2, Server, ShieldCheck, Webhook, XCircle, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { plantingProjects } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { cn } from "@/lib/cn";

const TRIGGERABLE_JOB_VALUES = [
  "daily_health_roundup",
  "monthly_satellite_sweep",
  "daily_satellite_health_digest",
  "threat_watch_scan",
  "compliance_deadline_scan",
  "survival_survey_reminders",
  "biodiversity_baseline",
] as const;

const JOB_LABEL_KEYS: Record<(typeof TRIGGERABLE_JOB_VALUES)[number], string> = {
  daily_health_roundup: "jobDailyHealthRoundup",
  monthly_satellite_sweep: "jobMonthlySatelliteSweep",
  daily_satellite_health_digest: "jobDailySatelliteHealthDigest",
  threat_watch_scan: "jobThreatWatchScan",
  compliance_deadline_scan: "jobComplianceDeadlineScan",
  survival_survey_reminders: "jobSurvivalSurveyReminders",
  biodiversity_baseline: "jobBiodiversityBaseline",
};

type OpsTab = "health" | "webhooks" | "jobs" | "schemes" | "config";

const TAB_IDS: OpsTab[] = ["health", "webhooks", "jobs", "schemes", "config"];

type StepUpAction =
  | { kind: "retry_webhook"; deliveryId: string }
  | { kind: "retry_job"; runId: string }
  | { kind: "trigger_job"; jobName: string };

export default function PlatformOpsPage() {
  const t = useTranslations("platformAdmin.ops");
  const tc = useTranslations("platformAdmin.common");
  const triggerableJobs = useMemo(
    () =>
      TRIGGERABLE_JOB_VALUES.map((value) => ({
        value,
        label: t(JOB_LABEL_KEYS[value] as "jobDailyHealthRoundup"),
      })),
    [t],
  );
  const tabs = useMemo(
    () =>
      TAB_IDS.map((id) => ({
        id,
        label: t(
          id === "health"
            ? "tabHealth"
            : id === "webhooks"
              ? "tabWebhooks"
              : id === "jobs"
                ? "tabJobs"
                : id === "schemes"
                  ? "tabSchemes"
                  : "tabConfig",
        ),
      })),
    [t],
  );
  const [tab, setTab] = useState<OpsTab>("health");
  const [apoCsv, setApoCsv] = useState("");
  const [apvCsv, setApvCsv] = useState("");
  const [triggerJobName, setTriggerJobName] = useState<string>(TRIGGERABLE_JOB_VALUES[0] ?? "");
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
      notifyPlatformAction(t("notifyPingComplete"));
      void refetch();
    },
    onError: (err) => notifyPlatformError(err),
  });

  const apoImport = useMutation({
    mutationFn: () => platformAdmin.importCampaApo(apoCsv),
    onSuccess: () => {
      refetchSchemes();
      setApoCsv("");
      notifyPlatformAction(t("notifyApoImportComplete"));
    },
    onError: (err) => notifyPlatformError(err),
  });

  const apvImport = useMutation({
    mutationFn: () => platformAdmin.importApvSites(apvCsv),
    onSuccess: () => {
      refetchSchemes();
      setApvCsv("");
      notifyPlatformAction(t("notifyApvImportComplete"));
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
          t("notifyBackfillQueued", {
            taskId: result.task_id ?? "—",
            limit: result.limit_projects ?? backfillLimit,
          }),
        );
      } else {
        notifyPlatformAction(
          t("notifyBackfillComplete", {
            projects: result.projects_processed ?? 0,
            trees: result.trees_refreshed ?? 0,
          }),
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
        notifyPlatformAction(t("notifyWebhookRetry", { status: webhookResult?.status ?? "queued" }), {
          audit: { actionPrefix: "platform.ops.webhook_retry" },
        });
        void refetchWebhooks();
      } else if (action?.kind === "retry_job") {
        const jobResult = result as { job_name?: string };
        notifyPlatformAction(t("notifyJobRetry", { jobName: jobResult?.job_name ?? "job" }), {
          audit: { actionPrefix: "platform.ops.job_retry" },
        });
        void refetch();
      } else if (action?.kind === "trigger_job") {
        const jobResult = result as { job_name?: string };
        notifyPlatformAction(t("notifyJobTriggered", { jobName: jobResult?.job_name ?? "job" }), {
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
          <p className="text-sm text-stone-600 dark:text-stone-300">{t("description")}</p>
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
            {isFetching ? tc("refreshing") : tc("refresh")}
          </button>
        </div>

        <div
          className="inline-flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-stone-100/80 p-1 dark:border-stone-800 dark:bg-stone-900"
          role="tablist"
          aria-label={t("tabListAria")}
        >
          {tabs.map((item) => {
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
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : (
          <>
            {tab === "health" ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <HealthCard
                    label={t("overall")}
                    status={data.status}
                    hint={t("recentJobRuns", { count: data.jobs.recent_count })}
                  />
                  <HealthCard
                    label={t("celeryWorkers")}
                    status={data.workers.celery.reachable ? "ok" : "error"}
                    hint={
                      data.workers.celery.workers.length
                        ? data.workers.celery.workers.join(", ")
                        : data.workers.celery.error || t("noWorkersResponding")
                    }
                  />
                  <HealthCard
                    label={t("integrations")}
                    status={data.integrations.status}
                    hint={t("providersChecked", {
                      count: Object.keys(data.integrations.integrations).length,
                    })}
                  />
                  <HealthCard
                    label={t("failedJobsRecent")}
                    status={data.workers.failed_job_count > 0 ? "degraded" : "ok"}
                    hint={t("failuresInWindow", { count: data.workers.failed_job_count })}
                  />
                </div>

                <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{t("integrations")}</h2>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={pingIntegrations.isPending}
                      onClick={() => pingIntegrations.mutate()}
                    >
                      {pingIntegrations.isPending ? (
                        <>
                          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                          {t("pinging")}
                        </>
                      ) : (
                        <>
                          <Zap className="mr-1 inline h-3 w-3" />
                          {t("pingIntegrations")}
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
                    <h2 className="text-lg font-semibold">{t("bioacousticPipeline")}</h2>
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
                {data.webhooks ? (
                  <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-5 w-5 text-forest-700" />
                        <h2 className="text-lg font-semibold">Webhook delivery health</h2>
                      </div>
                      {data.webhooks.alert_low_success_rate ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                          Low success rate
                        </span>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <HealthCard
                        label="Success rate"
                        status={
                          data.webhooks.success_rate_pct == null
                            ? "unknown"
                            : data.webhooks.success_rate_pct >= 90
                              ? "ok"
                              : "degraded"
                        }
                        hint={
                          data.webhooks.success_rate_pct == null
                            ? "No deliveries in window"
                            : `${data.webhooks.success_rate_pct}% (${data.webhooks.window_hours}h)`
                        }
                      />
                      <HealthCard
                        label="Delivered"
                        status="ok"
                        hint={String(data.webhooks.delivered)}
                      />
                      <HealthCard
                        label="Retrying"
                        status={data.webhooks.retrying > 0 ? "degraded" : "ok"}
                        hint={String(data.webhooks.retrying)}
                      />
                      <HealthCard
                        label="Dead letter"
                        status={data.webhooks.dead_letter > 0 ? "error" : "ok"}
                        hint={String(data.webhooks.dead_letter)}
                      />
                      <HealthCard
                        label="Failed"
                        status={data.webhooks.failed > 0 ? "degraded" : "ok"}
                        hint={String(data.webhooks.failed)}
                      />
                    </div>
                  </section>
                ) : null}

                {data.messaging ? (
                  <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                    <h2 className="text-lg font-semibold">OTP & messaging delivery</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <HealthCard
                        label="OTP sent"
                        status="ok"
                        hint={String(data.messaging.otp_sent)}
                      />
                      <HealthCard
                        label="OTP verified"
                        status="ok"
                        hint={String(data.messaging.otp_verified)}
                      />
                      <HealthCard
                        label="OTP success rate"
                        status={
                          data.messaging.otp_success_rate_pct == null
                            ? "unknown"
                            : data.messaging.otp_success_rate_pct >= 70
                              ? "ok"
                              : "degraded"
                        }
                        hint={
                          data.messaging.otp_success_rate_pct == null
                            ? "No OTP traffic"
                            : `${data.messaging.otp_success_rate_pct}%`
                        }
                      />
                      <HealthCard
                        label="Suppressed recipients"
                        status={data.messaging.suppressed_recipients > 0 ? "degraded" : "ok"}
                        hint={String(data.messaging.suppressed_recipients)}
                      />
                    </div>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                  <div className="mb-4 flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-forest-700" />
                    <h2 className="text-lg font-semibold">{t("failedWebhookDeliveries")}</h2>
                  </div>
                  {!failedWebhooks?.length ? (
                    <p className="text-sm text-stone-500">{t("noFailedWebhooks")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-stone-500">
                          <tr>
                            <th className="px-2 py-2 font-medium">{t("tableOrganization")}</th>
                            <th className="px-2 py-2 font-medium">{t("tableEndpoint")}</th>
                            <th className="px-2 py-2 font-medium">{t("tableEvent")}</th>
                            <th className="px-2 py-2 font-medium">{tc("status")}</th>
                            <th className="px-2 py-2 font-medium">{t("tableAttempts")}</th>
                            <th className="px-2 py-2 font-medium">{t("tableError")}</th>
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
                              <td className="px-2 py-2">
                                <IntegrationStatus status={w.status} />
                              </td>
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
                                  {tc("retry")}
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
                    <h2 className="text-lg font-semibold">{t("failedPaymentEvents")}</h2>
                  </div>
                  {!paymentEvents?.length ? (
                    <p className="text-sm text-stone-500">{t("noFailedPaymentEvents")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-stone-500">
                          <tr>
                            <th className="px-2 py-2 font-medium">{t("tableEventId")}</th>
                            <th className="px-2 py-2 font-medium">{t("tableType")}</th>
                            <th className="px-2 py-2 font-medium">{t("tableProvider")}</th>
                            <th className="px-2 py-2 font-medium">{t("tableReceived")}</th>
                            <th className="px-2 py-2 font-medium">{t("tablePayload")}</th>
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
                    <h2 className="text-lg font-semibold">{t("monitoringJobs")}</h2>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="kpi-label">{t("triggerJob")}</label>
                      <select
                        className="input mt-1 min-w-[220px] text-sm"
                        value={triggerJobName}
                        onChange={(e) => setTriggerJobName(e.target.value)}
                      >
                        {triggerableJobs.map((job) => (
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
                      {t("trigger")}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-stone-500">
                      <tr>
                        <th className="px-2 py-2 font-medium">{t("tableJob")}</th>
                        <th className="px-2 py-2 font-medium">{tc("status")}</th>
                        <th className="px-2 py-2 font-medium">{t("tableFinished")}</th>
                        <th className="px-2 py-2 font-medium">{t("tableError")}</th>
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
                                {tc("retry")}
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
                    {t("failedRunsHint", { count: failedJobs.length })}
                  </p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-forest-700" />
                    <div>
                      <h2 className="text-lg font-semibold">{t("integrityBackfill")}</h2>
                      <p className="mt-1 text-sm text-stone-500">{t("integrityBackfillDesc")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="kpi-label">{t("projectLimit")}</label>
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
                    {t("queueViaCelery")}
                  </label>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={integrityBackfill.isPending}
                    onClick={() => integrityBackfill.mutate()}
                  >
                    {integrityBackfill.isPending ? t("running") : t("runBackfill")}
                  </button>
                </div>
                {integrityBackfill.data ? (
                  <p className="mt-3 text-xs text-stone-600">
                    {integrityBackfill.data.status === "queued"
                      ? t("queuedTask", { taskId: integrityBackfill.data.task_id ?? "—" })
                      : t("backfillResult", {
                          projects: integrityBackfill.data.projects_processed ?? 0,
                          trees: integrityBackfill.data.trees_refreshed ?? 0,
                        })}
                  </p>
                ) : null}
              </section>
              </div>
            ) : null}

            {tab === "schemes" ? (
              schemeSummary ? (
                <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                  <h2 className="text-lg font-semibold">{t("schemeRollup")}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {t("schemeRollupHint", {
                      tagged: schemeSummary.tagged_project_count,
                      untagged: schemeSummary.untagged_project_count,
                    })}
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-stone-500">
                        <tr>
                          <th className="px-2 py-2 font-medium">{t("tableScheme")}</th>
                          <th className="px-2 py-2 font-medium">{t("tableMinistry")}</th>
                          <th className="px-2 py-2 font-medium">{t("tableProjects")}</th>
                          <th className="px-2 py-2 font-medium">{t("tableTrees")}</th>
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
                    <h3 className="text-sm font-medium">{t("campaApoImport")}</h3>
                    <p className="mt-1 text-xs text-stone-500">{t("campaApoColumns")}</p>
                    <textarea
                      className="input mt-2 min-h-[100px] font-mono text-xs"
                      value={apoCsv}
                      onChange={(e) => setApoCsv(e.target.value)}
                      placeholder={t("campaApoPlaceholder")}
                    />
                    <button
                      type="button"
                      className="btn-secondary mt-2 text-xs"
                      disabled={apoImport.isPending || apoCsv.trim().length < 10}
                      onClick={() => apoImport.mutate()}
                    >
                      {apoImport.isPending ? t("importing") : t("importApoRows")}
                    </button>
                    {apoImport.data ? (
                      <p className="mt-2 text-xs text-stone-600">
                        {t("importedProjects", { count: apoImport.data.imported })}
                        {apoImport.data.unmatched.length > 0
                          ? t("unmatchedCodes", { count: apoImport.data.unmatched.length })
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 border-t border-stone-100 pt-4 dark:border-stone-800">
                    <h3 className="text-sm font-medium">{t("apvImport")}</h3>
                    <p className="mt-1 text-xs text-stone-500">{t("apvColumns")}</p>
                    <textarea
                      className="input mt-2 min-h-[100px] font-mono text-xs"
                      value={apvCsv}
                      onChange={(e) => setApvCsv(e.target.value)}
                      placeholder={t("apvPlaceholder")}
                    />
                    <button
                      type="button"
                      className="btn-secondary mt-2 text-xs"
                      disabled={apvImport.isPending || apvCsv.trim().length < 10}
                      onClick={() => apvImport.mutate()}
                    >
                      {apvImport.isPending ? t("importing") : t("importApvRows")}
                    </button>
                    {apvImport.data ? (
                      <p className="mt-2 text-xs text-stone-600">
                        {t("importedProjects", { count: apvImport.data.imported })}
                        {apvImport.data.unmatched.length > 0
                          ? t("unmatchedCodes", { count: apvImport.data.unmatched.length })
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : (
                <p className="text-sm text-stone-500">{t("loadingSchemeRollup")}</p>
              )
            ) : null}

            {tab === "config" ? (
              settings ? (
                <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                  <h2 className="text-lg font-semibold">{t("systemConfig")}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {t("systemConfigDesc", {
                      env: settings.app_env,
                      version: settings.app_version,
                    })}
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
                <p className="text-sm text-stone-500">{t("loadingConfig")}</p>
              )
            ) : null}
          </>
        )}
      </div>

      <StepUpModal
        open={stepUpOpen}
        title={
          stepUpAction?.kind === "retry_webhook"
            ? t("stepUpRetryWebhook")
            : stepUpAction?.kind === "retry_job"
              ? t("stepUpRetryJob")
              : t("stepUpTriggerJob")
        }
        description={t("stepUpDesc")}
        confirmLabel={
          stepUpAction?.kind === "trigger_job"
            ? t("stepUpTriggerJobConfirm")
            : stepUpAction?.kind === "retry_job"
              ? t("stepUpRetryJobConfirm")
              : t("stepUpRetryWebhookConfirm")
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
