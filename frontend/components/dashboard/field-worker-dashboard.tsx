"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
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
import { plantingProjects, trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warn" | "info";
};

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

  const attention: AttentionItem[] = [];
  const dueProjects =
    fieldOps?.projects.filter((p) => p.open_violations > 0 || p.survival_due > 0) ?? [];

  for (const p of dueProjects.slice(0, 4)) {
    const bits: string[] = [];
    if (p.survival_due > 0) bits.push(`${p.survival_due} survival due`);
    if (p.open_violations > 0) bits.push(`${p.open_violations} open violation${p.open_violations === 1 ? "" : "s"}`);
    attention.push({
      id: `project-${p.id}`,
      title: p.name,
      detail: bits.join(" · ") || "Needs attention",
      href: `/projects/${p.id}`,
      tone: p.open_violations > 0 ? "critical" : "warn",
    });
  }

  if (attention.length < 3 && geotagDue.length > 0) {
    attention.push({
      id: "geotag",
      title: `${geotagDue.length} tree${geotagDue.length === 1 ? "" : "s"} need a geotag update`,
      detail: "Re-tag GPS / survival status in the field",
      href: geotagDue[0] ? `/trees/${geotagDue[0].id}` : "/trees",
      tone: "warn",
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
      tone: "warn",
    });
  }

  const unassigned = projectItems.length === 0;
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const openViolations = fieldOps?.open_violations ?? 0;
  const survivalDue = fieldOps?.survival_due ?? 0;

  const to = useTranslations("opsStatus");
  const fieldStatus = fieldOperationalStatus(to, {
    openViolations,
    survivalDue,
    queueCount: attention.length,
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
            Register tree
          </Link>
        }
      />

      <InsightPanel
        title={`Field workspace · ${firstName}`}
        interpretation={
          user?.organization_name
            ? `${user.organization_name} — register trees, refresh GPS, and close survival checks in your assigned packages.`
            : "Register trees, refresh GPS, and close survival checks in your assigned packages."
        }
        icon={ClipboardList}
      />

      <MetricGrid
        columns={4}
        metrics={[
          {
            label: "Assigned projects",
            value: fmtNum(projectItems.length),
            hint: unassigned ? "Ask supervisor to add you" : "Active packages",
          },
          {
            label: "Open violations",
            value: fmtNum(openViolations),
            hint: "Across your portfolio",
            tone: openViolations > 0 ? "critical" : "positive",
          },
          {
            label: "Survival due",
            value: fmtNum(survivalDue),
            hint: "Geotag / survival checks",
            tone: survivalDue > 0 ? "warning" : "default",
          },
          {
            label: "Queue items",
            value: fmtNum(attention.length),
            hint: `${fmtNum(fieldOps?.tree_count ?? recentTrees.length)} trees in scope`,
            tone: attention.length > 0 ? "warning" : "positive",
          },
        ]}
      />

      <div className="dash-panel dash-panel--priority">
        <div className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Today&apos;s priorities
            </h2>
            <p className="dash-panel-sub">Survival, geotag, and compliance items</p>
          </div>
          <Link href="/field-ops" className="dash-link">
            Field ops <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {attention.length === 0 ? (
          <EmptyState
            className="mt-4 border-0 bg-transparent py-8"
            icon={RefreshCw}
            title="Nothing due right now"
            description="No survival checks, geotag updates, or open violations in your queue."
            action={{ label: "Register a tree", href: "/trees/new" }}
          />
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {attention.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "dash-priority-card",
                    item.tone === "critical" && "dash-priority-card--critical",
                    item.tone === "warn" && "dash-priority-card--warn",
                    item.tone === "info" && "dash-priority-card--info",
                  )}
                >
                  <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                  <p className="mt-1 text-xs text-stone-600">{item.detail}</p>
                  <ArrowRight className="mt-3 h-4 w-4 text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/projects" className="dash-action-row">
          <div className="dash-action-icon">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">My projects</p>
            <p className="text-xs text-stone-500">Packages & work areas</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-stone-400" />
        </Link>
        <Link href="/map" className="dash-action-row">
          <div className="dash-action-icon">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">Field map</p>
            <p className="text-xs text-stone-500">Find nearby trees</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-stone-400" />
        </Link>
      </div>

      <DataTrustBanner compact />

      <CommandCenterEvidence
        title="Assigned projects & recent trees"
        description="Open a package or continue field surveys"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="dash-panel border-0 p-0 shadow-none">
            <div className="dash-panel-head px-0 pt-0">
              <div>
                <h2 className="dash-panel-title">Assigned projects</h2>
                <p className="dash-panel-sub">Open a package to register trees</p>
              </div>
            </div>
            {unassigned ? (
              <EmptyState
                className="mt-4 border-0 bg-transparent py-8"
                icon={ClipboardList}
                title="No projects assigned yet"
                description="Ask your supervisor to add you on the project Team tab so packages appear here."
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
                <h2 className="dash-panel-title">Recent trees</h2>
                <p className="dash-panel-sub">Continue field surveys</p>
              </div>
              <Link href="/trees" className="dash-link">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentTrees.length === 0 ? (
              <EmptyState
                className="mt-4 border-0 bg-transparent py-8"
                icon={TreePine}
                title="No trees registered yet"
                description="Use Register tree to capture your first GPS-tagged planting."
                action={{ label: "Register tree", href: "/trees/new" }}
              />
            ) : (
              <ul className="mt-4 space-y-2">
                {recentTrees.map((t) => (
                  <li key={t.id}>
                    <Link href={`/trees/${t.id}`} className="dash-list-row dash-list-row--link">
                      <div>
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
