"use client";

import Link from "next/link";
import { ArrowRight, Building2, Trees } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects } from "@/lib/api";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";

export function TownshipLandscapeDashboardPanel() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "township-projects"),
    queryFn: () => plantingProjects.list(),
    staleTime: 60_000,
  });

  const townshipProjects =
    data?.items.filter(
      (project) =>
        project.scheme_code === "township_landscape" ||
        project.segment === "township_landscape",
    ) ?? [];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        href="/projects/new"
        className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 hover:bg-violet-50"
      >
        <Building2 className="h-4 w-4 text-violet-800" />
        <p className="mt-2 text-sm font-semibold text-stone-900">Township / society project</p>
        <p className="text-xs text-stone-600">RWA-linked avenue and common-area planting</p>
      </Link>
      <Link
        href="/field-ops"
        className="rounded-xl border border-stone-200 bg-white p-4 hover:bg-stone-50"
      >
        <Trees className="h-4 w-4 text-forest-700" />
        <p className="mt-2 text-sm font-semibold text-stone-900">
          {isLoading ? "Loading…" : `${townshipProjects.length} township projects`}
        </p>
        <p className="inline-flex items-center gap-1 text-xs font-medium text-forest-700">
          Field survival queue <ArrowRight className="h-3 w-3" />
        </p>
      </Link>
    </div>
  );
}
