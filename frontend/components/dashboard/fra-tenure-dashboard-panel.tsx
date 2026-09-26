"use client";

import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { compliance } from "@/lib/api";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";

export function FraTenureDashboardPanel() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "compliance-portfolio-fra"),
    queryFn: () => compliance.portfolioSummary(),
    staleTime: 60_000,
  });

  const gapProjects =
    data?.projects.filter((project) => project.safeguard_gaps > 0) ?? [];
  const gapCount = data?.projects_with_safeguard_gaps ?? gapProjects.length;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
            <Shield className="h-4 w-4 text-amber-800" />
            FRA / tenure safeguards
          </div>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            Gram sabha resolutions, FPIC minutes, and patta/CFR references for community and
            government schemes.
          </p>
        </div>
        <Link href="/portfolio-health?tab=compliance" className="btn-secondary text-xs">
          Portfolio compliance
        </Link>
      </div>
      <p className="mt-3 text-sm text-stone-700 dark:text-stone-200">
        {isLoading
          ? "Loading safeguard status…"
          : gapCount > 0
            ? `${gapCount} project${gapCount === 1 ? "" : "s"} need safeguard documents`
            : "All tracked projects have safeguard documents on file"}
      </p>
      {gapProjects.length > 0 && (
        <ul className="mt-3 space-y-2">
          {gapProjects.slice(0, 4).map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}/compliance?section=safeguards`}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm hover:bg-amber-50 dark:border-amber-900 dark:bg-stone-900"
              >
                <span>
                  <span className="font-medium">{project.name}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    {project.safeguard_gaps} missing
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-forest-700" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
