"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { BulkActionBar } from "@/components/platform/bulk-action-bar";
import { backupSessionForImpersonation } from "@/components/platform/impersonation-banner";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { UserPlatformGrantsPanel } from "@/components/platform/user-platform-grants-panel";
import { errorMessage, auth } from "@/lib/api";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";
import { downloadBlob } from "@/lib/download-blob";
import type { PlatformHotkey } from "@/lib/use-platform-hotkeys";

type StepUpState =
  | null
  | { kind: "impersonate"; userId: string; email: string }
  | { kind: "update"; id: string; role: string; is_active?: boolean }
  | { kind: "force-reset"; userId: string; email: string }
  | { kind: "resend-verify"; userId: string; email: string; markVerified?: boolean }
  | { kind: "revoke-sessions"; userId: string; email: string }
  | { kind: "bulk"; action: "activate" | "deactivate" | "revoke_sessions" };

export default function PlatformUsersPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { user, setSession, setUser } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [grantsUserId, setGrantsUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stepUp, setStepUp] = useState<StepUpState>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
      notifyPlatformAction("User updated.", { audit: { actionPrefix: "platform.user." } });
      setStepUp(null);
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  const impersonate = useMutation({
    mutationFn: ({
      id,
      password,
      reason,
      read_only,
    }: {
      id: string;
      password: string;
      reason?: string;
      read_only?: boolean;
    }) => platformAdmin.impersonateUser(id, { password, reason, read_only }),
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
    onError: (err) => notifyPlatformError(err),
  });

  const supportAction = useMutation({
    mutationFn: async ({
      kind,
      userId,
      password,
      markVerified,
    }: {
      kind: "force-reset" | "resend-verify" | "revoke-sessions";
      userId: string;
      password: string;
      markVerified?: boolean;
    }) => {
      if (kind === "force-reset") {
        return platformAdmin.forcePasswordReset(userId, password);
      }
      if (kind === "resend-verify") {
        return platformAdmin.resendVerification(userId, {
          password,
          mark_verified: markVerified,
        });
      }
      return platformAdmin.revokeSessions(userId, password);
    },
    onSuccess: (result: { status: string; dev_hint?: string | null }, variables) => {
      setStepUp(null);
      const labels = {
        "force-reset": "Password reset email sent.",
        "resend-verify": variables.markVerified
          ? "User marked as verified."
          : "Verification email sent.",
        "revoke-sessions": "All sessions revoked.",
      };
      const auditActions = {
        "force-reset": "platform.user.force_password_reset",
        "resend-verify": variables.markVerified
          ? "platform.user.mark_verified"
          : "platform.user.resend_verification",
        "revoke-sessions": "platform.user.revoke_sessions",
      };
      const hint = result?.dev_hint ? ` Dev hint: ${result.dev_hint}` : "";
      notifyPlatformAction(`${labels[variables.kind]}${hint}`, {
        audit: { actionPrefix: `${auditActions[variables.kind]}.` },
      });
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  const bulkAction = useMutation({
    mutationFn: ({
      action,
      password,
    }: {
      action: "activate" | "deactivate" | "revoke_sessions";
      password: string;
    }) =>
      platformAdmin.bulkUserAction({
        user_ids: Array.from(selectedIds),
        action,
        password,
      }),
    onSuccess: (result) => {
      setStepUp(null);
      setSelectedIds(new Set());
      notifyPlatformAction(
        `Bulk action complete: ${result.processed} processed, ${result.skipped} skipped.`,
        { audit: { actionPrefix: "platform.user.bulk_" } },
      );
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  const exportCsv = useMutation({
    mutationFn: () =>
      platformAdmin.exportUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter === "active",
      }),
    onSuccess: (blob) => {
      downloadBlob(blob, "platform-users.csv");
      notifyPlatformAction("Users exported.");
    },
    onError: (err) => notifyPlatformError(err),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const stepUpBusy =
    impersonate.isPending ||
    updateUser.isPending ||
    supportAction.isPending ||
    bulkAction.isPending;

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-stone-600">Search</span>
            <input
              ref={searchRef}
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
              className="btn-secondary text-xs"
              onClick={() => setStepUp({ kind: "bulk", action: "activate" })}
            >
              Activate
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setStepUp({ kind: "bulk", action: "deactivate" })}
            >
              Deactivate
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setStepUp({ kind: "bulk", action: "revoke_sessions" })}
            >
              Revoke sessions
            </button>
          </BulkActionBar>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading users…</p>
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
                        href={`/platform/users/${row.id}`}
                        className="block hover:text-forest-700"
                      >
                        <div className="font-medium">{row.full_name}</div>
                        <div className="text-xs text-stone-500">{row.email}</div>
                      </Link>
                      {!row.is_verified ? (
                        <div className="mt-1 text-xs text-amber-700">Unverified email</div>
                      ) : null}
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
                        <div className="flex min-w-[9rem] flex-col gap-1">
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
                            disabled={supportAction.isPending}
                            onClick={() =>
                              setStepUp({
                                kind: "force-reset",
                                userId: row.id,
                                email: row.email,
                              })
                            }
                          >
                            Reset password
                          </button>
                          {!row.is_verified ? (
                            <>
                              <button
                                type="button"
                                className="btn-ghost text-xs"
                                disabled={supportAction.isPending}
                                onClick={() =>
                                  setStepUp({
                                    kind: "resend-verify",
                                    userId: row.id,
                                    email: row.email,
                                  })
                                }
                              >
                                Resend verification
                              </button>
                              <button
                                type="button"
                                className="btn-ghost text-xs"
                                disabled={supportAction.isPending}
                                onClick={() =>
                                  setStepUp({
                                    kind: "resend-verify",
                                    userId: row.id,
                                    email: row.email,
                                    markVerified: true,
                                  })
                                }
                              >
                                Mark verified
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className="btn-ghost text-xs text-rose-700"
                            disabled={supportAction.isPending || row.id === user?.id}
                            onClick={() =>
                              setStepUp({
                                kind: "revoke-sessions",
                                userId: row.id,
                                email: row.email,
                              })
                            }
                          >
                            Revoke sessions
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

      </div>

      <StepUpModal
        open={stepUp !== null}
        title={
          stepUp?.kind === "impersonate"
            ? `Impersonate ${stepUp.email}`
            : stepUp?.kind === "bulk"
              ? `Bulk ${stepUp.action.replace("_", " ")} (${selectedIds.size} users)`
            : stepUp?.kind === "force-reset"
              ? `Reset password for ${stepUp.email}`
              : stepUp?.kind === "resend-verify"
                ? stepUp.markVerified
                  ? `Mark ${stepUp.email} verified`
                  : `Resend verification to ${stepUp.email}`
                : stepUp?.kind === "revoke-sessions"
                  ? `Revoke sessions for ${stepUp.email}`
                  : "Confirm sensitive change"
        }
        description={
          stepUp?.kind === "impersonate"
            ? "Re-enter your password to view the app as this user. All actions are audited."
            : stepUp?.kind === "bulk"
              ? "Re-enter your password to apply this action to all selected users."
            : stepUp?.kind === "force-reset"
              ? "Sends a password-reset OTP to the user. Re-enter your password to confirm."
              : stepUp?.kind === "resend-verify"
                ? stepUp.markVerified
                  ? "Marks the account verified without an OTP. Re-enter your password to confirm."
                  : "Sends a verification OTP to the user. Re-enter your password to confirm."
                : stepUp?.kind === "revoke-sessions"
                  ? "Signs the user out everywhere. Existing tokens stop working immediately."
                  : "Re-enter your password to change admin access or deactivate this user."
        }
        confirmLabel={
          stepUp?.kind === "impersonate"
            ? "Start impersonation"
            : stepUp?.kind === "bulk"
              ? "Apply to selected"
            : stepUp?.kind === "force-reset"
              ? "Send reset email"
              : stepUp?.kind === "resend-verify"
                ? stepUp.markVerified
                  ? "Mark verified"
                  : "Send verification"
                : stepUp?.kind === "revoke-sessions"
                  ? "Revoke sessions"
                  : "Confirm change"
        }
        showReadOnlyOption={stepUp?.kind === "impersonate"}
        busy={stepUpBusy}
        onClose={() => setStepUp(null)}
        onConfirm={(password, reason, readOnly) => {
          if (!stepUp) return;
          if (stepUp.kind === "impersonate") {
            impersonate.mutate({
              id: stepUp.userId,
              password,
              reason,
              read_only: readOnly,
            });
          } else if (stepUp.kind === "update") {
            updateUser.mutate({
              id: stepUp.id,
              role: stepUp.role,
              is_active: stepUp.is_active,
              password_confirm: password,
            });
          } else if (stepUp.kind === "bulk") {
            bulkAction.mutate({ action: stepUp.action, password });
          } else if (
            stepUp.kind === "force-reset" ||
            stepUp.kind === "resend-verify" ||
            stepUp.kind === "revoke-sessions"
          ) {
            supportAction.mutate({
              kind: stepUp.kind,
              userId: stepUp.userId,
              password,
              markVerified: stepUp.kind === "resend-verify" ? stepUp.markVerified : undefined,
            });
          }
        }}
      />
    </PlatformShell>
  );
}
