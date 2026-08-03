"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
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
  const [actionPrefix, setActionPrefix] = useState("platform.");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-audit", actionPrefix, search, dateFrom, dateTo, page],
    queryFn: () =>
      platformAdmin.auditLogs({
        page,
        page_size: 50,
        action_prefix: actionPrefix || undefined,
        search: search || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
      }),
  });

  const exportCsv = useMutation({
    mutationFn: () =>
      platformAdmin.exportAudit({
        action_prefix: actionPrefix || undefined,
        search: search || undefined,
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
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Platform-wide audit trail with actor names, structured diffs, and CSV export.
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
          <div className="flex items-center justify-between text-sm text-stone-600">
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
