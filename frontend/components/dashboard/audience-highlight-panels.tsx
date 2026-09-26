"use client";

import { useQuery } from "@tanstack/react-query";
import { audienceOnboarding } from "@/lib/api";
import { shouldShowDashboardWidget } from "@/lib/audience-journey";
import { CorporateEsgDashboardPanel } from "@/components/dashboard/corporate-esg-dashboard-panel";
import { GovernmentRollupPanel } from "@/components/dashboard/government-rollup-panel";
import { MiningClosureDashboardPanel } from "@/components/dashboard/mining-closure-dashboard-panel";
import { FraTenureDashboardPanel } from "@/components/dashboard/fra-tenure-dashboard-panel";
import { NgoWatershedDashboardPanel } from "@/components/dashboard/ngo-watershed-dashboard-panel";
import { TownshipLandscapeDashboardPanel } from "@/components/dashboard/township-landscape-dashboard-panel";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";

export function AudienceHighlightPanels() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: scopedKey(user, "audience-context"),
    queryFn: () => audienceOnboarding.context(),
    enabled: Boolean(user?.audience),
    staleTime: 120_000,
  });

  const highlights = data?.dashboard_highlights ?? [];
  if (!highlights.length) return null;

  const showGov = shouldShowDashboardWidget(highlights, ["schemes", "geo_tag", "survival"]);
  const showCorporate = shouldShowDashboardWidget(highlights, ["brsr", "portfolio", "exports"]);
  const showMining = shouldShowDashboardWidget(highlights, ["greenbelt", "closure", "satellite"]);
  const showNgo = shouldShowDashboardWidget(highlights, ["mgnrega", "community"]);
  const showFra = data?.fra_required === true;
  const showTownship =
    data?.audience === "corporate_esg" ||
    data?.audience === "government" ||
    (data?.scheme_recommendations ?? []).some((row) => row.code === "township_landscape");

  if (!showGov && !showCorporate && !showMining && !showNgo && !showFra && !showTownship) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showFra ? <FraTenureDashboardPanel /> : null}
      {showMining ? <MiningClosureDashboardPanel /> : null}
      {showCorporate ? <CorporateEsgDashboardPanel /> : null}
      {showTownship ? <TownshipLandscapeDashboardPanel /> : null}
      {showNgo ? <NgoWatershedDashboardPanel /> : null}
      {showGov ? <GovernmentRollupPanel embedded /> : null}
    </div>
  );
}
