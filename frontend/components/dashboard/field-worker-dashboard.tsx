"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, Leaf, TreePine } from "lucide-react";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { plantingProjects, trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";

export function FieldWorkerDashboard() {
  const { user } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: scopedKey(user, "projects-field-home"),
    queryFn: () => plantingProjects.list({ page: 1 }),
  });
  const { data: treePage, isLoading: treesLoading } = useQuery({
    queryKey: scopedKey(user, "trees-field-home"),
    queryFn: () => trees.list({ page_size: 5 }),
  });

  const projectItems = projects?.items ?? [];
  const recentTrees = treePage?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-forest-700">
          Field workspace{user?.organization_name ? ` · ${user.organization_name}` : ""}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Today&apos;s work
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
          Register trees in your assigned packages and keep GPS / photos up to date.
        </p>
      </div>

      <DataTrustBanner compact />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/trees/new" className="card group flex items-center gap-3 transition hover:border-forest-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-100 text-forest-800">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Register tree</p>
            <p className="text-xs text-stone-500">GPS, photos, compliance fields</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-forest-700" />
        </Link>
        <Link href="/projects" className="card group flex items-center gap-3 transition hover:border-forest-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">My projects</p>
            <p className="text-xs text-stone-500">Packages & work areas</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-forest-700" />
        </Link>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-medium">Assigned projects</h2>
        {projectsLoading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : projectItems.length === 0 ? (
          <p className="text-sm text-stone-500">
            No projects assigned yet. Ask your supervisor to add you on the project Team tab.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {projectItems.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="flex justify-between py-2.5 text-sm hover:text-forest-800">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-stone-500">{p.segment?.replace(/_/g, " ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <TreePine className="h-4 w-4 text-forest-700" />
            Recent trees
          </h2>
          <Link href="/trees" className="text-sm text-forest-700 hover:underline">
            View all
          </Link>
        </div>
        {treesLoading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : recentTrees.length === 0 ? (
          <p className="text-sm text-stone-500">No trees registered yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {recentTrees.map((t) => (
              <li key={t.id}>
                <Link href={`/trees/${t.id}`} className="flex justify-between py-2.5 text-sm hover:text-forest-800">
                  <span className="font-medium">{t.species_text || "Tree"}</span>
                  <span className="text-xs text-stone-500">{t.public_code}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
