"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Leaf,
  MapPin,
  RefreshCw,
  TreePine,
} from "lucide-react";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { plantingProjects, trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

export function FieldWorkerDashboard() {
  const { user } = useAuth();
  const [projectsQ, treesQ, fieldOpsQ] = useQueries({
    queries: [
      {
        queryKey: scopedKey(user, "projects-field-home"),
        queryFn: () => plantingProjects.list({ page: 1 }),
      },
      {
        queryKey: scopedKey(user, "trees-field-home"),
        queryFn: () => trees.list({ page_size: 8 }),
      },
      {
        queryKey: scopedKey(user, "field-ops-summary-home"),
        queryFn: () => plantingProjects.fieldOpsSummary(),
      },
    ],
  });

  const projectItems = projectsQ.data?.items ?? [];
  const recentTrees = treesQ.data?.items ?? [];
  const fieldOps = fieldOpsQ.data;
  const projectsLoading = projectsQ.isLoading;
  const treesLoading = treesQ.isLoading;

  const geotagDue = recentTrees.filter((t) => {
    if (!t.last_geotag_at) return true;
    const days = (Date.now() - new Date(t.last_geotag_at).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 30;
  });

  const attention: AttentionItem[] = [];
  const dueProjects =
    fieldOps?.projects.filter((p) => p.open_violations > 0 || p.survival_due > 0) ?? [];

  for (const p of dueProjects.slice(0, 4)) {
    const bits: string[] = [];
    if (p.survival_due > 0) bits.push(`${p.survival_due} survival / geotag due`);
    if (p.open_violations > 0) bits.push(`${p.open_violations} open violation${p.open_violations === 1 ? "" : "s"}`);
    attention.push({
      id: `project-${p.id}`,
      title: p.name,
      detail: bits.join(" · ") || "Needs attention",
      href: `/projects/${p.id}`,
    });
  }

  if (attention.length < 3 && geotagDue.length > 0) {
    attention.push({
      id: "geotag",
      title: `${geotagDue.length} tree${geotagDue.length === 1 ? "" : "s"} need a geotag update`,
      detail: "Re-tag GPS / survival status in the field",
      href: geotagDue[0] ? `/trees/${geotagDue[0].id}` : "/trees",
    });
  }

  if (
    attention.length < 3 &&
    fieldOps &&
    fieldOps.survival_due > 0 &&
    !dueProjects.some((p) => p.survival_due > 0)
  ) {
    attention.push({
      id: "survival-summary",
      title: `${fieldOps.survival_due} survival check${fieldOps.survival_due === 1 ? "" : "s"} due`,
      detail: "Across your assigned packages",
      href: "/field-ops#attention",
    });
  }

  const unassigned = !projectsLoading && projectItems.length === 0;

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

      <Link
        href="/trees/new"
        className="card group flex items-center gap-4 border-forest-200 bg-forest-50/50 transition hover:border-forest-400 dark:border-forest-900 dark:bg-forest-950/30"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-700 text-white">
          <Leaf className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">Register tree</p>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            GPS, photos, and compliance fields — primary field action
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-forest-700 group-hover:translate-x-0.5" />
      </Link>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Due today / needs attention
          </h2>
          <Link href="/field-ops" className="text-xs text-forest-700 hover:underline">
            Field ops
          </Link>
        </div>
        {fieldOpsQ.isLoading || treesLoading ? (
          <p className="text-sm text-stone-500">Loading queue…</p>
        ) : attention.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent py-8"
            icon={RefreshCw}
            title="Nothing due right now"
            description="No survival checks, geotag updates, or open violations in your queue."
            action={{ label: "Register a tree", href: "/trees/new" }}
          />
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {attention.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-start justify-between gap-3 py-2.5 text-sm hover:text-forest-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-stone-500">{item.detail}</p>
                  </div>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        <Link href="/map" className="card group flex items-center gap-3 transition hover:border-forest-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Field map</p>
            <p className="text-xs text-stone-500">Find nearby trees</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-forest-700" />
        </Link>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-medium">Assigned projects</h2>
        {projectsLoading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : unassigned ? (
          <EmptyState
            className="border-0 bg-transparent py-8"
            icon={ClipboardList}
            title="No projects assigned yet"
            description="Ask your supervisor to add you on the project Team tab so packages appear here."
          />
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {projectItems.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex justify-between py-2.5 text-sm hover:text-forest-800"
                >
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
          <EmptyState
            className="border-0 bg-transparent py-8"
            icon={TreePine}
            title="No trees registered yet"
            description="Use Register tree to capture your first GPS-tagged planting."
            action={{ label: "Register tree", href: "/trees/new" }}
          />
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {recentTrees.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/trees/${t.id}`}
                  className="flex justify-between py-2.5 text-sm hover:text-forest-800"
                >
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
