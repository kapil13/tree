"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Bird, LayoutGrid, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { PortfolioBiodiversityTab } from "./portfolio-biodiversity-tab";
import { PortfolioMonitoringTab } from "./portfolio-monitoring-tab";
import { PortfolioOverviewTab } from "./portfolio-overview-tab";
import { PortfolioThreatsTab } from "./portfolio-threats-tab";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "threats", label: "Threats & weather", icon: ShieldAlert },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "biodiversity", label: "Biodiversity", icon: Bird },
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Portfolio health</h1>
        <p className="mt-1 text-sm text-stone-600">
          Unified view of compliance, satellite monitoring, threats, and biodiversity across your
          planting portfolio.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-1">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition",
                active
                  ? "border-b-2 border-forest-700 text-forest-800"
                  : "text-stone-500 hover:text-stone-800",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <PortfolioOverviewTab onSelectTab={selectTab} />}
      {tab === "threats" && <PortfolioThreatsTab />}
      {tab === "monitoring" && <PortfolioMonitoringTab />}
      {tab === "biodiversity" && <PortfolioBiodiversityTab />}
    </div>
  );
}
