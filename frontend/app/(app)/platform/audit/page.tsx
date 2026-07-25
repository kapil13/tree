"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlatformShell } from "@/components/platform/platform-shell";
import { audit } from "@/lib/api";

export default function PlatformAuditPage() {
  const [actionPrefix, setActionPrefix] = useState("platform.");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-audit", actionPrefix, page],
    queryFn: () =>
      audit.logs({
        page,
        page_size: 50,
        action_prefix: actionPrefix || undefined,
      }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          Platform-wide audit events. Org-scoped actions from all tenants are visible here.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">Action filter</span>
          <select
            className="input"
            value={actionPrefix}
            onChange={(e) => {
              setActionPrefix(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            <option value="platform.">Platform actions</option>
            <option value="cms.">CMS actions</option>
            <option value="platform.user.">User role changes</option>
            <option value="platform.program_access.">Program access</option>
          </select>
        </label>

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading audit log…</p>
        ) : (
          <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
            {data?.items.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">No audit events match this filter.</p>
            ) : (
              data?.items.map((entry) => (
                <div key={entry.id} className="px-4 py-3 text-sm">
                  <div className="font-medium">{entry.action}</div>
                  <div className="text-stone-600">
                    {entry.resource_type}
                    {entry.resource_id ? ` · ${entry.resource_id}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    {new Date(entry.created_at).toLocaleString()}
                    {entry.ip ? ` · ${entry.ip}` : ""}
                  </div>
                </div>
              ))
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
