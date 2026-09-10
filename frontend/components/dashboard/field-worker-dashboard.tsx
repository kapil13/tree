"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  CloudOff,
  Leaf,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TreePine,
} from "lucide-react";
import {
  CommandCenterEvidence,
  fieldOperationalStatus,
} from "@/components/dashboard/command-center-shell";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { fmtNum } from "@/components/dashboard/format";
import { EmptyState } from "@/components/ui/empty-state";
import { InsightPanel, MetricGrid, OperationalStatusBar } from "@/components/ui";
import {
  buildFieldOpsTasks,
  FieldOpsTaskQueue,
} from "@/components/field-ops/field-ops-task-queue";
import { TreeThumbnail } from "@/components/trees/tree-thumbnail";
import { plantingProjects, trees } from "@/lib/api";
import { fieldOpsHref } from "@/lib/field-ops-links";
import { useAuth } from "@/lib/auth-store";
import { useOfflineTreeQueue } from "@/lib/offline/use-offline-queue";
import { scopedKey } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

function FieldDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="intel-skeleton h-20 rounded-xl" />
      <div className="intel-skeleton h-24 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="intel-skeleton h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function FieldWorkerDashboard() {
  const { user } = useAuth();
  const { pendingCount, syncing, syncNow } = useOfflineTreeQueue();
  const tf = useTranslations("fieldWorker");
  const tfo = useTranslations("fieldOps");
  const to = useTranslations("opsStatus");
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

  if (projectsLoading || treesLoading || fieldOpsQ.isLoading) {
    return <FieldDashboardSkeleton />;
  }

  const geotagDue = recentTrees.filter((t) => {
    if (!t.last_geotag_at) return true;
    const days = (Date.now() - new Date(t.last_geotag_at).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 30;
  });

  const dueProjects =
    fieldOps?.projects.filter((p) => p.open_violations > 0 || p.survival_due > 0) ?? [];
  const fieldTasks = fieldOps ? buildFieldOpsTasks(fieldOps) : [];

  const unassigned = projectItems.length === 0;
  const firstName = user?.full_name?.split(" ")[0] ?? tf("there");
  const openViolations = fieldOps?.open_violations ?? 0;
  const survivalDue = fieldOps?.survival_due ?? 0;

  const fieldStatus = fieldOperationalStatus(to, {
    openViolations,
    survivalDue,
    queueCount: fieldTasks.length,
    geotagDue: geotagDue.length,
    unassigned,
  });

  return (
    <div className="space-y-6">
      <OperationalStatusBar
        tone={fieldStatus.tone}
        label={fieldStatus.label}
        summary={fieldStatus.summary}
        icon={fieldStatus.tone === "healthy" ? ShieldCheck : AlertTriangle}
        action={
          <Link href="/trees/new" className="btn-primary inline-flex items-center gap-2 text-xs">
            <Leaf className="h-3.5 w-3.5" />
            {tf("registerTree")}
          </Link>
        }
      />

      <InsightPanel
        title={tf("fieldWorkspace", { name: firstName })}
        interpretation={
          user?.organization_name
            ? tf("fieldInterpretOrg", { org: user.organization_name })
            : tf("fieldInterpret")
        }
        icon={ClipboardList}
      />

      <MetricGrid
        columns={4}
        metrics={[
          {
            label: tf("assignedProjects"),
            value: fmtNum(projectItems.length),
            hint: unassigned ? tf("askSupervisor") : tf("activePackages"),
          },
          {
            label: tf("openViolations"),
            value: fmtNum(openViolations),
            hint: tf("acrossPortfolio"),
            tone: openViolations > 0 ? "critical" : "positive",
          },
          {
            label: tf("survivalDue"),
            value: fmtNum(survivalDue),
            hint: tf("geotagRefresh"),
            tone: survivalDue > 0 ? "warning" : "default",
          },
          {
            label: tf("needsAttention"),
            value: fmtNum(fieldTasks.length),
            hint: tf("treesRegistered"),
            tone: fieldTasks.length > 0 ? "warning" : "positive",
          },
        ]}
      />

      {pendingCount > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                <CloudOff className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-50">
                  {pendingCount} tree registration{pendingCount === 1 ? "" : "s"} waiting to sync
                </p>
                <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
                  Upload when you are back online or open the sync queue to review.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={syncing}
                onClick={() => void syncNow()}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <Link href="/field-ops/sync-queue" className="btn-primary text-xs">
                Open sync queue
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <FieldOpsTaskQueue tasks={fieldTasks} />

      {dueProjects.length > 0 ? (
        <div className="flex justify-end">
          <Link href={fieldOpsHref({ section: "attention" })} className="dash-link">
            {tf("viewFieldOps")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/projects" className="dash-action-row">
          <div className="dash-action-icon">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">{tf("myProjects")}</p>
            <p className="text-xs text-stone-500">{tf("packagesWorkAreas")}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-stone-400" />
        </Link>
        <Link href="/map" className="dash-action-row">
          <div className="dash-action-icon">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">{tf("fieldMap")}</p>
            <p className="text-xs text-stone-500">{tf("findNearbyTrees")}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-stone-400" />
        </Link>
      </div>

      <DataTrustBanner compact />

      <CommandCenterEvidence
        title={tf("assignedProjectsRecent")}
        description={tf("assignedProjectsRecentDesc")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="dash-panel border-0 p-0 shadow-none">
            <div className="dash-panel-head px-0 pt-0">
              <div>
                <h2 className="dash-panel-title">{tf("assignedProjects")}</h2>
                <p className="dash-panel-sub">{tf("openPackageRegister")}</p>
              </div>
            </div>
            {unassigned ? (
              <EmptyState
                className="mt-4 border-0 bg-transparent py-8"
                icon={ClipboardList}
                title={tf("noProjectsTitle")}
                description={tf("noProjectsDesc")}
              />
            ) : (
              <ul className="mt-4 space-y-2">
                {projectItems.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="dash-list-row dash-list-row--link">
                      <div>
                        <p className="font-medium text-stone-800">{p.name}</p>
                        <p className="text-xs text-stone-500">{p.segment?.replace(/_/g, " ")}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-stone-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dash-panel border-0 p-0 shadow-none">
            <div className="dash-panel-head px-0 pt-0">
              <div>
                <h2 className="dash-panel-title">{tf("recentTrees")}</h2>
                <p className="dash-panel-sub">{tf("recentTreesSub")}</p>
              </div>
              <Link href="/trees" className="dash-link">
                {tfo("viewAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentTrees.length === 0 ? (
              <EmptyState
                className="mt-4 border-0 bg-transparent py-8"
                icon={TreePine}
                title={tf("emptyTreesTitle")}
                description={tf("emptyTreesDesc")}
                action={{ label: tf("registerTree"), href: "/trees/new" }}
              />
            ) : (
              <ul className="mt-4 space-y-2">
                {recentTrees.map((t) => (
                  <li key={t.id}>
                    <Link href={`/trees/${t.id}`} className="dash-list-row dash-list-row--link">
                      <TreeThumbnail
                        imageUrl={t.primary_image_url}
                        alt={t.species_text || t.public_code}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-800">{t.species_text || "Tree"}</p>
                        <p className="text-xs text-stone-500">{t.public_code}</p>
                      </div>
                      <span className="dash-health-badge dash-health-badge--unknown">
                        {t.current_health}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CommandCenterEvidence>
    </div>
  );
}
