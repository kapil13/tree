"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Activity, Bird, ClipboardSignature, LayoutGrid, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader, SectionNav } from "@/components/ui";
import {
  parsePortfolioHealthTab,
  portfolioHealthHref,
  type PortfolioHealthTab,
} from "@/lib/portfolio-health-links";
import { usePortfolioProjectScope } from "@/lib/use-portfolio-project-scope";
import { PortfolioAuditTab } from "./portfolio-audit-tab";
import { PortfolioBiodiversityTab } from "./portfolio-biodiversity-tab";
import { PortfolioComplianceTab } from "./portfolio-compliance-tab";
import { PortfolioMonitoringTab } from "./portfolio-monitoring-tab";
import { PortfolioOverviewTab } from "./portfolio-overview-tab";
import { PortfolioThreatsTab } from "./portfolio-threats-tab";

export type { PortfolioHealthTab } from "@/lib/portfolio-health-links";

export function PortfolioHealthHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tp = useTranslations("portfolio");
  const tc = useTranslations("chrome");
  const [tab, setTab] = useState<PortfolioHealthTab>("overview");
  const { projectId, projectName } = usePortfolioProjectScope(tab);

  const TABS = [
    { id: "overview" as const, label: tp("tabOverview"), shortLabel: tp("tabOverview"), icon: LayoutGrid },
    { id: "audit" as const, label: tp("tabAudit"), shortLabel: tp("tabAuditShort"), icon: ClipboardSignature },
    { id: "compliance" as const, label: tp("tabCompliance"), shortLabel: tp("tabCompliance"), icon: ShieldCheck },
    { id: "threats" as const, label: tp("tabThreats"), shortLabel: tp("tabThreatsShort"), icon: ShieldAlert },
    { id: "monitoring" as const, label: tp("tabMonitoring"), shortLabel: tp("tabMonitorShort"), icon: Activity },
    { id: "biodiversity" as const, label: tp("tabBiodiversity"), shortLabel: tp("tabBioShort"), icon: Bird },
  ];

  useEffect(() => {
    const requested = parsePortfolioHealthTab(searchParams.get("tab"));
    if (requested) setTab(requested);
  }, [searchParams]);

  function selectTab(next: PortfolioHealthTab) {
    setTab(next);
    router.replace(portfolioHealthHref(next, { projectId }), { scroll: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={tp("purpose")}
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[{ label: tc("sectionIntelligence") }, { label: tc("breadcrumbPortfolio") }]}
      />

      <SectionNav
        ariaLabel={tp("ariaSections")}
        items={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          shortLabel: t.shortLabel,
          icon: t.icon,
        }))}
        active={tab}
        onSelect={(id) => selectTab(id as PortfolioHealthTab)}
      />

      {tab === "overview" && (
        <PortfolioOverviewTab
          onSelectTab={selectTab}
          projectId={projectId}
          projectName={projectName}
        />
      )}
      {tab === "audit" && (
        <PortfolioAuditTab projectId={projectId} projectName={projectName} />
      )}
      {tab === "compliance" && (
        <PortfolioComplianceTab projectId={projectId} projectName={projectName} />
      )}
      {tab === "threats" && (
        <PortfolioThreatsTab projectId={projectId} projectName={projectName} />
      )}
      {tab === "monitoring" && (
        <PortfolioMonitoringTab projectId={projectId} projectName={projectName} />
      )}
      {tab === "biodiversity" && (
        <PortfolioBiodiversityTab projectId={projectId} projectName={projectName} />
      )}
    </div>
  );
}
