"use client";

import { CoverSlide } from "./deck-primitives";
import {
  PitchAuditChain,
  PitchDeployTimeline,
  PitchEvidenceStrip,
  PitchFieldFlow,
  PitchFusionDiagram,
  PitchMonitoringTimeline,
  PitchPipeline,
  PitchRolesGrid,
  PitchSarCompare,
  PitchSchemeMatrix,
  PitchStandardsWheel,
  PitchTransformation,
  PitchVerifyPyramid,
  PitchWhyWins,
} from "./pitch-infographics";
import {
  CarbonConfidenceDiagram,
  NdviTrendChart,
  PlatformArchitectureDiagram,
} from "./gov-infographics";
import {
  PptBullets,
  PptCallout,
  PptFigure,
  PptKpiRow,
  PptSlide,
  PptTwoCol,
  ThankYouSlide,
} from "./gov-slide-system";

export const DECK_SLIDE_COUNT = 26;
const T = DECK_SLIDE_COUNT;
const SHOT = "/presentation/screenshots";

const INDIAN_SCHEMES = [
  ["CAMPA Compensatory Afforestation", "MoEFCC", "Checklist · report · APO CSV"],
  ["Green India Mission (GIM)", "MoEFCC", "Readiness checklist"],
  ["MISHTI Mangrove Restoration", "MoEFCC", "Coastal checklist"],
  ["Nagar Van Yojana Urban Forest", "MoEFCC", "Urban template · report"],
  ["Green Credit Programme 2023", "MoEFCC", "Calculator · checklist"],
  ["NHAI Green Highway Plantation", "MoRTH", "Chainage work areas"],
  ["MGNREGA Farm Forestry", "Rural Dev", "Convergence checklist"],
  ["Jal Shakti Riverbank", "Jal Shakti", "Riparian support"],
  ["Sahakar Van Cooperative", "Cooperation", "Template · report"],
];

const INTL_STANDARDS = [
  ["VM0047 ARR", "Verra", "Baseline · additionality · leakage"],
  ["Land Use & Forests", "Gold Standard", "Safeguards checklist"],
  ["Core Carbon Principles", "ICVCM", "10-principle checklist"],
  ["REDD+ Warsaw Framework", "UNFCCC", "MRV evidence report"],
  ["AR6 / 2019 Refinement", "IPCC", "Tier 1–2 quantification"],
  ["Land Sector Removals 2024", "GHG Protocol", "Uncertainty bands export"],
  ["ISO 14064-2:2019", "ISO", "Project report structure"],
  ["TNFD LEAP", "TNFD", "Nature disclosure export"],
  ["Darwin Core Archive", "GBIF", "Species occurrence archive"],
  ["Paris Agreement Art. 4 & 6", "UNFCCC", "Retirement metadata"],
  ["STAC 1.0 / OGC Features", "OGC", "GeoJSON catalog endpoints"],
];

export function DeckSlides({ onlySlide }: { onlySlide?: number }) {
  const slides = renderAllSlides();
  if (onlySlide != null) return <>{slides[onlySlide - 1]}</>;
  return <>{slides}</>;
}

