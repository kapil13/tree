"use client";

import Link from "next/link";
import { ArrowRight, Droplets, Sprout, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects } from "@/lib/api";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";

export function NgoWatershedDashboardPanel() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "ngo-watershed-projects"),
    queryFn: () => plantingProjects.list(),
    staleTime: 60_000,
  });

  const watershedProjects =
    data?.items.filter(
      (project) =>
        project.segment === "ngo_watershed" ||
        project.scheme_code === "mgnrega_convergence" ||
        project.scheme_code === "jal_shakti_riparian",
    ) ?? [];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Link
        href="/projects/new"
        className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 hover:bg-amber-50"
      >
        <Users className="h-4 w-4 text-amber-800" />
        <p className="mt-2 text-sm font-semibold text-stone-900">MGNREGA convergence</p>
        <p className="text-xs text-stone-600">Watershed and community nursery projects</p>
      </Link>
      <Link
        href="/reports/plantation/district-wise"
        className="rounded-xl border border-stone-200 bg-white p-4 hover:bg-stone-50"
      >
        <Sprout className="h-4 w-4 text-forest-700" />
        <p className="mt-2 text-sm font-semibold text-stone-900">Community rollups</p>
        <p className="text-xs text-stone-600">District and block survival summaries</p>
      </Link>
      <Link
        href="/field-ops"
        className="rounded-xl border border-stone-200 bg-white p-4 hover:bg-stone-50"
      >
        <Droplets className="h-4 w-4 text-sky-700" />
        <p className="mt-2 text-sm font-semibold text-stone-900">
          {isLoading ? "Loading…" : `${watershedProjects.length} watershed projects`}
        </p>
        <p className="inline-flex items-center gap-1 text-xs font-medium text-forest-700">
          Field survival queue <ArrowRight className="h-3 w-3" />
        </p>
      </Link>
    </div>
  );
}
