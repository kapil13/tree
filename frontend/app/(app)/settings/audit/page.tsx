"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ScrollText } from "lucide-react";
import { audit } from "@/lib/api";

export default function AuditLogPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => audit.logs({ page: 1, page_size: 100 }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Settings
          </Link>
          <div className="flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-forest-700" />
            <h1 className="text-2xl font-semibold tracking-tight">Audit trail</h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Immutable log of sensitive actions — tree changes, exports, logins, compliance resolutions.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Audit logs require an authorized role (government, corporate, NGO, field supervisor, or admin).
        </div>
      ) : isLoading ? (
        <p className="text-sm text-stone-500">Loading audit events…</p>
      ) : !data?.items.length ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          No audit events recorded yet. Actions like tree registration, MRV exports, and logins will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Time (UTC)</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-t border-stone-100 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                    {new Date(row.created_at).toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-3 text-xs">
                    {row.resource_type || "—"}
                    {row.resource_id ? (
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        {row.resource_id.slice(0, 8)}…
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-stone-500">
                    {row.actor_user_id?.slice(0, 8) ?? "—"}…
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{row.ip || "—"}</td>
                  <td className="max-w-xs px-4 py-3">
                    {row.diff ? (
                      <pre className="overflow-x-auto rounded bg-stone-50 p-2 text-[10px] text-stone-600">
                        {JSON.stringify(row.diff, null, 0).slice(0, 180)}
                        {JSON.stringify(row.diff).length > 180 ? "…" : ""}
                      </pre>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
            Showing {data.items.length} of {data.total} events
          </p>
        </div>
      )}
    </div>
  );
}
