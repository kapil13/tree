"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Globe2,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { buildPlatformAuditUrl } from "@/lib/platform-audit-link";
import { canAccessOpsAdmin } from "@/lib/platform-access";
import { platformAdmin } from "@/lib/platform-api";
import { useAuth } from "@/lib/auth-store";

const ACTION_LABELS: Record<string, string> = {
  "platform.user.role_update": "User role changed",
  "platform.user.impersonate": "Impersonation started",
  "platform.user.revoke_sessions": "Sessions revoked",
  "platform.organization.bulk_suspend": "Bulk org suspend",
  "platform.governance.update": "Governance settings updated",
  "platform.program_access.bulk_approve": "Bulk program access approved",
};

const QUICK_LINKS = [
  { href: "/platform/users", label: "Manage users", icon: Users },
  { href: "/platform/organizations", label: "Organizations", icon: Building2 },
  { href: "/platform/program-access", label: "Program queue", icon: ClipboardList },
  { href: "/platform/audit", label: "Audit log", icon: ScrollText },
  { href: "/platform/governance", label: "Governance", icon: Shield },
];

export default function PlatformOverviewPage() {
  const { user } = useAuth();
  const canOps = canAccessOpsAdmin(user);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => platformAdmin.overview(),
  });

  const { data: opsSummary } = useQuery({
    queryKey: ["platform-ops-summary"],
    queryFn: () => platformAdmin.opsSummary(),
    enabled: canOps,
    retry: 0,
  });

  const { data: recentAudit, isLoading: auditLoading } = useQuery({
    queryKey: ["platform-audit-recent"],
    queryFn: () =>
      platformAdmin.auditLogs({
        page: 1,
        page_size: 8,
        action_prefix: "platform.",
      }),
  });

  const pendingAccess = data?.program_access.pending ?? 0;
  const failedJobs = opsSummary?.workers.failed_job_count ?? 0;

  return (
    <PlatformShell>
      {isLoading || !data ? (
        <p className="text-sm text-stone-500">Loading overview…</p>
      ) : (
        <div className="space-y-6">
          {pendingAccess > 0 || failedJobs > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-medium">Needs attention</p>
              <ul className="mt-2 space-y-1 text-xs">
                {pendingAccess > 0 ? (
                  <li>
                    <Link href="/platform/program-access" className="font-medium underline-offset-2 hover:underline">
                      {pendingAccess} pending program access request
                      {pendingAccess === 1 ? "" : "s"}
                    </Link>
                  </li>
                ) : null}
                {failedJobs > 0 ? (
                  <li>
                    <Link href="/platform/ops" className="font-medium underline-offset-2 hover:underline">
                      {failedJobs} failed monitoring job
                      {failedJobs === 1 ? "" : "s"} in the recent window
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Users"
              value={String(data.users.total)}
              hint={`${data.users.active} active · ${data.users.inactive} inactive`}
              href="/platform/users"
            />
            <StatCard
              icon={Building2}
              label="Organizations"
              value={String(data.organizations.total)}
              href="/platform/organizations"
            />
            <StatCard
              icon={ClipboardList}
              label="Pending program requests"
              value={String(data.program_access.pending)}
              href="/platform/program-access"
            />
            <StatCard
              icon={Globe2}
              label="Platform admins"
              value={String(data.users.admins)}
              href="/platform/users"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                  Recent activity
                </h2>
                <Link
                  href="/platform/audit"
                  className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline dark:text-forest-400"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {auditLoading ? (
                <p className="text-sm text-stone-500">Loading activity…</p>
              ) : recentAudit?.items.length === 0 ? (
                <p className="text-sm text-stone-500">No recent platform actions.</p>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {recentAudit?.items.map((entry) => {
                    const actor =
                      entry.actor_email || entry.actor_full_name || entry.actor_user_id || "System";
                    return (
                      <li key={entry.id} className="py-2.5 text-sm">
                        <div className="font-medium">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-500">
                          {new Date(entry.created_at).toLocaleString()} · {actor}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
                Quick links
              </h2>
              <ul className="space-y-2">
                {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-stone-700 transition hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      <Icon className="h-4 w-4 text-stone-400" />
                      {label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={buildPlatformAuditUrl({ actionPrefix: "platform.user." })}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-stone-700 transition hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ScrollText className="h-4 w-4 text-stone-400" />
                    User change audit
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </PlatformShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-forest-300 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center gap-2 text-stone-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </Link>
  );
}
