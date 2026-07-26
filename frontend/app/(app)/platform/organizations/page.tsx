"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlatformShell } from "@/components/platform/platform-shell";
import { errorMessage } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";

export default function PlatformOrganizationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

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
    }: {
      id: string;
      is_active?: boolean;
      name?: string;
    }) => platformAdmin.updateOrganization(id, { is_active, name }),
    onSuccess: () => {
      setMessage("Organization updated.");
      qc.invalidateQueries({ queryKey: ["platform-organizations"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          View and manage tenant organizations. Suspending an organization blocks new activity while
          preserving data.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-stone-600">Search</span>
            <input
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
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading organizations…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                <tr>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Members</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-stone-100 dark:border-stone-800">
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
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.is_active}
                          disabled={updateOrg.isPending}
                          onChange={(e) =>
                            updateOrg.mutate({ id: row.id, is_active: e.target.checked })
                          }
                        />
                        <span className="text-xs">
                          {row.is_active ? "Active" : "Suspended"}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
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

        {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      </div>
    </PlatformShell>
  );
}
