"use client";

import {
  Activity,
  FileCheck,
  Globe,
  Leaf,
  Satellite,
  ShieldCheck,
} from "lucide-react";
import { CoverSlide } from "./deck-primitives";
import {
  AgendaRoadmap,
  AuditChainDiagram,
  CarbonConfidenceDiagram,
  DeploymentModelDiagram,
  EoFusionDiagram,
  FieldWorkflowDiagram,
  GeospatialLayersDiagram,
  MrvPipelineDiagram,
  NationalMrvContext,
  NdviTrendChart,
  PipelineEvidenceStrip,
  PlatformArchitectureDiagram,
  SarOpticalCompare,
  SchemeCardsGrid,
  StandardsHubDiagram,
  TransformationInfographic,
  VerificationSamplingDiagram,
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

export const DECK_SLIDE_COUNT = 20;
const T = DECK_SLIDE_COUNT;
const SHOT = "/presentation/screenshots";

const INDIAN_SCHEMES = [
  ["CAMPA", "MoEFCC", "Checklist · report · APO"],
  ["Green India Mission", "MoEFCC", "Readiness checklist"],
  ["MISHTI Mangrove", "MoEFCC", "Coastal checklist"],
  ["Nagar Van", "MoEFCC", "Urban forest template"],
  ["Green Credit 2023", "MoEFCC", "Calculator · checklist"],
  ["NHAI Highway", "MoRTH", "Chainage work areas"],
  ["MGNREGA", "Rural Dev", "Convergence checklist"],
  ["Jal Shakti", "Jal Shakti", "Riparian support"],
  ["Sahakar Van", "Cooperation", "Co-op template"],
];

const INTL_STANDARDS = [
  ["VM0047 ARR", "Verra", "Full accounting"],
  ["Gold Standard LUF", "Gold Standard", "Safeguards"],
  ["ICVCM CCPs", "ICVCM", "10 principles"],
  ["REDD+", "UNFCCC", "MRV readiness"],
  ["IPCC AR6", "IPCC", "Tier 1–2 quant"],
  ["GHG Protocol", "WRI-WBCSD", "Land sector"],
  ["ISO 14064-2", "ISO", "Project report"],
  ["TNFD LEAP", "TNFD", "Nature disclosure"],
  ["Darwin Core", "GBIF", "Species archive"],
  ["Paris Art. 6", "UNFCCC", "NDC traceability"],
];

const AGENDA_ITEMS = [
  { num: "01", title: "Policy context", sub: "CAMPA · GIM · Green Credit · Paris NDC", icon: <Globe className="h-4 w-4" /> },
  { num: "02", title: "Platform architecture", sub: "Field → satellite → carbon → evidence", icon: <Activity className="h-4 w-4" /> },
  { num: "03", title: "Field & remote MRV", sub: "GPS · NDVI · SAR · Bhoonidhi", icon: <Satellite className="h-4 w-4" /> },
  { num: "04", title: "Carbon & compliance", sub: "90% CI · nine schemes · global standards", icon: <Leaf className="h-4 w-4" /> },
  { num: "05", title: "Trust & verification", sub: "Hash chain · auditor role · signed bundles", icon: <ShieldCheck className="h-4 w-4" /> },
  { num: "06", title: "Pilot deployment", sub: "12-week rollout for state / PSU programmes", icon: <FileCheck className="h-4 w-4" /> },
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
      section="Briefing outline"
      title="Agenda — national plantation MRV & compliance"
      subtitle="Structured for programme directors, forest officers, and audit stakeholders"
      compactHeader
    >
      <AgendaRoadmap items={AGENDA_ITEMS} />
    </PptSlide>,

    <PptSlide
      key="s3"
      slideNum={3}
      total={T}
      section="Executive context"
      title="India's plantation programmes demand verifiable MRV"
      subtitle="Central schemes, carbon markets, and disclosure rules now require traceable evidence — not narrative reports"
      compactHeader
    >
      <NationalMrvContext />
      <PptCallout title="Policy imperative" tone="amber">
        Regulators and buyers increasingly reject spreadsheet-based claims. Programmes need per-tree GPS evidence,
        continuous remote monitoring, and tamper-evident audit trails aligned to MoEFCC and international standards.
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s4"
      slideNum={4}
      total={T}
      section="The challenge"
      title="From fragmented records to audit-ready national MRV"
      subtitle="Aranyix closes the gap between field activity and what regulators, auditors, and carbon buyers accept"
      compactHeader
    >
      <TransformationInfographic />
      <PptCallout title="Single platform outcome" tone="green">
        Geotagged per-tree registry · scheduled satellite + SAR sweeps · Monte Carlo carbon with 90% CI · Ed25519-signed
        evidence bundles — mapped to nine central schemes and eleven global standards.
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s5"
      slideNum={5}
      total={T}
      section="Platform overview"
      title="Unified MRV architecture — field to boardroom"
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
      key="s6"
      slideNum={6}
      total={T}
      variant="section"
      section="Part I"
      title="Field evidence & ground truth"
      subtitle="GPS-verified registration, survival surveys, and append-only measurement history"
    >
      {null}
    </PptSlide>,

    <PptSlide
      key="s7"
      slideNum={7}
      total={T}
      section="Ground MRV"
      title="Field data that survives a third-party audit"
      subtitle="Mobile capture with supervisor workflows, work-area polygons, and offline sync for remote plantations"
      compactHeader
    >
      <div className="ppt-slide-stack">
        <FieldWorkflowDiagram />
        <PptTwoCol
          ratio="1fr 1.1fr"
          left={
            <>
              <PptBullets
                items={[
                  "Per-tree GPS registration with timestamped photo evidence",
                  "DBH, height, survival surveys — append-only, never overwritten",
                  "Work-area boundaries for NHAI, CAMPA, and Nagar Van programmes",
                  "Bioacoustic biodiversity — BirdNET pipeline with Shannon diversity index",
                ]}
              />
              <PptKpiRow
                items={[
                  { value: "GPS+photo", label: "Capture" },
                  { value: "Offline", label: "Sync" },
                  { value: "Tier 4", label: "Plot MRV" },
                  { value: "Darwin", label: "Export" },
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
      </div>
    </PptSlide>,

    <PptSlide
      key="s8"
      slideNum={8}
      total={T}
      section="End-to-end MRV"
      title="Six-stage pipeline — sapling to signed evidence bundle"
      subtitle="Hash-chained audit log at every transition; no manual re-keying between field, satellite, and compliance"
      compactHeader
    >
      <div className="ppt-slide-stack">
        <MrvPipelineDiagram />
        <PipelineEvidenceStrip />
        <PptTwoCol
          ratio="0.85fr 1.15fr"
          left={
            <PptKpiRow
              items={[
                { value: "12.4k+", label: "Audit events", note: "Per organisation" },
                { value: "9+", label: "MoEFCC schemes", note: "Built-in templates" },
                { value: "11", label: "Global standards", note: "Same evidence base" },
                { value: "90% CI", label: "Carbon range", note: "Not a point estimate" },
              ]}
            />
          }
          right={
            <PptFigure
              src={`${SHOT}/dashboard.png`}
              alt="Executive dashboard KPIs"
              caption="Executive command centre — portfolio KPIs, carbon summary, and intelligence brief"
            />
          }
        />
      </div>
    </PptSlide>,

    <PptSlide
      key="s9"
      slideNum={9}
      total={T}
      variant="section"
      section="Part II"
      title="Remote monitoring & geospatial intelligence"
      subtitle="Scheduled optical and SAR sweeps — monsoon-resilient canopy integrity"
    >
      {null}
    </PptSlide>,

    <PptSlide
      key="s10"
      slideNum={10}
      total={T}
      section="Optical monitoring"
      title="Sentinel-2 NDVI — continuous canopy health at work-area scale"
      subtitle="Automated monthly sweeps with alert thresholds; NDVI decline triggers field inspection workflows"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <NdviTrendChart />
            <PptBullets
              items={[
                "Sentinel Hub integration with cloud-cover gating",
                "Alert when NDVI drops >0.15 vs. 30-day baseline",
                "Time-series charts per work area and species stratum",
                "Rule-based health narrative for field teams (optional AI layer)",
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
      key="s11"
      slideNum={11}
      total={T}
      section="All-weather monitoring"
      title="SAR + ISRO Bhoonidhi — integrity when optical fails"
      subtitle="Sentinel-1 C-band forest integrity through monsoon; fused with optical and ISRO catalog for unified KPIs"
      compactHeader
    >
      <PptTwoCol
        ratio="1.05fr 0.95fr"
        left={
          <>
            <SarOpticalCompare />
            <EoFusionDiagram />
          </>
        }
        right={
          <>
            <PptFigure
              src={`${SHOT}/intelligence.png`}
              alt="Satellite intelligence and fusion alerts"
              caption="Threat intelligence — composite risk, weather, and satellite fusion alerts"
            />
            <PptCallout title="Operational cadence" tone="neutral">
              Monthly optical sweep · weekly SAR watch · daily health roundup · automated compliance escalations
            </PptCallout>
          </>
        }
      />
    </PptSlide>,

    <PptSlide
      key="s12"
      slideNum={12}
      total={T}
      section="Geospatial view"
      title="National-scale map — every tree, plot, and work area georeferenced"
      subtitle="Interactive map with species layers, verification status, NDVI overlay, and export to GeoJSON / STAC"
      compactHeader
    >
      <PptTwoCol
        ratio="0.9fr 1.1fr"
        left={
          <>
            <GeospatialLayersDiagram />
            <PptBullets
              items={[
                "PostGIS-backed registry with sub-metre GPS accuracy",
                "Filter by programme, species, verification state, and health band",
                "Polygon boundaries for CAMPA compartments and NHAI chainage",
                "Executive rollup from individual tree to state / PSU portfolio",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/projects.png`}
            alt="Geospatial projects and work areas"
            caption="Projects view — work areas, chainage boundaries, and plantation programme mapping"
            objectPosition="center"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s13"
      slideNum={13}
      total={T}
      variant="section"
      section="Part III"
      title="Carbon integrity & regulatory compliance"
      subtitle="Conservative quantification, scheme templates, and international standard alignment"
    >
      {null}
    </PptSlide>,

    <PptSlide
      key="s14"
      slideNum={14}
      total={T}
      section="Carbon MRV"
      title="Carbon with confidence intervals — not marketing numbers"
      subtitle="IPCC AR6 · VM0047 · Gold Standard with Monte Carlo 90% CI, mortality buffer, and registry-grade ledger"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <CarbonConfidenceDiagram />
            <PptBullets
              items={[
                "Baseline, additionality, leakage, and pool accounting in project workflows",
                "Verra buffer deduction when uncertainty exceeds 15%",
                "Credit ledger with serial numbers and Paris Agreement Article 6 metadata",
                "Green Credit Programme 2023 calculator aligned to MoEFCC rules",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/carbon-tools.png`}
            alt="Carbon MRV tools"
            caption="Carbon tools — uncertainty bands, buffer settings, and ex-ante credit projection"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s15"
      slideNum={15}
      total={T}
      section="National compliance"
      title="Nine central government schemes — templates built in"
      subtitle="Guided checklists, auto-fill from live MRV data, and signed PDF/JSON exports per scheme profile"
      compactHeader
    >
      <SchemeCardsGrid rows={INDIAN_SCHEMES} />
      <PptCallout title="Also supported" tone="green">
        SEBI BRSR Principle 6 · India DPDP Act 2023 · Hindi i18n · WCAG accessibility
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s16"
      slideNum={16}
      total={T}
      section="Global alignment"
      title="International standards — same evidence base"
      subtitle="One plantation registry feeds Verra, Gold Standard, ICVCM, TNFD, ISO, and Paris Article 6 workflows"
      compactHeader
    >
      <StandardsHubDiagram rows={INTL_STANDARDS} />
    </PptSlide>,

    <PptSlide
      key="s17"
      slideNum={17}
      total={T}
      section="Trust layer"
      title="Tamper-evident by construction — not bolted on"
      subtitle="SHA-256 hash chain, daily root anchor, Ed25519 signed bundles, and RFC 3161 timestamp authority"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <AuditChainDiagram />
            <PptBullets
              items={[
                "Every field edit, measurement, and export logged immutably",
                "Verifier role with attest-only permissions — no edit rights",
                "Chain verification API for third-party auditors",
                "Twelve guided checklists with auto-signals from live data",
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/reports.png`}
            alt="Compliance reports and exports"
            caption="Framework reports — BRSR, CAMPA, VM0047 profiles with signed export"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s18"
      slideNum={18}
      total={T}
      section="Third-party verification"
      title="Auditors attest — stratified sampling without compromising integrity"
      subtitle="Random plot selection, species strata, Tier 4 extrapolation, and cryptographic attestation per sample item"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <>
            <VerificationSamplingDiagram />
            <PptKpiRow
              items={[
                { value: "Attest", label: "Verifier role" },
                { value: "Stratified", label: "Sampling" },
                { value: "Tier 4", label: "Plot MRV" },
                { value: "PDF", label: "Audit pack" },
              ]}
            />
          </>
        }
        right={
          <PptFigure
            src={`${SHOT}/trees.png`}
            alt="Tree registry verification view"
            caption="Tree registry — GPS coordinates, verification status, and measurement history per tree"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s19"
      slideNum={19}
      total={T}
      section="Implementation"
      title="12-week pilot model for state, PSU, and corporate programmes"
      subtitle="Low-risk entry: one plantation, one scheme profile, one signed evidence bundle — then scale"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={<DeploymentModelDiagram />}
        right={
          <>
            <PptFigure
              src={`${SHOT}/settings-team.png`}
              alt="Enterprise governance and team settings"
              caption="Enterprise-ready — RBAC, team governance, DPDP compliance, and API access"
            />
            <PptCallout title="Procurement-ready" tone="neutral">
              DPDP-compliant hosting · RBAC · API &amp; webhooks · Hindi · WCAG · PWA offline
            </PptCallout>
          </>
        }
      />
    </PptSlide>,

    <ThankYouSlide key="s20" slideNum={20} total={T} />,
  ];
}
