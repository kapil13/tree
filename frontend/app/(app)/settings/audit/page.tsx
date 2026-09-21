"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { audit } from "@/lib/api";
import { organizations } from "@/lib/organizations-api";
import { useAuth } from "@/lib/auth-store";
import { ScrollText } from "lucide-react";

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

export default function AuditLogPage() {
  const t = useTranslations("settingsAuditPage");
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
      map.set(user.id, { name: user.full_name || t("you"), email: user.email || "" });
    }
    for (const m of membersQ.data?.members ?? []) {
      map.set(m.id, { name: m.full_name || m.email, email: m.email });
    }
    return map;
  }, [membersQ.data?.members, t, user?.email, user?.full_name, user?.id]);

  function humanizeAction(action: string): string {
    const key = `actions.${action.replace(/\./g, ".")}`;
    if (t.has(key as "actions.tree.create")) {
      return t(key as "actions.tree.create");
    }
    const parts = action.split(".");
    const last = parts[parts.length - 1] ?? action;
    const noun = parts[0] ?? "";
    const verb = last.replace(/_/g, " ");
    const label = `${noun} ${verb}`.trim();
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function actorLabel(actorId: string | null): string {
    if (!actorId) return t("system");
    const known = actorById.get(actorId);
    if (known) {
      return known.email ? `${known.name} (${known.email})` : known.name;
    }
    return shortId(actorId);
  }

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {error ? (
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {t("accessDenied")}
        </div>
      ) : isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : !data?.items.length ? (
        <EmptyState
          icon={ScrollText}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("colTime")}</th>
                  <th className="px-4 py-3 font-medium">{t("colAction")}</th>
                  <th className="px-4 py-3 font-medium">{t("colResource")}</th>
                  <th className="px-4 py-3 font-medium">{t("colActor")}</th>
                  <th className="px-4 py-3 font-medium">{t("colIp")}</th>
                  <th className="px-4 py-3 font-medium">{t("colDetails")}</th>
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
                          <summary className="cursor-pointer text-xs text-forest-700">{t("viewJson")}</summary>
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
            {t("showingEvents", { shown: data.items.length, total: data.total })}
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
