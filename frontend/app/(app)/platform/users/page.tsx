"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Download, MoreHorizontal } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { BulkActionBar } from "@/components/platform/bulk-action-bar";
import { backupSessionForImpersonation } from "@/components/platform/impersonation-banner";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { auth } from "@/lib/api";
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

type MenuUser = {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
};

function UserRowMenu({
  row,
  currentUserId,
  busy,
  onAction,
}: {
  row: MenuUser;
  currentUserId?: string;
  busy: boolean;
  onAction: (stepUp: NonNullable<StepUpState>) => void;
}) {
  const t = useTranslations("platformAdmin.users");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative flex items-center justify-end gap-2" ref={rootRef}>
      <Link
        href={`/platform/users/${row.id}`}
        className="text-xs font-medium text-forest-700 hover:underline dark:text-forest-400"
      >
        {t("menuSupport")}
      </Link>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        aria-label={t("menuMoreActions", { email: row.email })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 min-w-[11rem] rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-stone-50 disabled:opacity-50 dark:hover:bg-stone-800"
            disabled={busy || row.id === currentUserId || row.role === "admin" || !row.is_active}
            onClick={() => {
              setOpen(false);
              onAction({ kind: "impersonate", userId: row.id, email: row.email });
            }}
          >
            {t("menuViewAsUser")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-stone-50 disabled:opacity-50 dark:hover:bg-stone-800"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onAction({ kind: "force-reset", userId: row.id, email: row.email });
            }}
          >
            {t("menuResetPassword")}
          </button>
          {!row.is_verified ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs hover:bg-stone-50 disabled:opacity-50 dark:hover:bg-stone-800"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  onAction({ kind: "resend-verify", userId: row.id, email: row.email });
                }}
              >
                {t("menuResendVerification")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs hover:bg-stone-50 disabled:opacity-50 dark:hover:bg-stone-800"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  onAction({
                    kind: "resend-verify",
                    userId: row.id,
                    email: row.email,
                    markVerified: true,
                  });
                }}
              >
                {t("menuMarkVerified")}
              </button>
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs text-rose-700 hover:bg-stone-50 disabled:opacity-50 dark:hover:bg-stone-800"
            disabled={busy || row.id === currentUserId}
            onClick={() => {
              setOpen(false);
              onAction({ kind: "revoke-sessions", userId: row.id, email: row.email });
            }}
          >
            {t("menuRevokeSessions")}
          </button>
          <Link
            href={`/platform/users/${row.id}`}
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-stone-50 dark:hover:bg-stone-800"
            onClick={() => setOpen(false)}
          >
            {t("menuOpenDetail")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function PlatformUsersPage() {
  const t = useTranslations("platformAdmin.users");
  const tc = useTranslations("platformAdmin.common");
  const qc = useQueryClient();
  const router = useRouter();
  const { user, setSession, setUser } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stepUp, setStepUp] = useState<StepUpState>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

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
      notifyPlatformAction(t("notifyUserUpdated"), { audit: { actionPrefix: "platform.user." } });
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
        "force-reset": t("notifyPasswordResetSent"),
        "resend-verify": variables.markVerified
          ? t("notifyMarkedVerified")
          : t("notifyVerificationSent"),
        "revoke-sessions": t("notifySessionsRevoked"),
      };
      const auditActions = {
        "force-reset": "platform.user.force_password_reset",
        "resend-verify": variables.markVerified
          ? "platform.user.mark_verified"
          : "platform.user.resend_verification",
        "revoke-sessions": "platform.user.revoke_sessions",
      };
      const hint = result?.dev_hint ? tc("devHint", { hint: result.dev_hint }) : "";
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
        t("notifyBulkComplete", { processed: result.processed, skipped: result.skipped }),
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
      notifyPlatformAction(t("notifyExported"));
    },
    onError: (err) => notifyPlatformError(err),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const stepUpBusy =
    impersonate.isPending ||
    updateUser.isPending ||
    supportAction.isPending ||
    bulkAction.isPending;
  const hasFilters = Boolean(search || roleFilter || activeFilter);
  const empty = !isLoading && (data?.items.length ?? 0) === 0;

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

  function bulkActionLabel(action: "activate" | "deactivate" | "revoke_sessions"): string {
    if (action === "activate") return t("bulkActionActivate");
    if (action === "deactivate") return t("bulkActionDeactivate");
    return t("bulkActionRevokeSessions");
  }

  return (
    <PlatformShell pageHotkeys={pageHotkeys}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-stone-600">{tc("search")}</span>
            <input
              ref={searchRef}
              className="input w-full"
              placeholder={t("searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">{tc("role")}</span>
            <select
              className="input"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("allRoles")}</option>
              {(roles ?? []).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
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
              <option value="inactive">{tc("inactive")}</option>
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
              className="btn-secondary text-xs"
              onClick={() => setStepUp({ kind: "bulk", action: "activate" })}
            >
              {tc("activate")}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setStepUp({ kind: "bulk", action: "deactivate" })}
            >
              {tc("deactivate")}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setStepUp({ kind: "bulk", action: "revoke_sessions" })}
            >
              {t("bulkRevokeSessions")}
            </button>
          </BulkActionBar>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center dark:border-stone-700">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
              {hasFilters ? t("emptyFiltered") : t("emptyDefault")}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {hasFilters ? t("emptyHintFiltered") : t("emptyHintDefault")}
            </p>
            {hasFilters ? (
              <button
                type="button"
                className="btn-secondary mt-4 text-xs"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setRoleFilter("");
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
                  <th className="px-4 py-3 font-medium">{t("tableUser")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableOrg")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableRole")}</th>
                  <th className="px-4 py-3 font-medium">{t("tablePrograms")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableStatus")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableLastLogin")}</th>
                  {fullAdmin ? (
                    <th className="px-4 py-3 text-right font-medium">{tc("actions")}</th>
                  ) : null}
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
                        <div className="mt-1 text-xs text-amber-700">{t("unverifiedEmail")}</div>
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
                          if (fullAdmin && (nextRole === "admin" || row.role === "admin")) {
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
                        <span className="text-xs">
                          {row.is_active ? tc("active") : tc("inactive")}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {row.last_login_at
                        ? new Date(row.last_login_at).toLocaleString()
                        : tc("never")}
                    </td>
                    {fullAdmin ? (
                      <td className="px-4 py-3">
                        <UserRowMenu
                          row={row}
                          currentUserId={user?.id}
                          busy={stepUpBusy}
                          onAction={setStepUp}
                        />
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

      <StepUpModal
        open={stepUp !== null}
        title={
          stepUp?.kind === "impersonate"
            ? t("stepUpImpersonateTitle", { email: stepUp.email })
            : stepUp?.kind === "bulk"
              ? t("stepUpBulkTitle", {
                  action: bulkActionLabel(stepUp.action),
                  count: selectedIds.size,
                })
              : stepUp?.kind === "force-reset"
                ? t("stepUpForceResetTitle", { email: stepUp.email })
                : stepUp?.kind === "resend-verify"
                  ? stepUp.markVerified
                    ? t("stepUpMarkVerifiedTitle", { email: stepUp.email })
                    : t("stepUpResendVerifyTitle", { email: stepUp.email })
                  : stepUp?.kind === "revoke-sessions"
                    ? t("stepUpRevokeSessionsTitle", { email: stepUp.email })
                    : t("stepUpConfirmSensitive")
        }
        description={
          stepUp?.kind === "impersonate"
            ? t("stepUpImpersonateDesc")
            : stepUp?.kind === "bulk"
              ? t("stepUpBulkDesc")
              : stepUp?.kind === "force-reset"
                ? t("stepUpForceResetDesc")
                : stepUp?.kind === "resend-verify"
                  ? stepUp.markVerified
                    ? t("stepUpMarkVerifiedDesc")
                    : t("stepUpResendVerifyDesc")
                  : stepUp?.kind === "revoke-sessions"
                    ? t("stepUpRevokeSessionsDesc")
                    : t("stepUpUpdateDesc")
        }
        confirmLabel={
          stepUp?.kind === "impersonate"
            ? t("stepUpStartImpersonation")
            : stepUp?.kind === "bulk"
              ? t("stepUpApplySelected")
              : stepUp?.kind === "force-reset"
                ? t("stepUpSendResetEmail")
                : stepUp?.kind === "resend-verify"
                  ? stepUp.markVerified
                    ? t("menuMarkVerified")
                    : t("stepUpSendVerification")
                  : stepUp?.kind === "revoke-sessions"
                    ? t("menuRevokeSessions")
                    : t("stepUpConfirmChange")
        }
        danger={
          stepUp?.kind === "revoke-sessions" ||
          (stepUp?.kind === "bulk" && stepUp.action !== "activate") ||
          (stepUp?.kind === "update" && stepUp.is_active === false)
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