function renderAllSlides() {
  return [
    <CoverSlide key="s1" total={T} />,

    <PptSlide
      key="s2"
      slideNum={2}
      total={T}
      section="The problem"
      title="Plantation claims collapse under audit"
      subtitle="Spreadsheets, WhatsApp photos, and one-off consultant reports cannot survive regulator or buyer scrutiny"
      compactHeader
    >
      <PitchTransformation />
    </PptSlide>,

    <PptSlide
      key="s3"
      slideNum={3}
      total={T}
      section="The solution"
      title="From a geotagged sapling to a signed evidence bundle"
      subtitle="Six-stage pipeline with a hash-chained audit log at every transition"
      compactHeader
    >
      <PitchPipeline />
      <PptCallout title="Each step is immutable" tone="green">
        Register → Measure → Monitor → Quantify → Comply → Prove. No manual re-keying between field,
        satellite, and compliance teams.
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s4"
      slideNum={4}
      total={T}
      section="Architecture"
      title="Four surfaces, one source of truth"
      subtitle="PostGIS evidence core with Indian EO integration, carbon services, and compliance automation"
      compactHeader
    >
      <PlatformArchitectureDiagram />
      <PptKpiRow
        items={[
          { value: "Web + Mobile", label: "Channels", note: "Offline PWA field app" },
          { value: "PostGIS", label: "Evidence core", note: "GeoJSON · STAC" },
          { value: "Sentinel + ISRO", label: "Earth observation", note: "Optical + SAR" },
          { value: "Ed25519", label: "Trust layer", note: "Signed exports" },
        ]}
      />
    </PptSlide>,

    <PptSlide
      key="s5"
      slideNum={5}
      total={T}
      section="Field MRV"
      title="Field data that survives an audit"
      subtitle="GPS-tagged registration, append-only measurements, and offline-first mobile capture"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1.1fr"
        left={
          <>
            <PitchFieldFlow />
            <PptBullets
              items={[
                "Per-tree GPS registration with timestamped photo evidence",
                "DBH, height, survival surveys — append-only, never overwritten",
                "Work-area polygons (geofences) as the spatial unit of record",
                "Offline-first mobile queues — auto-sync on reconnect",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/field-ops.png`}
            alt="Field operations dashboard"
            caption="Field operations — supervisor queues, work areas, and project health"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s6"
      slideNum={6}
      total={T}
      section="Monitoring automation"
      title="Monitoring is scheduled, not requested"
      subtitle="Celery workers run satellite sweeps, health roundups, and compliance scans on a fixed cadence"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={<PitchMonitoringTimeline />}
        right={
          <PptFigure
            src={`${SHOT}/monitoring.png`}
            alt="Monitoring dashboard and job runs"
            caption="Monitoring ops — scheduled jobs, scan cycle registry, and recent run telemetry"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s7"
      slideNum={7}
      total={T}
      section="Optical satellite"
      title="Sentinel-2 NDVI — from pixel to project KPI"
      subtitle="Copernicus Sentinel Hub integration with cloud-cover gating and automatic decline alerts"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <NdviTrendChart />
            <PptBullets
              items={[
                "NDVI and EVI for trees (point) and work areas (polygon)",
                "Alert when NDVI drops more than 0.15 vs baseline",
                "NDVI preview imagery and full time series per plantation",
                "Graceful demo fallback when provider keys are absent",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/portfolio-health.png`}
            alt="Portfolio canopy health monitoring"
            caption="Portfolio health — NDVI bands, canopy coverage, and site-level health scores"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s8"
      slideNum={8}
      total={T}
      section="SAR monitoring"
      title="See through cloud and monsoon"
      subtitle="Sentinel-1 C-band SAR via GEE or Sentinel Hub — NISAR-inspired analytics on live C-band feed"
      compactHeader
    >
      <PptTwoCol
        ratio="1.05fr 0.95fr"
        left={
          <>
            <PitchSarCompare />
            <PptBullets
              items={[
                "Forest Integrity Score 0–100 with letter grade from optical + SAR fusion",
                "Modes: aligned, optical–SAR divergent, monsoon gap-fill",
                "Ten SAR alert types including integrity drop and wetland detection",
                "SAR findings auto-create field verification tasks",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/satellite.png`}
            alt="Satellite monitoring view"
            caption="Satellite layer — NDVI trends, SAR integrity, and fusion outcomes"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s9"
      slideNum={9}
      total={T}
      section="Indian EO"
      title="ISRO Bhoonidhi & multi-source fusion"
      subtitle="Sovereign-data narratives for government and PSU buyers"
      compactHeader
    >
      <PitchFusionDiagram />
      <PptBullets
        items={[
          "Bhoonidhi STAC search across NRSC collections (LISS-3, AWIFS, OCM NDVI, Sentinel-1 GRD)",
          "Fusion status per work area: Sentinel NDVI, Bhoonidhi availability, SAR integrity",
          "Recommended actions when sources diverge or data goes stale",
        ]}
      />
    </PptSlide>,

    <PptSlide
      key="s10"
      slideNum={10}
      total={T}
      section="Satellite health AI"
      title="NDVI decline, explained"
      subtitle="Rule-based pest, disease and stress classification with optional AI narrative"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <PptBullets
            items={[
              "Analyses NDVI time series for decline and spatial heterogeneity",
              "Risk level with specific findings and treatment recommendations",
              "Optional AI narrative — 2–4 farmer-readable sentences",
              "Health analysis records persist and trigger email / in-app alerts",
              "Admin telemetry shows live vs demo scan ratios",
            ]}
          />
        }
        right={
          <PptFigure
            src={`${SHOT}/intelligence.png`}
            alt="Satellite health intelligence"
            caption="Health analysis — risk badge, treatment list, and portfolio intelligence brief"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s11"
      slideNum={11}
      total={T}
      section="Threat intelligence"
      title="Risk before damage"
      subtitle="Weather, pest intel, and locust corridors fused into a composite site risk score"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <PptBullets
            items={[
              "1–7 day forecast at plantation centroid — rain, heat, wind, frost rules",
              "Threat watch combines weather, pest/disease intel, and locust corridors",
              "Pest intel fuses satellite health, 48h rainfall, and bioacoustic signals",
              "Powered by Open-Meteo — always live, no API key dependency",
            ]}
          />
        }
        right={
          <PptFigure
            src={`${SHOT}/alerts.png`}
            alt="Threat watch alerts"
            caption="Threat watch — composite risk, weather alerts, and recommended field actions"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s12"
      slideNum={12}
      total={T}
      section="Biodiversity"
      title="Prove the forest came back to life"
      subtitle="Bioacoustic monitoring — a key differentiator for nature-positive claims"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <PptBullets
            items={[
              "Field audio from mobile app with GPS and offline queue",
              "BirdNET plus multi-taxa detection (amphibians, mammals, insects, reptiles)",
              "Ecoacoustic indices: ACI, ADI, AEI, Bioacoustic Index, NDSI",
              "Shannon / Simpson diversity and 0–100 Biodiversity Health Score",
              "IUCN Red List enrichment and NDVI-to-bioacoustic correlation",
            ]}
          />
        }
        right={
          <PptFigure
            src={`${SHOT}/bioacoustic.png`}
            alt="Bioacoustic biodiversity dashboard"
            caption="Bioacoustic engine — species detections, diversity indices, and IUCN status"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s13"
      slideNum={13}
      total={T}
      section="Carbon MRV"
      title="A range, not a marketing number"
      subtitle="Monte Carlo 90% confidence intervals on every CO₂e figure"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <CarbonConfidenceDiagram />
            <PptBullets
              items={[
                "IPCC AR6, Verra VM0047, and Gold Standard LUF methodologies",
                "Verra conservative deduction when uncertainty exceeds 15%",
                "Mortality-adjusted ex-ante credits with dynamic permanence buffer (10–30%)",
                "Additional pools: deadwood, litter, soil organic carbon",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/carbon-tools.png`}
            alt="Carbon MRV tools"
            caption="Carbon tools — uncertainty bands, buffer settings, and ex-ante projection"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s14"
      slideNum={14}
      total={T}
      section="VM0047 accounting"
      title="Baseline, additionality, leakage — structured, not narrative"
      subtitle="Full project accounting board for verifiers and registry preparation"
      compactHeader
    >
      <PptKpiRow
        items={[
          { value: "Baseline", label: "Scenarios", note: "Land cover class" },
          { value: "Additionality", label: "Assessment", note: "Scored factors" },
          { value: "Leakage", label: "Accounts", note: "By type + mitigation" },
          { value: "Pools", label: "Configuration", note: "Per project" },
        ]}
      />
      <PptCallout title="Verifier-ready summary endpoint" tone="neutral">
        Consolidated VM0047 readiness summary for third-party review — not external registry issuance.
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s15"
      slideNum={15}
      total={T}
      section="Credit ledger"
      title="Registry-grade discipline before the registry"
      subtitle="Internal ledger for traceability — serial numbers, buffer, and retirement metadata"
      compactHeader
    >
      <PptBullets
        items={[
          "Lifecycle: estimated → verified → buffered → issued",
          "Structured serial numbers with state and year components",
          "Retirement records with Paris Agreement Article 6 corresponding-adjustment fields",
          "Exclusive claim registry rejects conflicting claims at the database level",
          "MoEFCC Green Credit calculator with 5-year vesting and density thresholds",
        ]}
      />
      <PptCallout title="Honest framing" tone="amber">
        Internal registry for traceability — not external Verra / Gold Standard issuance.
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s16"
      slideNum={16}
      total={T}
      section="National compliance"
      title="Nine central government schemes, built in"
      subtitle="Guided checklists, auto-fill from live MRV data, and signed exports per scheme profile"
      compactHeader
    >
      <PitchSchemeMatrix rows={INDIAN_SCHEMES} />
      <PptCallout title="Also supported" tone="green">
        SEBI BRSR Principle 6 export · India DPDP Act 2023 · Hindi i18n · WCAG accessibility
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s17"
      slideNum={17}
      total={T}
      section="Global alignment"
      title="Global standards — same evidence base"
      subtitle="One plantation registry feeds Verra, Gold Standard, ICVCM, TNFD, ISO, and Paris Article 6 workflows"
      compactHeader
    >
      <PitchStandardsWheel rows={INTL_STANDARDS} />
    </PptSlide>,

    <PptSlide
      key="s18"
      slideNum={18}
      total={T}
      section="Compliance workflow"
      title="Twelve guided checklists that fill themselves in"
      subtitle="Scheme selection drives checklist and report profile; auto-signals mark items from live data"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <PptBullets
            items={[
              "Violation tracking with deadlines, escalation, and reminder alerts",
              "Rule engine enforces spacing, pit size, species mix, and density",
              "Seven planting templates encode scheme-specific field rules",
              "Convergence pairs supported (e.g. CAMPA + MGNREGA)",
            ]}
          />
        }
        right={
          <PptFigure
            src={`${SHOT}/compliance-settings.png`}
            alt="Compliance checklist settings"
            caption="Compliance portal — checklist progress, auto-signals, and scheme configuration"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s19"
      slideNum={19}
      total={T}
      section="Trust layer"
      title="Tamper-evident by construction"
      subtitle="SHA-256 hash chain, daily root anchor, Ed25519 signed bundles, and RFC 3161 TSA when configured"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <PitchAuditChain />
            <PitchEvidenceStrip />
          </>
        }
        right={
          <PptBullets
            items={[
              "Chain verification API for independent auditors",
              "Evidence bundles: MRV context, compliance PDF, carbon summary, photo manifest",
              "Ed25519 detached signature and SHA-256 digest in response headers",
              "Every field edit, measurement, and export logged immutably",
            ]}
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s20"
      slideNum={20}
      total={T}
      section="Verification"
      title="Give auditors access without giving them edit rights"
      subtitle="Verifier role with attest-only permissions and stratified sampling"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <PitchVerifyPyramid />
            <PptBullets
              items={[
                "Random or species-stratified tree sampling",
                "Per-item attestation with cryptographic hash and timestamp",
                "PDF sample audit report export",
                "Tier 4 plot monitoring with statistical extrapolation",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/trees.png`}
            alt="Tree registry verification view"
            caption="Tree registry — GPS, verification status, and measurement history"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s21"
      slideNum={21}
      total={T}
      section="Reporting"
      title="One click from dashboard to disclosure"
      subtitle="Twelve framework report profiles spanning Indian schemes and global standards"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <PptBullets
            items={[
              "SEBI BRSR Core Principle 6 export with assurance pack",
              "ISO 14064-2 project report — JSON, Excel, or assurance zip",
              "TNFD LEAP nature disclosure using bioacoustic and NDVI evidence",
              "GHG Protocol Land Sector removals with 90% uncertainty bands",
              "Darwin Core Archive for GBIF · STAC catalog for auditor GIS",
            ]}
          />
        }
        right={
          <PptFigure
            src={`${SHOT}/reports.png`}
            alt="Framework reports and exports"
            caption="Framework reports — BRSR, CAMPA, VM0047 profiles with signed export"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s22"
      slideNum={22}
      total={T}
      section="Roles"
      title="Purpose-built views, not one dashboard for everyone"
      subtitle="Role-based access control with organisation and project scoping"
      compactHeader
    >
      <PitchRolesGrid />
    </PptSlide>,

    <PptSlide
      key="s23"
      slideNum={23}
      total={T}
      section="AI"
      title="AI where it adds evidence, not noise"
      subtitle="Metered scan quotas per tier with deterministic fallbacks when keys are absent"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <PptBullets
            items={[
              "Tree photo analysis: species, health, disease findings, growth estimate",
              "Satellite health narrative in plain language for field teams",
              "Portfolio AI assistant grounded in live trees, alerts, weather, carbon",
              "Executive brief generation for leadership summaries",
            ]}
          />
        }
        right={
          <PptFigure
            src={`${SHOT}/assistant.png`}
            alt="AI portfolio assistant"
            caption="AI assistant — portfolio questions answered with cited live numbers"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s24"
      slideNum={24}
      total={T}
      section="Enterprise"
      title="Built for procurement review"
      subtitle="DPDP, WCAG, Hindi i18n, webhooks, and self-hosted deployment paths"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={<PitchDeployTimeline />}
        right={
          <>
            <PptFigure
              src={`${SHOT}/settings-team.png`}
              alt="Enterprise governance and team settings"
              caption="Enterprise-ready — RBAC, team governance, DPDP compliance, API access"
            />
            <PptCallout title="Deployment options" tone="neutral">
              Docker Compose · Terraform · Kubernetes · India-region VPS hosting
            </PptCallout>
          </>
        }
      />
    </PptSlide>,

    <PptSlide
      key="s25"
      slideNum={25}
      total={T}
      section="Why Aranyix"
      title="The only platform that closes the loop"
      subtitle="From field capture through satellite fusion to signed disclosure — in one audit trail"
      compactHeader
    >
      <PitchWhyWins />
    </PptSlide>,

    <ThankYouSlide key="s26" slideNum={26} total={T} />,
  ];
}
