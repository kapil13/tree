"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Bird, Mic } from "lucide-react";
import { bioacoustic, plantingProjects, plantationFences } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { PortfolioKpiGrid } from "./portfolio-kpi-grid";
import { PortfolioSection } from "./portfolio-section";
import { PortfolioTabBanner } from "./portfolio-tab-banner";
import { PortfolioTabError, PortfolioTabLoading } from "./portfolio-tab-state";
import { PortfolioTabShell } from "./portfolio-tab-shell";

type BioSite = {
  id: string;
  name: string;
  area_ha: number | null;
};

export function PortfolioBiodiversityTab({
  projectId,
  projectName,
}: {
  projectId?: string | null;
  projectName?: string | null;
}) {
  const t = useTranslations("portfolioTabs.biodiversity");

  const [bioQ, fencesQ, workAreasQ] = useQueries({
    queries: [
      {
        queryKey: ["bio-summary", projectId ?? "all"],
        queryFn: async () => {
          if (projectId) {
            const workAreas = await plantingProjects.workAreas(projectId);
            const primaryFenceId = workAreas[0]?.id;
            if (!primaryFenceId) {
              return {
                total_recordings: 0,
                analyzed_recordings: 0,
                avg_health_score: null as number | null,
                total_species_detected: 0,
              };
            }
            return bioacoustic.summary(primaryFenceId);
          }
          return bioacoustic.summary();
        },
      },
      {
        queryKey: ["plantation-fences-bio", projectId ?? "all"],
        queryFn: () => plantationFences.list({ page_size: 10 }),
        enabled: !projectId,
      },
      {
        queryKey: ["project-work-areas-bio", projectId ?? "none"],
        queryFn: () => plantingProjects.workAreas(projectId!),
        enabled: Boolean(projectId),
      },
    ],
  });

  if (bioQ.isLoading || (projectId ? workAreasQ.isLoading : fencesQ.isLoading)) {
    return <PortfolioTabLoading />;
  }

  if (bioQ.error || (projectId ? workAreasQ.error : fencesQ.error) || !bioQ.data) {
    return (
      <PortfolioTabError
        onRetry={() => {
          void bioQ.refetch();
          if (projectId) void workAreasQ.refetch();
          else void fencesQ.refetch();
        }}
      />
    );
  }

  const bio = bioQ.data;
  const fenceItems: BioSite[] = projectId
    ? (workAreasQ.data ?? []).map((area) => ({
        id: area.id,
        name: area.name,
        area_ha: area.area_ha,
      }))
    : (fencesQ.data?.items ?? []).map((fence) => ({
        id: fence.id,
        name: fence.name,
        area_ha: fence.area_ha,
      }));
  const analyzed = bio.analyzed_recordings ?? 0;

  return (
    <PortfolioTabShell tab="biodiversity" projectId={projectId} projectName={projectName}>
      <PortfolioTabBanner
        variant="cta"
        title={t("ctaTitle")}
        description={t("ctaDesc")}
        action={{ label: t("openBiodiversity"), href: "/bioacoustic" }}
      />

      <PortfolioKpiGrid>
        <PortfolioKpiCard icon={Mic} label={t("kpi.analyzed")} value={String(analyzed)} />
        <PortfolioKpiCard
          icon={Bird}
          label={t("kpi.species")}
          value={String(bio.total_species_detected ?? 0)}
        />
        <PortfolioKpiCard
          icon={Bird}
          label={t("kpi.healthScore")}
          value={bio.avg_health_score != null ? bio.avg_health_score.toFixed(0) : "—"}
        />
        <PortfolioKpiCard icon={Mic} label={t("kpi.sites")} value={String(fenceItems.length)} />
      </PortfolioKpiGrid>

      {fenceItems.length === 0 && analyzed === 0 ? (
        <EmptyState
          icon={Mic}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={{ label: t("startRecording"), href: "/bioacoustic" }}
        />
      ) : fenceItems.length > 0 ? (
        <PortfolioSection
          flush
          title={t("sitesTitle")}
          action={{ label: t("recordAtSite"), href: "/bioacoustic" }}
        >
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {fenceItems.map((site) => (
              <li
                key={site.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-50">{site.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {site.area_ha != null
                      ? t("siteHa", { ha: site.area_ha.toFixed(1) })
                      : t("siteLabel")}
                  </p>
                </div>
                <Link
                  href="/bioacoustic"
                  className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                >
                  {t("recordView")}
                </Link>
              </li>
            ))}
          </ul>
        </PortfolioSection>
      ) : null}
    </PortfolioTabShell>
  );
}
