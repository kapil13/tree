"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Satellite as SatelliteIcon, ShieldCheck } from "lucide-react";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { BhoonidhiFenceCatalogPanel } from "@/components/satellite/bhoonidhi-fence-catalog-panel";
import { SatelliteWorkspaceFromUrl } from "@/components/satellite/satellite-workspace";
import {
  CommandCenterEvidence,
  satelliteOperationalStatus,
} from "@/components/dashboard/command-center-shell";
import { fmtNum } from "@/components/dashboard/format";
import { MetricGrid, OperationalStatusBar, PageHeader } from "@/components/ui";
import { TrustChip, trustToneFromProvider } from "@/components/ui/trust-chip";
import { bhoonidhi, plantationFences, sar, trees } from "@/lib/api";

function SatellitePageContent() {
  const ts = useTranslations("satellite");
  const to = useTranslations("opsStatus");
  const tc = useTranslations("chrome");

  const { data: treePage } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 100 }),
  });
  const { data: fencePage } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list(),
  });
  const { data: bhoonidhiStatus } = useQuery({
    queryKey: ["bhoonidhi-status"],
    queryFn: bhoonidhi.status,
  });
  const { data: sarStatus } = useQuery({
    queryKey: ["sar-status"],
    queryFn: () => sar.status(),
    retry: false,
  });

  const items = treePage?.items ?? [];
  const verified = items.filter((t) => t.satellite_verified).length;
  const fences = fencePage?.items ?? [];

  const ndviTrust = trustToneFromProvider(verified > 0 ? "live" : undefined);
  const sarTrust = trustToneFromProvider(sarStatus?.live_data_provider ?? sarStatus?.sar_provider);
  const bhoonidhiTrust = bhoonidhiStatus?.configured
    ? { tone: "live" as const, label: ts("catalogLive") }
    : { tone: "stub" as const, label: ts("optional") };

  const staleSites = fences.filter((f) => {
    if (!f.last_satellite_at) return true;
    const days = (Date.now() - new Date(f.last_satellite_at).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 14;
  }).length;

  const satStatus = satelliteOperationalStatus(to, {
    fenceCount: fences.length,
    siteSelected: true,
    ndviValue: null,
    verifiedTrees: verified,
    staleSites,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={ts("purpose")}
        title={ts("title")}
        description={ts("description")}
        breadcrumbs={[{ label: tc("sectionIntelligence") }, { label: tc("breadcrumbSatellite") }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TrustChip tone={ndviTrust.tone} label={verified > 0 ? ts("ndviActive") : ts("ndviReady")} />
            <TrustChip tone={sarTrust.tone} label={ts("radarLabel", { label: sarTrust.label })} />
            <TrustChip tone={bhoonidhiTrust.tone} label={ts("isroLabel", { label: bhoonidhiTrust.label })} />
          </div>
        }
      />

      <OperationalStatusBar
        tone={satStatus.tone}
        label={satStatus.label}
        summary={satStatus.summary}
        icon={satStatus.tone === "healthy" ? ShieldCheck : SatelliteIcon}
      />

      <MetricGrid
        columns={3}
        metrics={[
          { label: "Plantation sites", value: fmtNum(fences.length), hint: "Work-area boundaries" },
          {
            label: "Sites needing rescan",
            value: fmtNum(staleSites),
            hint: staleSites > 0 ? "Older than 14 days" : "All current",
            tone: staleSites > 0 ? "warning" : "default",
          },
          {
            label: "Trees satellite-verified",
            value: fmtNum(verified),
            hint: items.length ? `${Math.round((verified / items.length) * 100)}% of mapped` : "Optional ground truth",
            tone: verified > 0 ? "positive" : "default",
          },
        ]}
      />

      <DataTrustBanner compact />

      <SatelliteWorkspaceFromUrl />

      <CommandCenterEvidence
        title="Advanced — ISRO Bhoonidhi catalog"
        description="Search Indian satellite scenes for the selected site from the detail panel above"
      >
        <p className="text-sm text-stone-600">
          Select a site in the workspace, then use Bhoonidhi catalog search when configured on your
          server. Radar (SAR) integrity is available in the site detail panel for each boundary.
        </p>
        {bhoonidhiStatus && !bhoonidhiStatus.configured ? (
          <p className="text-xs text-amber-800">
            ISRO catalog search is optional and not configured. NDVI and SAR still work without it.
          </p>
        ) : null}
      </CommandCenterEvidence>
    </div>
  );
}

export default function SatellitePage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading satellite monitoring…</p>}>
      <SatellitePageContent />
    </Suspense>
  );
}
