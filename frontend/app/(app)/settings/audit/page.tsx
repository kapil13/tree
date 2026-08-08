"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { audit } from "@/lib/api";
import { organizations } from "@/lib/organizations-api";
import { useAuth } from "@/lib/auth-store";
import { ScrollText } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "tree.create": "Tree created",
  "tree.update": "Tree updated",
  "tree.delete": "Tree deleted",
  "tree.regeotag": "Tree re-geotagged",
  "tree.image.add": "Tree photo added",
  "project.create": "Project created",
  "project.update": "Project updated",
  "project.delete": "Project deleted",
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.password_reset": "Password reset",
  "export.mrv": "MRV export",
  "export.report": "Report exported",
  "compliance.update": "Compliance updated",
  "member.invite": "Team member invited",
  "member.update": "Team member updated",
  "program.access_request": "Program access requested",
};

function humanizeAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const parts = action.split(".");
  const last = parts[parts.length - 1] ?? action;
  const noun = parts[0] ?? "";
  const verb = last.replace(/_/g, " ");
  const label = `${noun} ${verb}`.trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => audit.logs({ page: 1, page_size: 100 }),
  });

  const membersQ = useQuery({
    queryKey: ["org-members-audit"],
    queryFn: () => organizations.members(),
    retry: false,
    staleTime: 60_000,
  });

  const actorById = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    if (user?.id) {
      map.set(user.id, { name: user.full_name || "You", email: user.email || "" });
    }
    for (const m of membersQ.data?.members ?? []) {
      map.set(m.id, { name: m.full_name || m.email, email: m.email });
    }
    return map;
  }, [membersQ.data?.members, user?.email, user?.full_name, user?.id]);

  function actorLabel(actorId: string | null): string {
    if (!actorId) return "System";
    const known = actorById.get(actorId);
    if (known) {
      return known.email ? `${known.name} (${known.email})` : known.name;
    }
    return shortId(actorId);
  }

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
        <EmptyState
          icon={ScrollText}
          title="No audit events yet"
          description="Tree registration, MRV exports, and logins will appear here."
        />
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
                    <td className="px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-100">
                      {humanizeAction(row.action)}
                      <div className="mt-0.5 font-mono text-[10px] font-normal text-stone-400">
                        {row.action}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.resource_type || "—"}
                      {row.resource_id ? (
                        <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                          {shortId(row.resource_id)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700 dark:text-stone-200">
                      {actorLabel(row.actor_user_id)}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{row.ip || "—"}</td>
                    <td className="max-w-xs px-4 py-3">
                      {row.diff ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-forest-700">View JSON</summary>
                          <pre className="mt-1 overflow-x-auto rounded bg-stone-50 p-2 text-[10px] text-stone-600 dark:bg-stone-900">
                            {JSON.stringify(row.diff, null, 2).slice(0, 400)}
                            {JSON.stringify(row.diff).length > 400 ? "…" : ""}
                          </pre>
                        </details>
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
