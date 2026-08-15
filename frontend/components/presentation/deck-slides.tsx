"use client";

import {
  Activity,
  Bird,
  Check,
  CloudRain,
  FileCheck,
  Leaf,
  Lock,
  MapPin,
  Radar,
  Satellite,
  Shield,
  ShieldCheck,
  Sparkles,
  TreePine,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { CoverSlide } from "./deck-primitives";
import { SlideBullets, SlideFooter, SlideFrame } from "./slide-frame";
import {
  FullBleedSlide,
  VisualSlide,
} from "./visual-slide-layout";

export const DECK_SLIDE_COUNT = 26;
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
  ["STAC / OGC", "OGC", "GeoJSON + catalog"],
];

function PipelineFull() {
  const steps = [
    { icon: TreePine, label: "Register", sub: "GPS + photo" },
    { icon: Activity, label: "Measure", sub: "DBH / height" },
    { icon: Satellite, label: "Monitor", sub: "Sat + SAR" },
    { icon: Leaf, label: "Quantify", sub: "90% CI CO₂e" },
    { icon: ShieldCheck, label: "Comply", sub: "IN + global" },
    { icon: FileCheck, label: "Prove", sub: "Signed bundle" },
  ];
  return (
    <div className="deck-pipeline-full">
      {steps.map(({ icon: Icon, label, sub }, i) => (
        <div key={label} className="flex flex-1 items-center gap-0.5">
          <div className="deck-pipeline-node">
            <span className="deck-pipeline-node-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="deck-pipeline-node-icon">
              <Icon className="h-4 w-4" />
            </div>
            <span className="deck-pipeline-node-label">{label}</span>
            <span className="deck-pipeline-node-sub">{sub}</span>
          </div>
          {i < steps.length - 1 ? <div className="deck-pipeline-arrow" aria-hidden /> : null}
        </div>
      ))}
    </div>
  );
}

