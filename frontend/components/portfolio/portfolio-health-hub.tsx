"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Bird, LayoutGrid, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader, SectionNav } from "@/components/ui";
import { PortfolioBiodiversityTab } from "./portfolio-biodiversity-tab";
import { PortfolioComplianceTab } from "./portfolio-compliance-tab";
import { PortfolioMonitoringTab } from "./portfolio-monitoring-tab";
import { PortfolioOverviewTab } from "./portfolio-overview-tab";
import { PortfolioThreatsTab } from "./portfolio-threats-tab";

const TABS = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: LayoutGrid },
  { id: "compliance", label: "Compliance", shortLabel: "Compliance", icon: ShieldCheck },
  { id: "threats", label: "Threats & weather", shortLabel: "Threats", icon: ShieldAlert },
  { id: "monitoring", label: "Monitoring", shortLabel: "Monitor", icon: Activity },
  { id: "biodiversity", label: "Biodiversity", shortLabel: "Bio", icon: Bird },
] as const;

export type PortfolioHealthTab = (typeof TABS)[number]["id"];

export function PortfolioHealthHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PortfolioHealthTab>("overview");

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && TABS.some((t) => t.id === requested)) {
      setTab(requested as PortfolioHealthTab);
    }
  }, [searchParams]);

  function selectTab(next: PortfolioHealthTab) {
    setTab(next);
    router.replace(`/portfolio-health?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        purpose="Intelligence · Portfolio"
        title="Portfolio intelligence"
        description="Start with overall posture, then drill into compliance risk, threats, satellite monitoring, and biodiversity signals across all projects."
        breadcrumbs={[{ label: "Intelligence" }, { label: "Portfolio" }]}
      />

      <SectionNav
        ariaLabel="Portfolio intelligence sections"
        items={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          shortLabel: t.shortLabel,
          icon: t.icon,
        }))}
        active={tab}
        onSelect={(id) => selectTab(id as PortfolioHealthTab)}
      />

      {tab === "overview" && <PortfolioOverviewTab onSelectTab={selectTab} />}
      {tab === "compliance" && <PortfolioComplianceTab />}
      {tab === "threats" && <PortfolioThreatsTab />}
      {tab === "monitoring" && <PortfolioMonitoringTab />}
      {tab === "biodiversity" && <PortfolioBiodiversityTab />}
    </div>
  );
}
