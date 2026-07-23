"use client";

import { useQuery } from "@tanstack/react-query";
import { SettingsSection } from "@/components/settings/settings-section";
import { audit } from "@/lib/api";

export default function AuditLogPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => audit.logs({ page: 1, page_size: 100 }),
  });

  return (
    <SettingsSection
      title="Audit trail"
      description="Immutable log of sensitive actions — tree changes, exports, logins, and compliance updates."
    >
      {error ? (
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Audit logs require an authorized role (government, corporate, NGO, field supervisor, or admin).
        </div>
      ) : isLoading ? (
        <p className="text-sm text-stone-500">Loading audit events…</p>
      ) : !data?.items.length ? (
        <div className="card py-10 text-center text-sm text-stone-500">
          No audit events yet. Tree registration, MRV exports, and logins will appear here.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-800/50">
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
                  <tr key={row.id} className="border-t border-stone-100 align-top dark:border-stone-800">
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
                        <pre className="overflow-x-auto rounded bg-stone-50 p-2 text-[10px] text-stone-600 dark:bg-stone-900">
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
          </div>
          <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500 dark:border-stone-800">
            Showing {data.items.length} of {data.total} events
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
