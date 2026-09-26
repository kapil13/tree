"use client";

import Link from "next/link";
import { ArrowRight, HardHat, Satellite } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects } from "@/lib/api";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";

export function MiningClosureDashboardPanel() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "mining-closure-projects"),
    queryFn: () => plantingProjects.list(),
    staleTime: 60_000,
  });

  const miningProjects =
    data?.items.filter(
      (project) =>
        project.scheme_code === "mining_reclamation" || project.segment === "industrial_greenbelt",
    ) ?? [];
  const primary = miningProjects[0];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <HardHat className="h-4 w-4 text-amber-800" />
          <p className="mt-2 text-sm font-semibold text-stone-900">PMCP / FMCP milestones</p>
          <p className="text-xs text-stone-600">
            {isLoading
              ? "Loading reclamation projects…"
              : miningProjects.length
                ? `${miningProjects.length} reclamation project(s) tracked`
                : "Create a mining reclamation project to track closure phases"}
          </p>
          {primary ? (
            <Link
              href={`/projects/${primary.id}?tab=overview`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 hover:underline"
            >
              Open {primary.name} <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <Link
              href="/projects/new"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 hover:underline"
            >
              New greenbelt project <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <Link
          href="/satellite"
          className="rounded-xl border border-stone-200 bg-white p-4 hover:bg-stone-50"
        >
          <Satellite className="h-4 w-4 text-forest-700" />
          <p className="mt-2 text-sm font-semibold text-stone-900">Satellite MRV</p>
          <p className="text-xs text-stone-600">NDVI health and green-belt perimeter checks</p>
        </Link>
      </div>
    </div>
  );
}
