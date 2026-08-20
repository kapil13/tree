"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Satellite,
  Server,
  XCircle,
} from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { platformAdmin, type PlatformSatelliteHealth } from "@/lib/platform-api";
import { cn } from "@/lib/cn";

export default function PlatformSatelliteHealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-satellite-health"],
    queryFn: () => platformAdmin.satelliteHealth(),
  });

  const degraded =
    data &&
    (data.status === "degraded" ||
      data.status === "error" ||
      !data.providers.optical.configured ||
      (data.providers.sar.enabled && !data.providers.sar.credentials_ready) ||
      data.recent_jobs.some((job) => job.status === "failed"));

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Optical, SAR, and Bhoonidhi provider status with live vs stub scan telemetry.
          </p>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {isLoading || !data ? (
          <p className="text-sm text-stone-500">Loading satellite health…</p>
        ) : (
          <>
            {degraded ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-medium">Satellite health needs attention</p>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                  Check provider credentials, retry failed satellite jobs, or follow the admin
                  runbook.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href="/platform/ops"
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-950 underline-offset-2 hover:underline dark:text-amber-100"
                  >
                    Open Operations → Jobs
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-xs text-amber-800/80 dark:text-amber-200/70">
                    Use the Runbook control in the header for credential and stub-scan guidance.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatusCard
                label="Overall"
                status={data.status}
                hint={`Updated ${new Date(data.generated_at).toLocaleString()}`}
              />
              <StatusCard
                label="Optical (Sentinel-2)"
                status={data.providers.optical.configured ? "ok" : "degraded"}
                hint={data.providers.optical.mode}
              />
              <StatusCard
                label="SAR (Sentinel-1)"
                status={
                  data.providers.sar.credentials_ready
                    ? "ok"
                    : data.providers.sar.enabled
                      ? "degraded"
                      : "disabled"
                }
                hint={data.providers.sar.live_data_provider || data.providers.sar.primary}
              />
              <StatusCard
                label="Bhoonidhi STAC"
                status={data.providers.bhoonidhi.configured ? "ok" : "degraded"}
                hint={data.providers.bhoonidhi.mode}
              />
            </div>

            <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-4 flex items-center gap-2">
                <Satellite className="h-5 w-5 text-forest-700" />
                <h2 className="text-lg font-semibold">Provider configuration</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <ProviderCard title="Optical" provider={data.providers.optical} />
                <SarProviderCard sar={data.providers.sar} />
                <ProviderCard title="Bhoonidhi" provider={data.providers.bhoonidhi} />
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="text-lg font-semibold">
                Scan counts ({data.scans.window_days}-day window)
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Since {new Date(data.scans.since).toLocaleDateString()}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <CountTile label="Optical live" value={data.scans.combined.optical_live} tone="ok" />
                <CountTile
                  label="Optical stub"
                  value={data.scans.combined.optical_stub}
                  tone={data.scans.combined.optical_stub > 0 ? "warn" : "neutral"}
                />
                <CountTile label="SAR live" value={data.scans.combined.sar_live} tone="ok" />
                <CountTile
                  label="SAR stub"
                  value={data.scans.combined.sar_stub}
                  tone={data.scans.combined.sar_stub > 0 ? "warn" : "neutral"}
                />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ScanBreakdown title="Plantation fences" scans={data.scans.plantation_fences} />
                <ScanBreakdown title="Trees" scans={data.scans.trees} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <LatestScan
                  label="Latest plantation scan"
                  scan={data.scans.latest_plantation_scan}
                />
                <LatestScan label="Latest SAR scan" scan={data.scans.latest_sar_scan} />
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-forest-700" />
                <h2 className="text-lg font-semibold">Recent satellite jobs</h2>
              </div>
              {!data.recent_jobs.length ? (
                <p className="text-sm text-stone-500">No recent satellite or SAR jobs recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-stone-500">
                      <tr>
                        <th className="px-2 py-2 font-medium">Job</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Finished</th>
                        <th className="px-2 py-2 font-medium">Scanned</th>
                        <th className="px-2 py-2 font-medium">Live</th>
                        <th className="px-2 py-2 font-medium">Stub</th>
                        <th className="px-2 py-2 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_jobs.map((job) => (
                        <tr
                          key={`${job.job_name}-${job.finished_at ?? "pending"}`}
                          className="border-t border-stone-100 dark:border-stone-800"
                        >
                          <td className="px-2 py-2 font-mono text-xs">{job.job_name}</td>
                          <td className="px-2 py-2">
                            <JobStatus status={job.status} />
                          </td>
                          <td className="px-2 py-2 text-xs text-stone-500">
                            {job.finished_at ? new Date(job.finished_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-2 py-2">{job.scanned ?? "—"}</td>
                          <td className="px-2 py-2 text-emerald-700">{job.live_scans ?? "—"}</td>
                          <td className="px-2 py-2 text-amber-700">{job.stub_scans ?? "—"}</td>
                          <td className="max-w-xs truncate px-2 py-2 text-xs text-red-600">
                            {job.error || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PlatformShell>
  );
}

function StatusCard({
  label,
  status,
  hint,
}: {
  label: string;
  status: string;
  hint: string;
}) {
  const ok = status === "ok";
  const degraded = status === "degraded" || status === "stub" || status === "not_configured";
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

function ProviderCard({
  title,
  provider,
}: {
  title: string;
  provider: { label: string; configured?: boolean; mode: string; provider_tag?: string };
}) {
  return (
    <div className="rounded-xl border border-stone-100 px-4 py-3 dark:border-stone-800">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-stone-500">{provider.label}</p>
      <dl className="mt-3 space-y-1 text-sm">
        <Row label="Mode" value={provider.mode} />
        {"provider_tag" in provider && provider.provider_tag ? (
          <Row label="Tag" value={provider.provider_tag} />
        ) : null}
        {"configured" in provider ? (
          <Row label="Configured" value={provider.configured ? "yes" : "no"} />
        ) : null}
      </dl>
    </div>
  );
}

function SarProviderCard({
  sar,
}: {
  sar: PlatformSatelliteHealth["providers"]["sar"];
}) {
  return (
    <div className="rounded-xl border border-stone-100 px-4 py-3 dark:border-stone-800">
      <h3 className="text-sm font-semibold">SAR</h3>
      <p className="mt-1 text-xs text-stone-500">{sar.label}</p>
      <dl className="mt-3 space-y-1 text-sm">
        <Row label="Enabled" value={sar.enabled ? "yes" : "no"} />
        <Row label="Primary" value={sar.primary} />
        <Row label="Fallback" value={sar.fallback || "—"} />
        <Row label="Service" value={sar.service_name} />
        <Row label="Live provider" value={sar.live_data_provider || "—"} />
        <Row label="Credentials" value={sar.credentials_ready ? "ready" : "missing"} />
        <Row label="GEE initialized" value={sar.gee_initialized ? "yes" : "no"} />
        <Row
          label="Sentinel Hub SAR"
          value={sar.sentinel_hub_sar_configured ? "configured" : "not configured"}
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-stone-50 py-1 dark:border-stone-800">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "neutral";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-stone-700";
  return (
    <div className="rounded-xl border border-stone-100 px-4 py-3 dark:border-stone-800">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", color)}>{value}</p>
    </div>
  );
}

function ScanBreakdown({
  title,
  scans,
}: {
  title: string;
  scans: PlatformSatelliteHealth["scans"]["plantation_fences"];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-stone-500">
        {scans.total} total · {scans.optical_live} optical live · {scans.optical_stub} optical stub
        · {scans.sar_live} SAR live · {scans.sar_stub} SAR stub
      </p>
      {!scans.by_provider.length ? (
        <p className="mt-2 text-xs text-stone-500">No scans in window.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-stone-500">
              <tr>
                <th className="px-2 py-1 font-medium">Provider</th>
                <th className="px-2 py-1 font-medium">Modality</th>
                <th className="px-2 py-1 font-medium">Bucket</th>
                <th className="px-2 py-1 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {scans.by_provider.map((row) => (
                <tr key={`${title}-${row.provider}`} className="border-t border-stone-50 dark:border-stone-800">
                  <td className="px-2 py-1 font-mono">{row.provider}</td>
                  <td className="px-2 py-1 capitalize">{row.modality}</td>
                  <td className="px-2 py-1">{row.bucket}</td>
                  <td className="px-2 py-1">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LatestScan({
  label,
  scan,
}: {
  label: string;
  scan: PlatformSatelliteHealth["scans"]["latest_plantation_scan"];
}) {
  return (
    <div className="rounded-xl border border-stone-100 px-4 py-3 dark:border-stone-800">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      {scan ? (
        <>
          <p className="mt-1 text-sm font-medium">{scan.provider}</p>
          <p className="text-xs text-stone-500">
            {scan.scene_acquired_at
              ? new Date(scan.scene_acquired_at).toLocaleString()
              : "—"}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-stone-500">No scans recorded</p>
      )}
    </div>
  );
}

function JobStatus({ status }: { status: string }) {
  const styles =
    status === "ok"
      ? "bg-emerald-100 text-emerald-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles}`}>
      {status}
    </span>
  );
}