function ComparisonTable() {
  const rows = [
    "Per-tree GPS MRV",
    "Continuous satellite + SAR",
    "Biodiversity evidence",
    "Carbon with 90% CI",
    "Indian scheme compliance",
    "International standards",
    "Tamper-evident audit trail",
    "Signed evidence bundles",
    "Offline field capture",
  ];
  return (
    <table className="deck-table">
      <thead>
        <tr>
          <th>Capability</th>
          <th className="text-center">Spreadsheets</th>
          <th className="text-center">Point tools</th>
          <th className="text-center text-emerald-500">Aranyix</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row}>
            <td>{row}</td>
            <td className="text-center">
              <X className="mx-auto h-3.5 w-3.5 text-red-400/80" />
            </td>
            <td className="text-center">
              <span className="text-[0.55rem] text-amber-600">Partial</span>
            </td>
            <td className="text-center">
              <Check className="mx-auto h-3.5 w-3.5 text-emerald-500" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DeckSlides({ onlySlide }: { onlySlide?: number }) {
  const slides = renderAllSlides();
  if (onlySlide != null) return <>{slides[onlySlide - 1]}</>;
  return <>{slides}</>;
}

function renderAllSlides() {
  return [
    <CoverSlide key="s1" />,

    <FullBleedSlide key="s2" slideNum={2} total={T} screenshot={`${SHOT}/dashboard.png`} screenshotAlt="Executive dashboard" eyebrow="The challenge" title="Plantation claims collapse under audit" subtitle="Spreadsheets fail regulators. Aranyix delivers GPS-verified, satellite-backed, signed evidence.">
      <div className="deck-glass-panel deck-glass-panel--row w-full">
        <div className="deck-glass-panel flex-1 border-red-400/40">
          <p className="text-[0.55rem] font-bold uppercase tracking-wider text-red-300">Without Aranyix</p>
          <SlideBullets items={["WhatsApp photos", "Carbon guesses", "Manual packs", "No audit trail"]} className="mt-2 !space-y-1" />
        </div>
        <div className="deck-glass-panel flex-1 border-emerald-400/50">
          <p className="text-[0.55rem] font-bold uppercase tracking-wider text-emerald-300">With Aranyix</p>
          <SlideBullets items={["Per-tree GPS MRV", "90% CI carbon", "Auto checklists", "Ed25519 bundles"]} className="mt-2 !space-y-1" />
        </div>
      </div>
    </FullBleedSlide>,

    <FullBleedSlide key="s3" slideNum={3} total={T} screenshot={`${SHOT}/trees.png`} screenshotAlt="Tree registry" eyebrow="End-to-end MRV" title="From geotagged sapling to signed evidence bundle" subtitle="Hash-chained audit log at every step.">
      <div className="deck-glass-panel w-full">
        <PipelineFull />
        <div className="deck-metric-wall mt-3">
          {[
            ["12.4k+", "Audit events"],
            ["9+", "MoEFCC schemes"],
            ["11", "Global standards"],
            ["Ed25519", "Signed exports"],
          ].map(([v, l]) => (
            <div key={l} className="deck-glass-stat">
              <span className="deck-stat-value text-emerald-300">{v}</span>
              <span className="deck-stat-label">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </FullBleedSlide>,

    <VisualSlide key="s4" slideNum={4} total={T} eyebrow="Live platform" title="One portal — field to boardroom" subtitle="Real Aranyix sign-in: satellite MRV, tree health, biodiversity, AI insights." screenshot={`${SHOT}/login-page.png`} screenshotAlt="Aranyix login portal" stats={[{ label: "Surfaces", value: "Web + Mobile" }, { label: "Roles", value: "RBAC" }, { label: "API", value: "PostGIS" }, { label: "Offline", value: "PWA" }]} bullets={["Satellite MRV", "Tree health", "Biodiversity", "AI insights"]} />,

    <VisualSlide key="s5" slideNum={5} total={T} variant="light" eyebrow="Executive command center" title="Portfolio intelligence at a glance" subtitle="Live dashboard — Demo Program Manager · NHAI portfolio." screenshot={`${SHOT}/dashboard.png`} screenshotAlt="Executive dashboard" stats={[{ label: "Trees", value: "18" }, { label: "CO₂e", value: "6.36 t" }, { label: "Canopy", value: "83.3%" }, { label: "Verified", value: "50%" }]} bullets={["Intelligence brief", "Command strip KPIs", "Carbon + NDVI charts", "Program chips"]} />,

    <VisualSlide key="s6" slideNum={6} total={T} eyebrow="Field operations" title="Field data that survives an audit" subtitle="GPS registration, append-only measurements, survival surveys, offline sync." screenshot={`${SHOT}/field-ops.png`} screenshotAlt="Field operations" stats={[{ label: "Capture", value: "GPS+photo" }, { label: "Sync", value: "Offline" }, { label: "Unit", value: "Work area" }, { label: "Trail", value: "Append-only" }]} bullets={["Mobile field app", "Supervisor queues", "Survey workflows", "Polygon boundaries"]} />,

    <FullBleedSlide key="s7" slideNum={7} total={T} screenshot={`${SHOT}/monitoring.png`} screenshotAlt="Automated monitoring" eyebrow="Automation" title="Monitoring is scheduled, not requested" subtitle="Monthly optical + SAR sweeps, daily health roundups, compliance escalations.">
      <div className="deck-glass-panel deck-glass-panel--row w-full">
        {[
          ["Monthly", "Optical sweep"],
          ["Weekly", "SAR watch"],
          ["Daily", "Health roundup"],
          ["Auto", "Compliance alerts"],
        ].map(([v, l]) => (
          <div key={l} className="deck-glass-stat">
            <span className="deck-stat-value text-emerald-300">{v}</span>
            <span className="deck-stat-label">{l}</span>
          </div>
        ))}
      </div>
    </FullBleedSlide>,

    <VisualSlide key="s8" slideNum={8} total={T} variant="light" eyebrow="Optical satellite" title="Sentinel-2 NDVI — pixel to project KPI" subtitle="Site satellite scan with NDVI, radar, and ISRO Bhoonidhi integration." screenshot={`${SHOT}/satellite.png`} screenshotAlt="Satellite monitoring" stats={[{ label: "Trees", value: "18" }, { label: "Verified", value: "9" }, { label: "NDVI", value: "Active" }, { label: "SAR", value: "Ready" }]} bullets={["Sentinel Hub", "Cloud cover check", "Alert >0.15 drop", "Time-series charts"]} />,

    <VisualSlide key="s9" slideNum={9} total={T} eyebrow="SAR monitoring" title="See through cloud and monsoon" subtitle="Sentinel-1 C-band integrity when optical is unusable." screenshot={`${SHOT}/monitoring.png`} screenshotAlt="SAR monitoring" stats={[{ label: "Integrity", value: "87 B+" }, { label: "Band", value: "C-band" }, { label: "Feed", value: "GEE/Hub" }, { label: "Watch", value: "Weekly" }]} bullets={["NISAR-inspired L/S", "Forest integrity grade", "Monsoon-resilient", "Fusion alerts"]} />,

    <FullBleedSlide key="s10" slideNum={10} total={T} screenshot={`${SHOT}/map.png`} screenshotAlt="Map view" eyebrow="Indian EO" title="ISRO Bhoonidhi & multi-source fusion" subtitle="Sentinel-2 + Bhoonidhi + Sentinel-1 → unified canopy intelligence." position="center">
      <div className="deck-glass-panel deck-glass-panel--row w-full">
        {["Sentinel-2", "Bhoonidhi", "Sentinel-1", "Fused KPI"].map((s) => (
          <div key={s} className="deck-glass-stat">
            <Satellite className="mx-auto h-4 w-4 text-emerald-400" />
            <span className="deck-stat-label mt-1 block">{s}</span>
          </div>
        ))}
      </div>
    </FullBleedSlide>,

    <VisualSlide key="s11" slideNum={11} total={T} eyebrow="Satellite health AI" title="NDVI decline, explained in plain language" subtitle="Rule-based analysis + optional AI narrative for field teams." screenshot={`${SHOT}/intelligence.png`} screenshotAlt="Threat intelligence" stats={[{ label: "Risk", value: "Composite" }, { label: "Forecast", value: "7-day" }, { label: "Pest", value: "Intel" }, { label: "Action", value: "Recommended" }]} bullets={["Pest classification", "Treatment recs", "Alert triggers", "Persisted analysis"]} />,

    <VisualSlide key="s12" slideNum={12} total={T} variant="light" eyebrow="Threat intelligence" title="Risk before damage" subtitle="Portfolio threat watch — weather, pest corridors, composite risk score." screenshot={`${SHOT}/portfolio-health.png`} screenshotAlt="Portfolio health" stats={[{ label: "Watch", value: "Portfolio" }, { label: "Weather", value: "Open-Meteo" }, { label: "Locust", value: "Seasonal" }, { label: "Score", value: "Composite" }]} bullets={["Early warnings", "Per-site actions", "Executive rollup", "Alert routing"]} />,

    <VisualSlide key="s13" slideNum={13} total={T} eyebrow="Differentiator" title="Prove the forest came back to life" subtitle="BirdNET + multi-taxa audio, Shannon diversity, Darwin Core export." screenshot={`${SHOT}/bioacoustic.png`} screenshotAlt="Bioacoustic panel" stats={[{ label: "Shannon", value: "3.42" }, { label: "Health", value: "78" }, { label: "Species", value: "Multi-taxa" }, { label: "Export", value: "Darwin" }]} bullets={["BirdNET pipeline", "IUCN baselines", "NDVI correlation", "GBIF-ready"]} />,

    <VisualSlide key="s14" slideNum={14} total={T} variant="light" eyebrow="Carbon MRV" title="A range, not a marketing number" subtitle="IPCC AR6 · VM0047 · Gold Standard with Monte Carlo 90% CI." screenshot={`${SHOT}/carbon-tools.png`} screenshotAlt="Carbon MRV tools" stats={[{ label: "CI", value: "90%" }, { label: "Buffer", value: "10–30%" }, { label: "Pools", value: "SOC+ litter" }, { label: "Method", value: "VM0047" }]} bullets={["Mortality adjusted", "Verra deduction", "Ex-ante credits", "Uncertainty bands"]} />,

    <VisualSlide key="s15" slideNum={15} total={T} eyebrow="Verra VM0047" title="Baseline, additionality, leakage — structured" subtitle="Full ARR accounting in project workflows." screenshot={`${SHOT}/projects.png`} screenshotAlt="Projects" stats={[{ label: "Baseline", value: "✓" }, { label: "Additionality", value: "✓" }, { label: "Leakage", value: "✓" }, { label: "Pools", value: "✓" }]} bullets={["VM0047 profile", "Strata documented", "ICVCM aligned", "Pool accounting"]} />,

    <VisualSlide key="s16" slideNum={16} total={T} variant="light" eyebrow="Credit integrity" title="Registry-grade discipline before the registry" subtitle="Credit ledger, serial numbers, Paris Art. 6 metadata, exclusive claims." screenshot={`${SHOT}/carbon-tools.png`} screenshotAlt="Credit ledger" stats={[{ label: "States", value: "4" }, { label: "Serial", value: "BYOT" }, { label: "Buffer", value: "10–30%" }, { label: "Paris", value: "Art.6" }]} bullets={["Estimated → issued", "Claim registry", "Conflict detect", "Green Credit calc"]} />,

    <FullBleedSlide key="s17" slideNum={17} total={T} screenshot={`${SHOT}/compliance-settings.png`} screenshotAlt="Compliance standards" eyebrow="National compliance" title="Nine central government schemes, built in" subtitle="SEBI BRSR P6 · India DPDP Act · MoEFCC templates.">
      <div className="deck-glass-panel deck-table-fill w-full max-h-[8rem] overflow-hidden">
        <table className="deck-table text-emerald-50">
          <thead>
            <tr>
              <th>Scheme</th>
              <th>Ministry</th>
              <th>Platform</th>
            </tr>
          </thead>
          <tbody>
            {INDIAN_SCHEMES.slice(0, 6).map(([a, b, c]) => (
              <tr key={a}>
                <td className="font-medium">{a}</td>
                <td>{b}</td>
                <td>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FullBleedSlide>,

    <FullBleedSlide key="s18" slideNum={18} total={T} screenshot={`${SHOT}/reports.png`} screenshotAlt="Global standards reports" eyebrow="Global standards" title="International standards, same evidence base" subtitle="Verra · Gold Standard · ICVCM · TNFD · ISO · Paris Art. 6.">
      <div className="deck-glass-panel deck-table-fill w-full max-h-[8rem] overflow-hidden">
        <table className="deck-table text-emerald-50">
          <thead>
            <tr>
              <th>Standard</th>
              <th>Body</th>
              <th>Capability</th>
            </tr>
          </thead>
          <tbody>
            {INTL_STANDARDS.slice(0, 6).map(([a, b, c]) => (
              <tr key={a}>
                <td className="font-medium">{a}</td>
                <td>{b}</td>
                <td>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FullBleedSlide>,

    <VisualSlide key="s19" slideNum={19} total={T} eyebrow="Compliance portal" title="Twelve guided checklists that fill themselves in" subtitle="Scheme-driven profiles, auto-signals, violation tracking, signed exports." screenshot={`${SHOT}/reports.png`} screenshotAlt="Reports and compliance" stats={[{ label: "Checklists", value: "12+" }, { label: "Auto-fill", value: "Live data" }, { label: "Export", value: "PDF+JSON" }, { label: "Sign", value: "Ed25519" }]} bullets={["VM0047 profile", "CAMPA report", "BRSR P6", "Rule engine"]} />,

    <FullBleedSlide key="s20" slideNum={20} total={T} screenshot={`${SHOT}/settings-team.png`} screenshotAlt="Team governance" eyebrow="Trust layer" title="Tamper-evident by construction" subtitle="SHA-256 hash chain · daily root · Ed25519 bundles · RFC 3161 TSA.">
      <div className="deck-glass-panel w-full">
        <div className="deck-trust-blocks">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="deck-trust-block !bg-white/10 !border-emerald-400/40 text-emerald-50">
              <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              hash block {n} · SHA-256 → anchor {n === 4 ? "S3" : "→"}
            </div>
          ))}
        </div>
      </div>
    </FullBleedSlide>,

    <VisualSlide key="s21" slideNum={21} total={T} eyebrow="Verification" title="Auditors attest — without edit rights" subtitle="Verifier role, stratified sampling, cryptographic attestation per item." screenshot={`${SHOT}/trees.png`} screenshotAlt="Tree registry for verification" stats={[{ label: "Role", value: "Attest-only" }, { label: "Sample", value: "Stratified" }, { label: "Plot MRV", value: "Tier 4" }, { label: "Report", value: "PDF audit" }]} bullets={["Random sampling", "Species strata", "Plot extrapolation", "Chain verify API"]} />,

    <VisualSlide key="s22" slideNum={22} total={T} variant="light" eyebrow="Reporting" title="One click from dashboard to disclosure" subtitle="BRSR · ISO 14064-2 · TNFD LEAP · GHG Protocol · Darwin Core · STAC." screenshot={`${SHOT}/reports.png`} screenshotAlt="Framework reports" stats={[{ label: "BRSR P6", value: "Export" }, { label: "TNFD", value: "LEAP" }, { label: "ISO", value: "14064" }, { label: "Darwin", value: "Core" }]} bullets={["Framework PDF", "GeoJSON", "STAC catalog", "Evidence pack"]} />,

    <VisualSlide key="s23" slideNum={23} total={T} eyebrow="Personas" title="Purpose-built views for every stakeholder" subtitle="Citizen · field · compliance · executive — same evidence base." screenshot={`${SHOT}/assistant.png`} screenshotAlt="AI assistant" stats={[{ label: "Citizen", value: "BYOT" }, { label: "Field", value: "Offline" }, { label: "Compliance", value: "12+" }, { label: "Executive", value: "KPIs" }]} bullets={["Role-based views", "Shared audit log", "One org truth", "AI grounded in data"]} />,

    <FullBleedSlide key="s24" slideNum={24} total={T} screenshot={`${SHOT}/settings-team.png`} screenshotAlt="Enterprise settings" eyebrow="Enterprise ready" title="Built for procurement review" subtitle="DPDP · Hindi · WCAG · PWA · RBAC · webhooks · API.">
      <div className="deck-glass-panel deck-glass-panel--row w-full">
        {["DPDP Act", "Hindi i18n", "WCAG a11y", "PWA offline", "RBAC", "Webhooks"].map((b) => (
          <div key={b} className="deck-glass-stat">
            <ShieldCheck className="mx-auto h-4 w-4 text-emerald-400" />
            <span className="deck-stat-label mt-1 block">{b}</span>
          </div>
        ))}
      </div>
    </FullBleedSlide>,

    <FullBleedSlide key="s25" slideNum={25} total={T} screenshot={`${SHOT}/dashboard.png`} screenshotAlt="Platform comparison" eyebrow="Competitive edge" title="The only platform that closes the loop" subtitle="Field → satellite → carbon → compliance → signed evidence.">
      <div className="deck-glass-panel w-full overflow-hidden">
        <ComparisonTable />
      </div>
    </FullBleedSlide>,

    <SlideFrame key="s26" slideNum={26} variant="dark">
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="deck-cta-glow" aria-hidden />
        <Leaf className="relative h-10 w-10 text-emerald-400" />
        <h2 className="deck-title relative mt-3">See your own plantation, verified</h2>
        <div className="relative mt-4 max-w-lg space-y-2 text-left">
          {[
            "Pilot: register trees · satellite sweep · evidence bundle",
            "Compliance mapping workshop for your schemes",
            "Integration review for ESG + GIS systems",
          ].map((item) => (
            <p key={item} className="deck-bullet text-[0.72rem]">
              {item}
            </p>
          ))}
        </div>
        <p className="relative mt-5 text-[clamp(0.8rem,1.4vw,1.05rem)] font-medium text-lime-300">
          Evidence you can hand to a regulator, an auditor, or a buyer.
        </p>
        <p className="relative mt-3 text-[0.58rem] text-emerald-200/60">manager@byot.earth · demo@byot.earth · aranyix.tech</p>
      </div>
      <SlideFooter slideNum={26} total={T} />
    </SlideFrame>,
  ];
}
