"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrgCreditsSummaryPanel } from "@/components/settings/org-credits-summary-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { useAuth } from "@/lib/auth-store";

export default function SettingsGeneralPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <SettingsSection title="Account">
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-600 text-lg font-semibold text-white">
            {(user?.full_name || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-stone-900 dark:text-stone-50">{user?.full_name}</p>
            <p className="truncate text-sm text-stone-500">{user?.email}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            {user?.role}
          </span>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Carbon"
        description="Estimate sequestration for a tree or review credit totals across your organization."
      >
        <div className="card divide-y divide-stone-200 p-0 dark:divide-stone-800">
          <Link
            href="/settings/carbon"
            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-stone-50 dark:hover:bg-stone-800/50"
          >
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-50">Carbon calculator</p>
              <p className="text-sm text-stone-500">Biomass, CO₂e, and credit potential for a single tree</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
          </Link>
          <div className="px-5 py-4">
            <p className="mb-3 text-sm font-medium text-stone-800 dark:text-stone-200">Organization credits</p>
            <OrgCreditsSummaryPanel />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
