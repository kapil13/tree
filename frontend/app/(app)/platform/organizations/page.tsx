"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { BulkActionBar } from "@/components/platform/bulk-action-bar";
import { OrgSuspendModal } from "@/components/platform/org-suspend-modal";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";
import { downloadBlob } from "@/lib/download-blob";
import type { PlatformHotkey } from "@/lib/use-platform-hotkeys";

export default function PlatformOrganizationsPage() {
  const t = useTranslations("platformAdmin.organizations");
  const tc = useTranslations("platformAdmin.common");
  const qc = useQueryClient();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const [suspendTarget, setSuspendTarget] = useState<
    | null
    | { kind: "single"; id: string; name: string; suspending: boolean }
    | { kind: "bulk"; suspending: boolean }
  >(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-organizations", search, activeFilter, page],
    queryFn: () =>
      platformAdmin.listOrganizations({
        search: search || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter === "active",
        page,
        page_size: 25,
      }),
  });

  const updateOrg = useMutation({
    mutationFn: ({
      id,
      is_active,
      name,
      reason,
      revoke_member_sessions,
      password_confirm,
    }: {
      id: string;
      is_active?: boolean;
      name?: string;
      reason?: string;
      revoke_member_sessions?: boolean;
      password_confirm?: string;
    }) =>
      platformAdmin.updateOrganization(id, {
        is_active,
        name,
        reason,
        revoke_member_sessions,
        password_confirm,
      }),
    onSuccess: () => {
      notifyPlatformAction(t("notifyUpdated"), {
        audit: { actionPrefix: "platform.organization." },
      });
      setSuspendTarget(null);
      qc.invalidateQueries({ queryKey: ["platform-organizations"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  const bulkOrgAction = useMutation({
    mutationFn: (payload: {
      is_active: boolean;
      password?: string;
      reason?: string;
      revoke_member_sessions?: boolean;
    }) =>
      platformAdmin.bulkOrgAction({
        org_ids: Array.from(selectedIds),
        is_active: payload.is_active,
        password: payload.password,
        reason: payload.reason,
        revoke_member_sessions: payload.revoke_member_sessions,
      }),
    onSuccess: (result) => {
      setSuspendTarget(null);
      setSelectedIds(new Set());
      notifyPlatformAction(
        t("notifyBulkComplete", { processed: result.processed, skipped: result.skipped }),
        { audit: { actionPrefix: "platform.organization.bulk_" } },
      );
      qc.invalidateQueries({ queryKey: ["platform-organizations"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  const exportCsv = useMutation({
    mutationFn: () =>
      platformAdmin.exportOrganizations({
        search: search || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter === "active",
      }),
    onSuccess: (blob) => {
      downloadBlob(blob, "platform-organizations.csv");
      notifyPlatformAction(t("notifyExported"));
    },
    onError: (err) => notifyPlatformError(err),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const ids = (data?.items ?? []).map((row) => row.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(ids));
  };

  const pageHotkeys: PlatformHotkey[] = [
    { keys: "/", description: tc("focusSearch"), handler: () => searchRef.current?.focus() },
  ];

  return (
    <PlatformShell pageHotkeys={pageHotkeys}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-300">{t("description")}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-stone-600">{tc("search")}</span>
            <input
              ref={searchRef}
              className="input w-full"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">{tc("status")}</span>
            <select
              className="input"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as "" | "active" | "inactive");
                setPage(1);
              }}
            >
              <option value="">{tc("all")}</option>
              <option value="active">{tc("active")}</option>
              <option value="inactive">{t("statusSuspended")}</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            <Download className="h-4 w-4" />
            {tc("exportCsv")}
          </button>
        </div>

        {fullAdmin ? (
          <BulkActionBar selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
            <button
              type="button"
              className="btn-secondary text-xs text-rose-700"
              onClick={() => setSuspendTarget({ kind: "bulk", suspending: true })}
            >
              {t("suspendSelected")}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={bulkOrgAction.isPending}
              onClick={() => setSuspendTarget({ kind: "bulk", suspending: false })}
            >
              {t("reactivateSelected")}
            </button>
          </BulkActionBar>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center dark:border-stone-700">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
              {search || activeFilter ? t("emptyFiltered") : t("emptyDefault")}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {search || activeFilter ? t("emptyHintFiltered") : t("emptyHintDefault")}
            </p>
            {search || activeFilter ? (
              <button
                type="button"
                className="btn-secondary mt-4 text-xs"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("");
                  setPage(1);
                }}
              >
                {tc("clearFilters")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                <tr>
                  {fullAdmin ? (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={tc("selectAllOnPage")}
                        checked={
                          (data?.items ?? []).length > 0 &&
                          (data?.items ?? []).every((row) => selectedIds.has(row.id))
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">{t("tableOrganization")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableType")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableMembers")}</th>
                  <th className="px-4 py-3 font-medium">{tc("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableCreated")}</th>
                  {fullAdmin ? <th className="px-4 py-3 font-medium">{tc("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-stone-100 dark:border-stone-800">
                    {fullAdmin ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Link
                        href={`/platform/organizations/${row.id}`}
                        className="font-medium text-forest-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <div className="text-xs text-stone-500">{row.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{row.type}</td>
                    <td className="px-4 py-3">{row.member_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.is_active
                            ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            : "inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
                        }
                      >
                        {row.is_active ? tc("active") : t("statusSuspended")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    {fullAdmin ? (
                      <td className="px-4 py-3">
                        {row.is_active ? (
                          <button
                            type="button"
                            className="btn-ghost text-xs text-rose-700"
                            onClick={() =>
                              setSuspendTarget({
                                kind: "single",
                                id: row.id,
                                name: row.name,
                                suspending: true,
                              })
                            }
                          >
                            {t("suspend")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            disabled={updateOrg.isPending}
                            onClick={() =>
                              setSuspendTarget({
                                kind: "single",
                                id: row.id,
                                name: row.name,
                                suspending: false,
                              })
                            }
                          >
                            {t("reactivate")}
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 ? (
          <div className="flex items-center justify-between text-sm text-stone-600">
            <span>
              {t("pagination", { total: data.total, page: data.page, totalPages })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {tc("previous")}
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tc("next")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <OrgSuspendModal
        open={suspendTarget?.kind === "single"}
        orgName={suspendTarget?.kind === "single" ? suspendTarget.name : ""}
        suspending={suspendTarget?.kind === "single" ? suspendTarget.suspending : true}
        busy={updateOrg.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(password, reason, revokeMemberSessions) => {
          if (suspendTarget?.kind !== "single") return;
          updateOrg.mutate({
            id: suspendTarget.id,
            is_active: !suspendTarget.suspending,
            reason,
            revoke_member_sessions: revokeMemberSessions,
            password_confirm: password,
          });
        }}
      />

      <OrgSuspendModal
        open={suspendTarget?.kind === "bulk"}
        orgName={t("bulkOrgCount", { count: selectedIds.size })}
        suspending={suspendTarget?.kind === "bulk" ? suspendTarget.suspending : true}
        busy={bulkOrgAction.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(password, reason, revokeMemberSessions) => {
          if (suspendTarget?.kind !== "bulk") return;
          bulkOrgAction.mutate({
            is_active: !suspendTarget.suspending,
            password,
            reason,
            revoke_member_sessions: revokeMemberSessions,
          });
        }}
      />
    </PlatformShell>
  );
}
