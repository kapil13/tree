"use client";

import { Building2, Factory, Globe, Landmark } from "lucide-react";
import { CoverSlide } from "./deck-primitives";
import {
  AiAnalysisGrid,
  BioacousticLayers,
  ComplianceUniverse,
  CompositeRiskTable,
  FraudMechanismHub,
  FraudSummaryTable,
  ImpactColumns,
  InstitutionalArchitecture,
  InstitutionalClose,
  InstitutionalMarketCompare,
  IntelligenceFusionStack,
  MarketGapMatrix,
  MrvLifecycleRing,
  PortalEvolutionTimeline,
  ProblemFragmentation,
  RegistrationPrograms,
  ScanCycleSchedule,
  SchemeNativeIndia,
  StakeholderPressure2026,
  ThreatEarlyWarningMatrix,
  UseCaseCard,
  UserUniverseGrid,
  VerificationLadder,
} from "./institutional-infographics";
import {
  PptBullets,
  PptCallout,
  PptFigure,
  PptSlide,
  PptTwoCol,
} from "./gov-slide-system";

export const DECK_SLIDE_COUNT = 33;
const T = DECK_SLIDE_COUNT;
const SHOT = "/presentation/screenshots";

export function DeckSlides({ onlySlide }: { onlySlide?: number }) {
  const slides = renderAllSlides();
  if (onlySlide != null) return <>{slides[onlySlide - 1]}</>;
  return <>{slides}</>;
}

