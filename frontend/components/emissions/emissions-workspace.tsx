"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Cloud, MapPin } from "lucide-react";
import { IntegrationStubBanner } from "@/components/integrations/integration-stub-banner";
import { ProjectEmissionsPanel } from "@/components/projects/project-emissions-panel";
import { PageHeader } from "@/components/ui";
import {
  emissionsPortfolio,
  plantingProjects,
  type EmissionsPortfolioSite,
} from "@/lib/api";
import { DEMO_GHG_PROJECT_CODE, emissionsHref, parseEmissionsSearchParams } from "@/lib/emissions-links";
import { cn } from "@/lib/cn";

const VERDICT_PILL: Record<string, string> = {
  consistent: "bg-emerald-100 text-emerald-900",
  uncertain: "bg-amber-100 text-amber-900",
  misaligned: "bg-rose-100 text-rose-900",
  no_signal: "bg-stone-100 text-stone-700",
};

function SiteRailButton({
  site,
  active,
  onSelect,
}: {
  site: EmissionsPortfolioSite;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
        active
          ? "border-forest-400 bg-forest-50"
          : "border-stone-200 bg-white hover:border-stone-300",
      )}
    >
      <p className="font-medium text-stone-900">{site.work_area_name}</p>
      <p className="text-xs text-stone-500">{site.project_name}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {site.verdict ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 capitalize",
              VERDICT_PILL[site.verdict] ?? VERDICT_PILL.uncertain,
            )}
          >
            {site.verdict.replace("_", " ")}
          </span>
        ) : (
          <span className="text-stone-400">No fusion yet</span>
        )}
        {site.anomaly_ppb != null ? (
          <span className="text-stone-600">+{site.anomaly_ppb} ppb</span>
        ) : null}
      </div>
    </button>
  );
}

