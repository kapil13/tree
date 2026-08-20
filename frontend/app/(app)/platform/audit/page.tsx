"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { notifyPlatformAction } from "@/lib/platform-admin-feedback";
import { platformAdmin } from "@/lib/platform-api";
import { cn } from "@/lib/cn";

const ACTION_LABELS: Record<string, string> = {
  "platform.user.role_update": "User role changed",
  "platform.user.impersonate": "Impersonation started",
  "platform.user.impersonate_stop": "Impersonation ended",
  "platform.user.grants_update": "Platform grants updated",
  "platform.user.force_password_reset": "Password reset sent",
  "platform.user.resend_verification": "Verification resent",
  "platform.user.mark_verified": "User marked verified",
  "platform.user.revoke_sessions": "Sessions revoked",
  "platform.user.bulk_activate": "Bulk user activate",
  "platform.user.bulk_deactivate": "Bulk user deactivate",
  "platform.user.bulk_revoke_sessions": "Bulk session revoke",
  "platform.organization.bulk_suspend": "Bulk org suspend",
  "platform.organization.bulk_activate": "Bulk org activate",
  "platform.governance.update": "Governance settings updated",
  "platform.organization.feature_flags": "Org feature flags updated",
  "platform.program_access.bulk_approve": "Bulk program access approved",
  "platform.program_access.bulk_reject": "Bulk program access rejected",
  "platform.organization.update": "Organization updated",
  "platform.module.update": "Module rules updated",
};

function formatDiff(diff: Record<string, unknown> | null): string {
  if (!diff || Object.keys(diff).length === 0) return "";
  return JSON.stringify(diff, null, 2);
}

export default function PlatformAuditPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [actionPrefix, setActionPrefix] = useState("platform.");
  const [search, setSearch] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    setActionPrefix(searchParams.get("action_prefix") ?? searchParams.get("action") ?? "platform.");
    setSearch(searchParams.get("search") ?? "");
    setActorUserId(searchParams.get("actor_user_id") ?? "");
    setOrganizationId(searchParams.get("organization_id") ?? "");
    setResourceType(searchParams.get("resource_type") ?? "");
    setResourceId(searchParams.get("resource_id") ?? "");
    setDateFrom(searchParams.get("date_from") ?? "");
    setDateTo(searchParams.get("date_to") ?? "");
    const pageParam = searchParams.get("page");
    setPage(pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1);
    setUrlReady(true);
  }, [searchParams]);

  const syncUrl = useCallback(
    (filters: {
      actionPrefix: string;
      search: string;
      actorUserId: string;
      organizationId: string;
      resourceType: string;
      resourceId: string;
      dateFrom: string;
      dateTo: string;
      page: number;
    }) => {
      const q = new URLSearchParams();
      if (filters.actionPrefix) q.set("action_prefix", filters.actionPrefix);
      if (filters.search) q.set("search", filters.search);
      if (filters.actorUserId) q.set("actor_user_id", filters.actorUserId);
      if (filters.organizationId) q.set("organization_id", filters.organizationId);
      if (filters.resourceType) q.set("resource_type", filters.resourceType);
      if (filters.resourceId) q.set("resource_id", filters.resourceId);
      if (filters.dateFrom) q.set("date_from", filters.dateFrom);
      if (filters.dateTo) q.set("date_to", filters.dateTo);
      if (filters.page > 1) q.set("page", String(filters.page));
      const query = q.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    if (!urlReady) return;
    syncUrl({
      actionPrefix,
      search,
      actorUserId,
      organizationId,
      resourceType,
      resourceId,
      dateFrom,
      dateTo,
      page,
    });
  }, [
    actionPrefix,
    search,
    actorUserId,
    organizationId,
    resourceType,
    resourceId,
    dateFrom,
    dateTo,
    page,
    urlReady,
    syncUrl,
  ]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "platform-audit",
      actionPrefix,
      search,
      actorUserId,
      organizationId,
      resourceType,
      resourceId,
      dateFrom,
      dateTo,
      page,
    ],
    queryFn: () =>
      platformAdmin.auditLogs({
        page,
        page_size: 50,
        action_prefix: actionPrefix || undefined,
        search: search || undefined,
        actor_user_id: actorUserId || undefined,
        organization_id: organizationId || undefined,
        resource_type: resourceType || undefined,
        resource_id: resourceId || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
      }),
    enabled: urlReady,
  });

  const exportCsv = useMutation({
    mutationFn: () =>
      platformAdmin.exportAudit({
        action_prefix: actionPrefix || undefined,
        search: search || undefined,
        actor_user_id: actorUserId || undefined,
        organization_id: organizationId || undefined,
        resource_type: resourceType || undefined,
        resource_id: resourceId || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
      }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "platform-audit.csv";
      a.click();
      URL.revokeObjectURL(url);
      notifyPlatformAction("Audit log exported.");
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Platform-wide audit trail with actor names, structured diffs, and CSV export. Filters
            sync to the URL for sharing and deep links.
          </p>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-xs"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Action filter</span>
            <select
              className="input w-full"
              value={actionPrefix}
              onChange={(e) => {
                setActionPrefix(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All actions</option>
              <option value="platform.">Platform actions</option>
              <option value="cms.">CMS actions</option>
              <option value="platform.user.">User changes</option>
              <option value="platform.program_access.">Program access</option>
              <option value="platform.user.impersonate">Impersonation</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Search</span>
            <input
              className="input w-full"
              placeholder="Action, actor email, resource…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Actor user ID</span>
            <input
              className="input w-full font-mono text-xs"
              placeholder="UUID"
              value={actorUserId}
              onChange={(e) => {
                setActorUserId(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Organization ID</span>
            <input
              className="input w-full font-mono text-xs"
              placeholder="UUID"
              value={organizationId}
              onChange={(e) => {
                setOrganizationId(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Resource type</span>
            <input
              className="input w-full"
              placeholder="e.g. user"
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Resource ID</span>
            <input
              className="input w-full font-mono text-xs"
              placeholder="UUID"
              value={resourceId}
              onChange={(e) => {
                setResourceId(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">From</span>
            <input
              type="date"
              className="input w-full"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">To</span>
            <input
              type="date"
              className="input w-full"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading audit log…</p>
        ) : (
          <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
            {data?.items.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">No audit events match this filter.</p>
            ) : (
              data?.items.map((entry) => {
                const expanded = expandedId === entry.id;
                const actorLabel =
                  entry.actor_email ||
                  entry.actor_full_name ||
                  entry.actor_user_id ||
                  "System";
                return (
                  <div key={entry.id} className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => setExpandedId(expanded ? null : entry.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </div>
                        <div className="mt-0.5 text-stone-600">
                          {entry.resource_type}
                          {entry.resource_id ? ` · ${entry.resource_id.slice(0, 8)}…` : ""}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {new Date(entry.created_at).toLocaleString()} · {actorLabel}
                          {entry.ip ? ` · ${entry.ip}` : ""}
                        </div>
                      </div>
                      {entry.diff && Object.keys(entry.diff).length > 0 ? (
                        expanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-stone-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
                        )
                      ) : null}
                    </button>
                    {expanded && entry.diff && (
                      <pre
                        className={cn(
                          "mt-3 overflow-x-auto rounded-xl bg-stone-50 p-3 text-xs text-stone-800",
                          "dark:bg-stone-950",
                        )}
                      >
                        {formatDiff(entry.diff)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {data && data.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
            <span>
              {data.total} events · page {data.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </PlatformShell>
  );
}