function renderAllSlides() {
  return [
    /* ACT I — THE STAKES */
    <CoverSlide key="s1" total={T} />,

    <PptSlide
      key="s2"
      slideNum={2}
      total={T}
      section="Act I · The stakes"
      title="Planting is easy. Proving it survived is the hard part."
      subtitle="Governments, miners, and corporates spend massively on afforestation — but proof fragments across the organisation"
      compactHeader
    >
      <ProblemFragmentation />
    </PptSlide>,

    <PptSlide
      key="s3"
      slideNum={3}
      total={T}
      section="Act I · Why now"
      title="Accountability went from “nice to have” to “show me the data”"
      compactHeader
    >
      <StakeholderPressure2026 />
      <PptCallout title="Punchline" tone="amber">
        The winner is not who plants most. It is who <strong>proves, monitors, and responds fastest</strong>.
      </PptCallout>
    </PptSlide>,

    /* ACT II — A DIFFERENT PLATFORM */
    <PptSlide
      key="s4"
      slideNum={4}
      total={T}
      section="Act II · Platform"
      title="We didn't build another tree app"
      subtitle="Aranyix is a full-stack plantation intelligence platform — trust infrastructure for green capital"
      compactHeader
    >
      <MarketGapMatrix />
    </PptSlide>,

    <PptSlide
      key="s5"
      slideNum={5}
      total={T}
      section="Act II · Architecture"
      title="Three surfaces. One truth layer."
      subtitle="Web command centre · mobile field ops · APIs — fused through integrity scoring"
      compactHeader
    >
      <PptTwoCol
        ratio="1.1fr 0.9fr"
        left={<InstitutionalArchitecture />}
        right={
          <PptFigure
            src={`${SHOT}/dashboard.png`}
            alt="Aranyix executive command centre"
            caption="Executive command centre — portfolio KPIs, intelligence brief, and monitoring health"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s6"
      slideNum={6}
      total={T}
      section="Act II · Users"
      title="Eight roles. One governed platform."
      subtitle="Same platform serves the citizen with one neem tree and the department with 50,000 hectares"
      compactHeader
    >
      <UserUniverseGrid />
      <PptCallout title="Organisation layer" tone="neutral">
        Manager · Supervisor · Worker · Viewer — RBAC enforces who can see, edit, and approve.
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s7"
      slideNum={7}
      total={T}
      section="Act II · Onboarding"
      title="Four doors in. One intelligence engine behind all."
      compactHeader
    >
      <RegistrationPrograms />
    </PptSlide>,

    /* ACT III — ALWAYS-ON SCAN ENGINE */
    <PptSlide
      key="s8"
      slideNum={8}
      total={T}
      section="Act III · MRV lifecycle"
      title="Plan → Plant → Prove → Watch → Alert → Report → Repeat"
      subtitle="Every plantation is a living asset under continuous observation — not a one-time data entry event"
      compactHeader
    >
      <MrvLifecycleRing />
    </PptSlide>,

    <PptSlide
      key="s9"
      slideNum={9}
      total={T}
      section="Act III · Scan engine"
      title="Your portfolio is scanned while you sleep"
      subtitle="Scheduled observatory — monthly, weekly, and daily Celery beat jobs"
      compactHeader
    >
      <ScanCycleSchedule />
    </PptSlide>,

    <PptSlide
      key="s10"
      slideNum={10}
      total={T}
      section="Act III · Early warning"
      title="When the canopy screams, the platform listens"
      subtitle="Multi-signal catastrophic stress detection — satellite, SAR, weather, and pest intel"
      compactHeader
    >
      <ThreatEarlyWarningMatrix />
      <PptCallout title="Delivery" tone="green">
        In-app (always) · Email (satellite, threats, compliance) · SMS on critical · Push (citizen stewardship)
      </PptCallout>
    </PptSlide>,

    /* ACT IV — INTELLIGENCE FUSION */
    <PptSlide
      key="s11"
      slideNum={11}
      total={T}
      section="Act IV · Fusion"
      title="Five sensors. One fused picture."
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={<IntelligenceFusionStack />}
        right={
          <PptFigure
            src={`${SHOT}/intelligence.png`}
            alt="Portfolio intelligence panel"
            caption="Intelligence tab — AI analysis, NDVI chip, SAR panel, and pest intel per tree"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s12"
      slideNum={12}
      total={T}
      section="Act IV · AI vision"
      title="Every photo becomes a structured medical record for the tree"
      subtitle="Live OpenAI vision — not a chatbot gimmick; an input to credit eligibility and compliance gates"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={<AiAnalysisGrid />}
        right={
          <PptFigure
            src={`${SHOT}/trees.png`}
            alt="Tree detail with AI analysis"
            caption="Run AI Analysis — species, health, diseases, growth, and carbon update"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s13"
      slideNum={13}
      total={T}
      section="Act IV · Bioacoustic"
      title="The forest has a voice. We built the ears."
      subtitle="Major differentiator — acoustic biodiversity integrated with satellite and compliance exports"
      compactHeader
    >
      <PptTwoCol
        ratio="1.15fr 0.85fr"
        left={<BioacousticLayers />}
        right={
          <PptFigure
            src={`${SHOT}/bioacoustic.png`}
            alt="Bioacoustic biodiversity dashboard"
            caption="BirdNET + multi-taxa pipeline — species badges, Shannon diversity, IUCN status"
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s14"
      slideNum={14}
      total={T}
      section="Act IV · Threat watch"
      title="Don't wait for the outbreak. Read the signals."
      compactHeader
    >
      <PptBullets
        items={[
          "Pest Intel composite: satellite health + 48h rainfall + bioacoustic + locust corridor + field health counts",
          "Weather kinds (daily scan): heavy rain, hail, heat stress, high wind, frost",
          "Locust watch heuristic corridors → locust_watch alerts",
          "UI: Pest Intel panel on tree detail + Portfolio Threats tab + grounded AI assistant",
        ]}
      />
      <PptFigure
        src={`${SHOT}/alerts.png`}
        alt="Threat and alert dashboard"
        caption="Alerts — filter SAR, weather, NDVI, pest intel, and compliance escalations"
      />
    </PptSlide>,

    /* ACT V — INDIA + COMPLIANCE */
    <PptSlide
      key="s15"
      slideNum={15}
      total={T}
      section="Act V · India depth"
      title="14 government programmes. Not generic “projects.”"
      compactHeader
    >
      <SchemeNativeIndia />
    </PptSlide>,

    <PptSlide
      key="s16"
      slideNum={16}
      total={T}
      section="Act V · Compliance universe"
      title="One data layer. Every disclosure format."
      compactHeader
    >
      <ComplianceUniverse />
    </PptSlide>,

    /* ACT VI — USE CASES */
    <PptSlide
      key="s17"
      slideNum={17}
      total={T}
      section="Act VI · Government"
      title="Government & NHAI"
      compactHeader
    >
      <UseCaseCard
        title="Government & NHAI"
        audience="Forest departments · highway authorities · district admin"
        icon={Landmark}
        bullets={[
          "CAMPA blocks with survival KPIs and APO CSV import",
          "Highway chainage MRV with work-area polygons",
          "Nagar Van urban forest templates",
          "District rollups and compliance deadline automation",
        ]}
      />
      <PptFigure
        src={`${SHOT}/projects.png`}
        alt="Government plantation projects map"
        caption="Scheme-native projects — polygons, chainage, and admin hierarchy"
      />
    </PptSlide>,

    <PptSlide
      key="s18"
      slideNum={18}
      total={T}
      section="Act VI · Mining"
      title="Mining & progressive closure"
      compactHeader
    >
      <UseCaseCard
        title="Mining reclamation"
        audience="IBM/MMDR progressive closure · green belts"
        icon={Factory}
        bullets={[
          "Mining reclamation scheme with IBM/MMDR metadata",
          "Green belt density MRV and SAR slope/moisture watch",
          "Progressive closure checklist",
          "Green Credit linkage where applicable",
        ]}
      />
      <PptFigure
        src={`${SHOT}/satellite.png`}
        alt="SAR and satellite monitoring for mine polygons"
        caption="SAR integrity and optical NDVI over reclamation polygons"
      />
    </PptSlide>,

    <PptSlide
      key="s19"
      slideNum={19}
      total={T}
      section="Act VI · Corporate ESG"
      title="SEBI / CSR / corporate ESG"
      compactHeader
    >
      <UseCaseCard
        title="Corporate ESG"
        audience="Listed companies · CSR teams · supplier programmes"
        icon={Building2}
        bullets={[
          "BRSR Principle 6 export with assurance pack",
          "Portfolio health dashboard for board reporting",
          "Supplier geo due diligence (EUDR-ready packs)",
          "ISO 14064 / SBTi FLAG · internal credit ledger for CSR plantations",
        ]}
      />
      <PptFigure
        src={`${SHOT}/reports.png`}
        alt="BRSR and framework reports"
        caption="Framework reports — BRSR, CAMPA, VM0047 with signed export"
      />
    </PptSlide>,

    <PptSlide
      key="s20"
      slideNum={20}
      total={T}
      section="Act VI · UN / institutional"
      title="UN / climate / institutional finance"
      compactHeader
    >
      <UseCaseCard
        title="UN & climate finance"
        audience="DFIs · treaty reporting · nature disclosure"
        icon={Globe}
        bullets={[
          "TNFD with NDVI + bioacoustic evidence",
          "REDD+ / NDC framework profiles",
          "TROPOMI methane intelligence over work areas",
          "DFI safeguard packs and Darwin Core for GBIF",
        ]}
      />
      <PptFigure
        src={`${SHOT}/portfolio-health.png`}
        alt="Portfolio health monitoring"
        caption="Portfolio Health — threats, monitoring, biodiversity, and compliance tabs"
      />
    </PptSlide>,

    /* ACT VII — WHY US */
    <PptSlide
      key="s21"
      slideNum={21}
      total={T}
      section="Act VII · Market"
      title="They built features. We built a platform."
      compactHeader
    >
      <InstitutionalMarketCompare />
      <PptCallout title="Punchline" tone="green">
        Competitors sell a module. Aranyix is the <strong>infrastructure layer</strong> institutions have been assembling manually for a decade.
      </PptCallout>
    </PptSlide>,

    <PptSlide
      key="s22"
      slideNum={22}
      total={T}
      section="Act VII · Engineering"
      title="From vision to production platform — phase by phase"
      subtitle="2.5+ months of shipped product — and the scan engine runs every night"
      compactHeader
    >
      <PortalEvolutionTimeline />
    </PptSlide>,

    <PptSlide
      key="s23"
      slideNum={23}
      total={T}
      section="Act VII · Impact"
      title="What changes when proof becomes automatic"
      compactHeader
    >
      <ImpactColumns />
    </PptSlide>,

    <PptSlide
      key="s24"
      slideNum={24}
      total={T}
      section="Close"
      title="The operating system for distributed reforestation"
      className="ppt-slide--institutional-close"
      compactHeader
    >
      <InstitutionalClose />
    </PptSlide>,

    /* APPENDIX — FRAUD & DUPLICACY */
    <PptSlide
      key="s25"
      slideNum={25}
      total={T}
      variant="section"
      section="Appendix · Integrity"
      title="How Aranyix prevents fraud & duplicate tree claims"
      subtitle="Multi-mechanism integrity — not trust on a single photo or GPS pin"
    >
      <FraudMechanismHub />
    </PptSlide>,

    <PptSlide
      key="s26"
      slideNum={26}
      total={T}
      section="Appendix · Mechanism 1"
      title="Scheme-aware registration gates"
      subtitle="Compliance rule engine — first line of defense"
      compactHeader
    >
      <PptBullets
        items={[
          "Trees outside work-area boundaries blocked or flagged",
          "Over-planting density checks per hectare",
          "Species allow-list and spacing (~5 m) enforcement",
          "Strict GPS accuracy for government / ESG programmes",
          "Violations recorded as open compliance items on command centre",
        ]}
      />
    </PptSlide>,

    <PptSlide
      key="s27"
      slideNum={27}
      total={T}
      section="Appendix · Mechanism 2"
      title="Stopping duplicate registrations — same place, same photo"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={
          <PptBullets
            items={[
              "Coordinate dedup: nearest tree <5 m in same work area → blocked",
              "SHA-256 exact duplicate detection on every upload",
              "Perceptual hash catches resized / cropped / edited photos",
              "Org-scoped search catches reuse across projects",
            ]}
          />
        }
        right={
          <PptCallout title="Strict programmes" tone="amber">
            Government & corporate ESG: exact and near photo matches are <strong>blocked</strong>, not averaged away.
          </PptCallout>
        }
      />
    </PptSlide>,

    <PptSlide
      key="s28"
      slideNum={28}
      total={T}
      section="Appendix · Mechanism 3"
      title="Proving the photo was taken on-site, recently, at the tree"
      compactHeader
    >
      <PptBullets
        items={[
          "Live camera only in strict projects — no gallery picker",
          "EXIF GPS and timestamp required; photo age ≤7 days in strict mode",
          "Tree pin vs EXIF GPS within ~25 m",
          "Re-geotag detection when pin moved from photo GPS",
          "GPS accuracy gate ≤20 m in strict programmes",
        ]}
      />
    </PptSlide>,

    <PptSlide
      key="s29"
      slideNum={29}
      total={T}
      section="Appendix · Mechanism 4"
      title="AI as a fraud signal — not a vanity label"
      compactHeader
    >
      <PptBullets
        items={[
          "AI vision outputs overall confidence score (0–1)",
          "Confidence <0.65 → ai_confidence_low flag",
          "Low confidence feeds composite risk (+0.10) and reduces fusion score",
          "AI is ~20% weight in fusion when present — never sole proof",
          "Low-confidence scans cannot reach audit-ready status",
        ]}
      />
    </PptSlide>,

    <PptSlide
      key="s30"
      slideNum={30}
      total={T}
      section="Appendix · Mechanism 5"
      title="Independent earth observation — trees must exist from above"
      compactHeader
    >
      <PptBullets
        items={[
          "Sentinel NDVI presence checks per tree and work area",
          "satellite_verified required for audit-ready tier; stale scans (>90 days) block",
          "SAR Forest Integrity Score with integrity drop and divergence alerts",
          "Monitoring gate for credit transitions: SAR integrity ≥50, optical ≤60 days",
          "Divergence triggers field verification tasks — human follow-up required",
        ]}
      />
    </PptSlide>,

    <PptSlide
      key="s31"
      slideNum={31}
      total={T}
      section="Appendix · Mechanism 6"
      title="One integrity score from many signals — with hard blocks"
      compactHeader
    >
      <PptTwoCol
        ratio="1fr 1fr"
        left={<CompositeRiskTable />}
        right={
          <PptBullets
            items={[
              "Fusion score: field ~45–55%, satellite ~35–45%, AI ~20%",
              "Duplicate photo or coordinate → not credit-eligible regardless of score",
              "Fusion <65 → not credit-eligible",
              "Fusion <75 → not audit-ready",
            ]}
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s32"
      slideNum={32}
      total={T}
      section="Appendix · Mechanism 7"
      title="Trees must graduate — credits are the last step"
      compactHeader
    >
      <PptTwoCol
        ratio="0.9fr 1.1fr"
        left={<VerificationLadder />}
        right={
          <PptBullets
            items={[
              "→ Verified: ≥80% trees credit-eligible, avg fusion ≥65",
              "→ Issued: ≥90% audit-ready, avg fusion ≥75",
              "Registry serials only when audit-ready with zero blockers",
              "Verifier role: attest-only, no edit rights",
              "Hash-chained audit log + signed evidence bundles",
            ]}
          />
        }
      />
    </PptSlide>,

    <PptSlide
      key="s33"
      slideNum={33}
      total={T}
      section="Appendix · Summary"
      title="Fraud & duplicacy prevention — mechanism map"
      compactHeader
    >
      <FraudSummaryTable />
      <PptCallout title="Closing line" tone="green">
        Duplicacy is blocked at capture. Fraud is surfaced by fusion. Credits are issued only after audit-ready proof — field, AI, satellite, and independent verification aligned.
      </PptCallout>
    </PptSlide>,
  ];
}