export function EmissionsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId: urlProjectId, workAreaId: urlWorkAreaId } = parseEmissionsSearchParams(
    searchParams,
  );

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ["emissions-portfolio-summary"],
    queryFn: () => emissionsPortfolio.summary(),
  });

  const { data: projectsPage } = useQuery({
    queryKey: ["planting-projects-list"],
    queryFn: () => plantingProjects.list({ page: 1, page_size: 100 }),
  });

  const demoProject = useMemo(
    () => projectsPage?.items.find((p) => p.code === DEMO_GHG_PROJECT_CODE) ?? null,
    [projectsPage],
  );

  const activeProjectId = urlProjectId ?? demoProject?.id ?? portfolio?.sites[0]?.project_id ?? null;

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", activeProjectId],
    queryFn: () => plantingProjects.workAreas(activeProjectId!),
    enabled: Boolean(activeProjectId),
  });

  const { data: activeProject } = useQuery({
    queryKey: ["planting-project", activeProjectId],
    queryFn: () => plantingProjects.get(activeProjectId!),
    enabled: Boolean(activeProjectId),
  });

  const [workAreaId, setWorkAreaId] = useState<string>("");

  const portfolioSites = useMemo(() => {
    if (!portfolio?.sites.length) return [];
    if (activeProjectId) {
      return portfolio.sites.filter((s) => s.project_id === activeProjectId);
    }
    return portfolio.sites;
  }, [portfolio, activeProjectId]);

  useEffect(() => {
    if (urlWorkAreaId && workAreas.some((a) => a.id === urlWorkAreaId)) {
      setWorkAreaId(urlWorkAreaId);
      return;
    }
    const preferred =
      portfolioSites.find((s) => s.verdict === "misaligned") ??
      portfolioSites[0] ??
      null;
    if (preferred && workAreas.some((a) => a.id === preferred.work_area_id)) {
      setWorkAreaId(preferred.work_area_id);
      return;
    }
    if (workAreas[0]?.id) setWorkAreaId(workAreas[0].id);
  }, [urlWorkAreaId, workAreas, portfolioSites]);

  function selectSite(site: EmissionsPortfolioSite) {
    setWorkAreaId(site.work_area_id);
    router.replace(
      emissionsHref({ projectId: site.project_id, workAreaId: site.work_area_id }),
      { scroll: false },
    );
  }

  function selectProject(projectId: string) {
    router.replace(emissionsHref({ projectId }), { scroll: false });
  }

  const kpis = portfolio?.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        purpose="Atmospheric GHG"
        title="Emissions workspace"
        description="Register multi-gas sources, model plumes, screen TROPOMI methane, and run fusion assessments — per work area."
        breadcrumbs={[{ label: "Intelligence" }, { label: "Emissions" }]}
      />

      <IntegrationStubBanner />

      {portfolio?.tropomi_configured === false ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Sentinel Hub is not configured — TROPOMI scans use demo stub series where seeded. Live pulls
          require optical satellite credentials.
        </p>
      ) : null}

      {kpis ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card text-sm">
            <p className="text-xs uppercase tracking-wide text-stone-500">Monitored sites</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{kpis.monitored_sites}</p>
          </div>
          <div className="card text-sm">
            <p className="text-xs uppercase tracking-wide text-stone-500">Misaligned fusion</p>
            <p className="mt-1 text-2xl font-semibold text-rose-700">{kpis.misaligned_sites}</p>
          </div>
          <div className="card text-sm">
            <p className="text-xs uppercase tracking-wide text-stone-500">Strong CH₄ anomaly</p>
            <p className="mt-1 text-2xl font-semibold text-amber-800">{kpis.strong_anomaly_sites}</p>
          </div>
          <div className="card text-sm">
            <p className="text-xs uppercase tracking-wide text-stone-500">Active CH₄ sources</p>
            <p className="mt-1 text-2xl font-semibold text-forest-800">{kpis.ch4_active_sources}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <aside className="card space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-forest-700" aria-hidden />
            <h2 className="text-sm font-semibold text-stone-900">Sites</h2>
          </div>
          {portfolioLoading ? (
            <p className="text-sm text-stone-500">Loading portfolio…</p>
          ) : portfolioSites.length === 0 ? (
            <p className="text-sm text-stone-500">
              No emission sites yet.{" "}
              {demoProject ? (
                <button
                  type="button"
                  className="font-medium text-forest-700 underline"
                  onClick={() => selectProject(demoProject.id)}
                >
                  Open {DEMO_GHG_PROJECT_CODE}
                </button>
              ) : (
                "Run make seed for the GHG demo project."
              )}
            </p>
          ) : (
            <ul className="space-y-2">
              {portfolioSites.map((site) => (
                <li key={site.work_area_id}>
                  <SiteRailButton
                    site={site}
                    active={site.work_area_id === workAreaId}
                    onSelect={() => selectSite(site)}
                  />
                </li>
              ))}
            </ul>
          )}
          {demoProject && activeProjectId !== demoProject.id ? (
            <Link
              href={emissionsHref({ projectId: demoProject.id })}
              className="text-xs font-medium text-forest-700 hover:underline"
            >
              Open GHG demo project →
            </Link>
          ) : null}
        </aside>

        <div className="space-y-4">
          {activeProject ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
              <Cloud className="h-4 w-4 text-forest-700" aria-hidden />
              <span className="font-medium text-stone-900">{activeProject.name}</span>
              <span className="text-stone-400">·</span>
              <code className="text-xs">{activeProject.code}</code>
              <Link
                href={`/projects/${activeProject.id}/compliance?section=emissions`}
                className="ml-auto text-xs text-forest-700 hover:underline"
              >
                Compliance tab view
              </Link>
            </div>
          ) : null}

          {activeProjectId && workAreas.length > 0 ? (
            <ProjectEmissionsPanel
              projectId={activeProjectId}
              projectCode={activeProject?.code}
              workAreas={workAreas}
              controlledWorkAreaId={workAreaId}
              onWorkAreaChange={(id) => {
                setWorkAreaId(id);
                router.replace(
                  emissionsHref({ projectId: activeProjectId, workAreaId: id }),
                  { scroll: false },
                );
              }}
              showGuidedPipeline
              showTropomiChart
            />
          ) : (
            <div className="card text-sm text-stone-600">
              Select a site from the rail or seed the{" "}
              <strong>{DEMO_GHG_PROJECT_CODE}</strong> demo project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
