"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Shield } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { backupSessionForImpersonation } from "@/components/platform/impersonation-banner";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { UserPlatformGrantsPanel } from "@/components/platform/user-platform-grants-panel";
import { auth } from "@/lib/api";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { buildPlatformAuditUrl } from "@/lib/platform-audit-link";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";

const ACTION_LABELS: Record<string, string> = {
  "platform.user.role_update": "Role changed",
  "platform.user.force_password_reset": "Password reset sent",
  "platform.user.resend_verification": "Verification resent",
  "platform.user.mark_verified": "Marked verified",
  "platform.user.revoke_sessions": "Sessions revoked",
  "platform.user.impersonate": "Impersonation started",
  "platform.user.grants_update": "Grants updated",
};

type StepUpState =
  | null
  | { kind: "impersonate" }
  | { kind: "force-reset" }
  | { kind: "resend-verify"; markVerified?: boolean }
  | { kind: "revoke-sessions" };

export default function PlatformUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const { user: currentUser, setSession, setUser } = useAuth();
  const fullAdmin = isFullPlatformAdmin(currentUser);
  const [auditTab, setAuditTab] = useState<"on" | "by">("on");
  const [stepUp, setStepUp] = useState<StepUpState>(null);

  const { data: target, isLoading } = useQuery({
    queryKey: ["platform-user", userId],
    queryFn: () => platformAdmin.getUser(userId),
    enabled: Boolean(userId),
  });

  const auditParams =
    auditTab === "on"
      ? { resource_type: "user", resource_id: userId, page: 1, page_size: 15 }
      : { actor_user_id: userId, page: 1, page_size: 15 };

  const { data: auditData } = useQuery({
    queryKey: ["platform-user-audit", userId, auditTab],
    queryFn: () => platformAdmin.auditLogs(auditParams),
    enabled: Boolean(userId) && fullAdmin,
  });

  const impersonate = useMutation({
    mutationFn: ({ password, read_only }: { password: string; read_only?: boolean }) =>
      platformAdmin.impersonateUser(userId, { password, read_only }),
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
      password,
      markVerified,
    }: {
      kind: "force-reset" | "resend-verify" | "revoke-sessions";
      password: string;
      markVerified?: boolean;
    }) => {
      if (kind === "force-reset") return platformAdmin.forcePasswordReset(userId, password);
      if (kind === "resend-verify") {
        return platformAdmin.resendVerification(userId, { password, mark_verified: markVerified });
      }
      return platformAdmin.revokeSessions(userId, password);
    },
    onSuccess: (_, variables) => {
      setStepUp(null);
      const messages = {
        "force-reset": "Password reset email sent.",
        "resend-verify": variables.markVerified
          ? "User marked as verified."
          : "Verification email sent.",
        "revoke-sessions": "All sessions revoked.",
      };
      const auditPrefixes = {
        "force-reset": "platform.user.force_password_reset",
        "resend-verify": variables.markVerified
          ? "platform.user.mark_verified"
          : "platform.user.resend_verification",
        "revoke-sessions": "platform.user.revoke_sessions",
      };
      notifyPlatformAction(messages[variables.kind], {
        audit: { actionPrefix: `${auditPrefixes[variables.kind]}.` },
      });
      qc.invalidateQueries({ queryKey: ["platform-user", userId] });
      qc.invalidateQueries({ queryKey: ["platform-user-audit", userId] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  if (isLoading || !target) {
    return (
      <PlatformShell>
        <p className="text-sm text-stone-500">Loading user…</p>
      </PlatformShell>
    );
  }

  const isSelf = currentUser?.id === target.id;
  const stepUpBusy = impersonate.isPending || supportAction.isPending;

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <Link href="/platform/users" className="text-sm text-forest-700 hover:underline">
            ← Users
          </Link>
          <h2 className="mt-2 text-2xl font-semibold">{target.full_name}</h2>
          <p className="text-sm text-stone-500">
            {target.email}
            {target.phone ? ` · ${target.phone}` : ""}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Platform role" value={target.role} />
          <Stat
            label="Organization"
            value={target.organization_name ?? "—"}
            hint={target.org_role ?? undefined}
          />
          <Stat
            label="Status"
            value={target.is_active ? "Active" : "Inactive"}
            hint={target.is_verified ? "Email verified" : "Unverified email"}
          />
          <Stat
            label="Last login"
            value={
              target.last_login_at
                ? new Date(target.last_login_at).toLocaleString()
                : "Never"
            }
          />
        </div>

        {fullAdmin ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-forest-700" />
              <h3 className="text-lg font-semibold">Sessions</h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Auth uses stateless JWTs — individual devices are not listed. Revoking sessions
              invalidates all tokens issued before the revocation timestamp.
            </p>
            <p className="mt-2 text-sm">
              <span className="text-stone-500">Last session revocation: </span>
              <span className="font-medium">
                {target.sessions_invalidated_at
                  ? new Date(target.sessions_invalidated_at).toLocaleString()
                  : "No revocation on record"}
              </span>
            </p>
            <button
              type="button"
              className="btn-secondary mt-3 text-rose-700"
              disabled={isSelf || supportAction.isPending}
              onClick={() => setStepUp({ kind: "revoke-sessions" })}
            >
              Revoke all sessions
            </button>
          </section>
        ) : null}

        {fullAdmin ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="mb-3 text-lg font-semibold">Support actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={isSelf || target.role === "admin" || !target.is_active || impersonate.isPending}
                onClick={() => setStepUp({ kind: "impersonate" })}
              >
                View as user
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={supportAction.isPending}
                onClick={() => setStepUp({ kind: "force-reset" })}
              >
                Reset password
              </button>
              {!target.is_verified ? (
                <>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={supportAction.isPending}
                    onClick={() => setStepUp({ kind: "resend-verify" })}
                  >
                    Resend verification
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={supportAction.isPending}
                    onClick={() => setStepUp({ kind: "resend-verify", markVerified: true })}
                  >
                    Mark verified
                  </button>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {fullAdmin ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="mb-3 text-lg font-semibold">Platform module grants</h3>
            <UserPlatformGrantsPanel
              userId={target.id}
              userEmail={target.email}
              userRole={target.role}
            />
          </section>
        ) : null}

        {fullAdmin ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Audit trail</h3>
              <Link
                href={buildPlatformAuditUrl({
                  resourceType: "user",
                  resourceId: userId,
                })}
                className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline"
              >
                Open in audit log
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                className={auditTab === "on" ? "btn-primary text-xs" : "btn-ghost text-xs"}
                onClick={() => setAuditTab("on")}
              >
                Actions on user
              </button>
              <button
                type="button"
                className={auditTab === "by" ? "btn-primary text-xs" : "btn-ghost text-xs"}
                onClick={() => setAuditTab("by")}
              >
                Actions by user
              </button>
            </div>
            {auditData?.items.length === 0 ? (
              <p className="text-sm text-stone-500">No audit events for this view.</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {auditData?.items.map((entry) => (
                  <li key={entry.id} className="py-2.5 text-sm">
                    <div className="font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </div>
                    <div className="text-xs text-stone-500">
                      {new Date(entry.created_at).toLocaleString()}
                      {entry.actor_email ? ` · ${entry.actor_email}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h3 className="mb-2 text-lg font-semibold">Programs</h3>
          <p className="text-sm text-stone-600">
            {target.enrolled_program_codes?.length
              ? target.enrolled_program_codes.join(", ")
              : "No enrolled programs"}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Member since {new Date(target.created_at).toLocaleDateString()}
            {target.email_verified_at
              ? ` · Verified ${new Date(target.email_verified_at).toLocaleDateString()}`
              : ""}
          </p>
        </section>
      </div>

      <StepUpModal
        open={stepUp !== null}
        title={
          stepUp?.kind === "impersonate"
            ? `Impersonate ${target.email}`
            : stepUp?.kind === "force-reset"
              ? `Reset password for ${target.email}`
              : stepUp?.kind === "resend-verify"
                ? stepUp.markVerified
                  ? `Mark ${target.email} verified`
                  : `Resend verification to ${target.email}`
                : stepUp?.kind === "revoke-sessions"
                  ? `Revoke sessions for ${target.email}`
                  : "Confirm"
        }
        description={
          stepUp?.kind === "impersonate"
            ? "Re-enter your password to view the app as this user."
            : stepUp?.kind === "revoke-sessions"
              ? "Signs the user out everywhere immediately."
              : "Re-enter your password to confirm this support action."
        }
        confirmLabel={
          stepUp?.kind === "impersonate"
            ? "Start impersonation"
            : stepUp?.kind === "force-reset"
              ? "Send reset email"
              : stepUp?.kind === "resend-verify"
                ? stepUp.markVerified
                  ? "Mark verified"
                  : "Send verification"
                : stepUp?.kind === "revoke-sessions"
                  ? "Revoke sessions"
                  : "Confirm"
        }
        showReadOnlyOption={stepUp?.kind === "impersonate"}
        busy={stepUpBusy}
        onClose={() => setStepUp(null)}
        onConfirm={(password, _reason, readOnly) => {
          if (!stepUp) return;
          if (stepUp.kind === "impersonate") {
            impersonate.mutate({ password, read_only: readOnly });
          } else if (stepUp.kind === "force-reset") {
            supportAction.mutate({ kind: "force-reset", password });
          } else if (stepUp.kind === "resend-verify") {
            supportAction.mutate({
              kind: "resend-verify",
              password,
              markVerified: stepUp.markVerified,
            });
          } else if (stepUp.kind === "revoke-sessions") {
            supportAction.mutate({ kind: "revoke-sessions", password });
          }
        }}
      />
    </PlatformShell>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
