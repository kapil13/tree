"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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
      notifyPlatformAction("Organization updated.", {
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
        `Bulk action complete: ${result.processed} processed, ${result.skipped} skipped.`,
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
      notifyPlatformAction("Organizations exported.");
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
    { keys: "/", description: "Focus search", handler: () => searchRef.current?.focus() },
  ];

  return (
    <PlatformShell pageHotkeys={pageHotkeys}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          View and manage tenant organizations. Suspending blocks member sign-in while preserving
          data. Use bulk actions for incident response at scale.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-stone-600">Search</span>
            <input
              ref={searchRef}
              className="input w-full"
              placeholder="Name or slug"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Status</span>
            <select
              className="input"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as "" | "active" | "inactive");
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Suspended</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {fullAdmin ? (
          <BulkActionBar selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
            <button
              type="button"
              className="btn-secondary text-xs text-rose-700"
              onClick={() => setSuspendTarget({ kind: "bulk", suspending: true })}
            >
              Suspend selected
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={bulkOrgAction.isPending}
              onClick={() => bulkOrgAction.mutate({ is_active: true })}
            >
              Reactivate selected
            </button>
          </BulkActionBar>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading organizations…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                <tr>
                  {fullAdmin ? (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={
                          (data?.items ?? []).length > 0 &&
                          (data?.items ?? []).every((row) => selectedIds.has(row.id))
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Members</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  {fullAdmin ? <th className="px-4 py-3 font-medium">Actions</th> : null}
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
                      <span className="text-xs">
                        {row.is_active ? "Active" : "Suspended"}
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
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            disabled={updateOrg.isPending}
                            onClick={() =>
                              updateOrg.mutate({ id: row.id, is_active: true })
                            }
                          >
                            Reactivate
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
              {data.total} organization{data.total !== 1 ? "s" : ""} · page {data.page} of{" "}
              {totalPages}
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

      <OrgSuspendModal
        open={suspendTarget?.kind === "single" && suspendTarget.suspending}
        orgName={suspendTarget?.kind === "single" ? suspendTarget.name : ""}
        suspending
        busy={updateOrg.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(password, reason, revokeMemberSessions) => {
          if (suspendTarget?.kind !== "single") return;
          updateOrg.mutate({
            id: suspendTarget.id,
            is_active: false,
            reason,
            revoke_member_sessions: revokeMemberSessions,
            password_confirm: password,
          });
        }}
      />

      <OrgSuspendModal
        open={suspendTarget?.kind === "bulk" && suspendTarget.suspending}
        orgName={`${selectedIds.size} organizations`}
        suspending
        busy={bulkOrgAction.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(password, reason, revokeMemberSessions) => {
          bulkOrgAction.mutate({
            is_active: false,
            password,
            reason,
            revoke_member_sessions: revokeMemberSessions,
          });
        }}
      />

    </PlatformShell>
  );
}
