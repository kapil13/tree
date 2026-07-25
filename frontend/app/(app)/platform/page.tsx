"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, ClipboardList, Globe2, Users } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { platformAdmin } from "@/lib/platform-api";

export default function PlatformOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => platformAdmin.overview(),
  });

  return (
    <PlatformShell>
      {isLoading || !data ? (
        <p className="text-sm text-stone-500">Loading overview…</p>
      ) : (
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
            href="/platform/users"
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
