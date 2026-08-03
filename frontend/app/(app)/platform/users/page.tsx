"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  backupSessionForImpersonation,
} from "@/components/platform/impersonation-banner";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { UserPlatformGrantsPanel } from "@/components/platform/user-platform-grants-panel";
import { errorMessage, auth } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";

export default function PlatformUsersPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { user, setSession, setUser } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [grantsUserId, setGrantsUserId] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState<
    | null
    | { kind: "impersonate"; userId: string; email: string }
    | { kind: "update"; id: string; role: string; is_active?: boolean }
  >(null);

  const { data: roles } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: () => platformAdmin.roles(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform-users", search, roleFilter, activeFilter, page],
    queryFn: () =>
      platformAdmin.listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter === "active",
        page,
        page_size: 25,
      }),
  });

  const updateUser = useMutation({
    mutationFn: ({
      id,
      role,
      is_active,
      password_confirm,
    }: {
      id: string;
      role?: string;
      is_active?: boolean;
      password_confirm?: string;
    }) =>
      platformAdmin.updateUser(id, {
        role: role!,
        is_active,
        password_confirm,
      }),
    onSuccess: () => {
      setMessage("User updated.");
      setStepUp(null);
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const impersonate = useMutation({
    mutationFn: ({ id, password, reason }: { id: string; password: string; reason?: string }) =>
      platformAdmin.impersonateUser(id, { password, reason }),
    onSuccess: async (data) => {
      setStepUp(null);
      backupSessionForImpersonation();
      setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: "Bearer",
        expires_in: data.expires_in,
      });
      const me = await auth.me();
      setUser(me);
      router.push("/dashboard");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-stone-600">Search</span>
            <input
              className="input w-full"
              placeholder="Email or name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">Role</span>
            <select
              className="input"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              {(roles ?? []).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
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
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading users…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Org</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Programs</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  {fullAdmin ? <th className="px-4 py-3 font-medium">Support</th> : null}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.full_name}</div>
                      <div className="text-xs text-stone-500">{row.email}</div>
                      {grantsUserId === row.id && fullAdmin ? (
                        <div className="mt-3">
                          <UserPlatformGrantsPanel
                            userId={row.id}
                            userEmail={row.email}
                            userRole={row.role}
                          />
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {row.organization_name ?? "—"}
                      {row.org_role ? (
                        <div className="text-xs text-stone-400">{row.org_role}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input"
                        value={row.role}
                        disabled={
                          updateUser.isPending ||
                          row.id === user?.id ||
                          (!fullAdmin && row.role === "admin")
                        }
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          if (
                            fullAdmin &&
                            (nextRole === "admin" || row.role === "admin")
                          ) {
                            setStepUp({
                              kind: "update",
                              id: row.id,
                              role: nextRole,
                              is_active: row.is_active,
                            });
                          } else {
                            updateUser.mutate({ id: row.id, role: nextRole });
                          }
                        }}
                      >
                        {(roles ?? [])
                          .filter((role) => fullAdmin || role.value !== "admin")
                          .map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {row.enrolled_program_codes?.length
                        ? row.enrolled_program_codes.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.is_active}
                          disabled={updateUser.isPending || row.id === user?.id}
                          onChange={(e) => {
                            const active = e.target.checked;
                            if (!active) {
                              setStepUp({
                                kind: "update",
                                id: row.id,
                                role: row.role,
                                is_active: false,
                              });
                            } else {
                              updateUser.mutate({
                                id: row.id,
                                role: row.role,
                                is_active: true,
                              });
                            }
                          }}
                        />
                        <span className="text-xs">{row.is_active ? "Active" : "Inactive"}</span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {row.last_login_at
                        ? new Date(row.last_login_at).toLocaleString()
                        : "Never"}
                    </td>
                    {fullAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            disabled={
                              impersonate.isPending ||
                              row.id === user?.id ||
                              row.role === "admin" ||
                              !row.is_active
                            }
                            onClick={() =>
                              setStepUp({
                                kind: "impersonate",
                                userId: row.id,
                                email: row.email,
                              })
                            }
                          >
                            View as user
                          </button>
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            onClick={() =>
                              setGrantsUserId((current) =>
                                current === row.id ? null : row.id,
                              )
                            }
                          >
                            {grantsUserId === row.id ? "Hide grants" : "Module grants"}
                          </button>
                        </div>
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
              {data.total} user{data.total !== 1 ? "s" : ""} · page {data.page} of {totalPages}
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

      <StepUpModal
        open={stepUp !== null}
        title={
          stepUp?.kind === "impersonate"
            ? `Impersonate ${stepUp.email}`
            : "Confirm sensitive change"
        }
        description={
          stepUp?.kind === "impersonate"
            ? "Re-enter your password to view the app as this user. All actions are audited."
            : "Re-enter your password to change admin access or deactivate this user."
        }
        confirmLabel={stepUp?.kind === "impersonate" ? "Start impersonation" : "Confirm change"}
        busy={impersonate.isPending || updateUser.isPending}
        onClose={() => setStepUp(null)}
        onConfirm={(password, reason) => {
          if (!stepUp) return;
          if (stepUp.kind === "impersonate") {
            impersonate.mutate({ id: stepUp.userId, password, reason });
          } else {
            updateUser.mutate({
              id: stepUp.id,
              role: stepUp.role,
              is_active: stepUp.is_active,
              password_confirm: password,
            });
          }
        }}
      />
    </PlatformShell>
  );
}
