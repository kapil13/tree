"use client";

import {
  Activity,
  Bird,
  Building2,
  Check,
  Globe,
  Landmark,
  Leaf,
  Radar,
  Shield,
  ShieldCheck,
  Smartphone,
  Sprout,
  TreePine,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function InstTable({
  headers,
  rows,
  compact,
}: {
  headers: string[];
  rows: (string | ReactNode)[][] ;
  compact?: boolean;
}) {
  return (
    <div className="inst-table-wrap">
      <table className={cn("inst-table", compact && "inst-table--compact")}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={j === 0 ? "inst-table-primary" : undefined}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InstitutionalCoverMeta() {
  return (
    <div className="inst-cover-tags">
      {["Field truth", "Live satellite", "AI vision", "Acoustic biodiversity", "Audit-ready MRV"].map((t) => (
        <span key={t} className="inst-cover-tag">{t}</span>
      ))}
    </div>
  );
}

export function ProblemFragmentation() {
  const pains = [
    "Proof fragments across registers, photos, Excel, and consultant PDFs",
    "Survival surveys once a year — stress, flood, pest, canopy loss discovered too late",
    "Boards and regulators demand traceable evidence, not ceremony photos",
    "Carbon and nature claims without multi-signal verification create greenwashing risk",
    "Field teams work offline; HQ needs real-time portfolio intelligence",
  ];
  return (
    <div className="inst-problem">
      <div className="inst-problem-left">
        <p className="inst-problem-kicker">The accountability crisis</p>
        <ul className="inst-problem-list">
          {pains.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="inst-problem-right">
        <div className="inst-problem-vs">
          <div className="inst-problem-panel inst-problem-panel--bad">
            <span>Registration tools</span>
            <small>Count trees once</small>
          </div>
          <div className="inst-problem-arrow">→</div>
          <div className="inst-problem-panel inst-problem-panel--good">
            <span>Operating system for proof</span>
            <small>Watch · fuse · alert · export</small>
          </div>
        </div>
        <p className="inst-punchline">The industry built registration tools. <strong>Nobody built the operating system for proof.</strong></p>
      </div>
    </div>
  );
}

export function StakeholderPressure2026() {
  return (
    <InstTable
      headers={["Stakeholder", "Pressure"]}
      rows={[
        ["Government", "CAMPA, Nagar Van, NHAI, Green Credit — scheme KPIs must be measurable"],
        ["Mining", "Progressive closure & green belts need continuous MRV, not one-time planting"],
        ["SEBI / Listed cos", "BRSR Principle 6 — board-level environmental evidence"],
        ["CSR", "Spend is scrutinised; survival and geo-proof matter"],
        ["UN / Climate / Nature", "NDCs, REDD+, TNFD, GBF — disclosure without field + satellite + biodiversity data is hollow"],
      ]}
    />
  );
}

export function MarketGapMatrix() {
  const rows = [
    ["Citizen tree apps", "QR tag, photo, feel-good", "No scheme MRV, audit trail, satellite fusion"],
    ["Carbon / MRV vendors", "Spreadsheet carbon math", "Weak field integrity, no India scheme depth"],
    ["Satellite-only platforms", "NDVI maps", "No ground truth, survival workflow, compliance exports"],
    ["ESG reporting tools", "PDF packs from manual data", "No live scanning, no anti-fraud fusion"],
    ["Govt MIS / GIS", "Static layers", "No mobile offline ops, no automated alert engine"],
  ];
  return (
    <div className="inst-gap">
      <InstTable headers={["Category", "What you usually get", "What's missing"]} rows={rows} compact />
      <div className="inst-gap-bridge">
        <Zap className="h-5 w-5 text-emerald-600" />
        <p>
          <strong>Aranyix</strong> connects people in the field → sensors in the sky → AI on the ground → alerts in the pocket → exports in the boardroom.
        </p>
      </div>
    </div>
  );
}

export function InstitutionalArchitecture() {
  const surfaces = [
    { icon: Globe, label: "Web Portal", sub: "Command centre" },
    { icon: Smartphone, label: "Mobile Field", sub: "Offline operations" },
    { icon: Activity, label: "APIs & Webhooks", sub: "Integration layer" },
  ];
  const outputs = [
    { label: "Scheme MRV", sub: "14 programmes" },
    { label: "Alert Engine", sub: "20+ alert kinds" },
    { label: "Compliance Exports", sub: "BRSR · TNFD · VM0047…" },
  ];
  const stack = [
    "OpenAI GPT-4o-mini — species, health, disease from photos",
    "Sentinel Hub NDVI — per-tree and polygon scans",
    "SAR monthly + weekly integrity watches",
    "ISRO Bhoonidhi dual-source fusion",
    "Open-Meteo weather · BirdNET bioacoustic · TROPOMI CH₄",
    "Celery beat — daily/weekly/monthly scans without human trigger",
  ];
  return (
    <div className="inst-arch">
      <div className="inst-arch-surfaces">
        {surfaces.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="inst-arch-surface">
            <Icon className="h-6 w-6 text-emerald-700" />
            <strong>{label}</strong>
            <span>{sub}</span>
          </div>
        ))}
      </div>
      <div className="inst-arch-fusion">
        <Shield className="h-5 w-5" />
        <div>
          <strong>Integrity Fusion</strong>
          <span>Photo · GPS · AI · Satellite · SAR</span>
        </div>
      </div>
      <div className="inst-arch-outputs">
        {outputs.map((o) => (
          <div key={o.label} className="inst-arch-output">
            <strong>{o.label}</strong>
            <span>{o.sub}</span>
          </div>
        ))}
      </div>
      <ul className="inst-arch-stack">
        {stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

export function UserUniverseGrid() {
  const roles = [
    { role: "Citizen / BYOT", who: "Homeowners, farmers", does: "Register trees, adopt, QR passports", icon: Sprout },
    { role: "Field worker", who: "MGNREGA crews", does: "Offline registration, survival surveys", icon: TreePine },
    { role: "Field supervisor", who: "Beat officers", does: "Field-ops dashboard, contractor oversight", icon: Users },
    { role: "Government user", who: "Forest dept, NHAI", does: "Scheme projects, KPI rollups, compliance", icon: Landmark },
    { role: "Corporate / ESG", who: "CSR, sustainability", does: "Portfolios, BRSR exports, geo-MRV", icon: Building2 },
    { role: "NGO / community", who: "Cooperatives, FPOs", does: "Community plantations, scheme metadata", icon: Leaf },
    { role: "Verifier", who: "Third-party QA", does: "Attestation, audit evidence review", icon: ShieldCheck },
    { role: "Platform admin", who: "Aranyix ops", does: "Org governance, workers, CMS", icon: Activity },
  ];
  return (
    <div className="inst-roles-grid">
      {roles.map(({ role, who, does, icon: Icon }) => (
        <div key={role} className="inst-role-card">
          <div className="inst-role-icon"><Icon className="h-4 w-4" /></div>
          <p className="inst-role-title">{role}</p>
          <p className="inst-role-who">{who}</p>
          <p className="inst-role-does">{does}</p>
        </div>
      ))}
    </div>
  );
}

export function RegistrationPrograms() {
  const programs = [
    { code: "byot", name: "BYOT Public", who: "Citizens", bar: "1 photo · quick tagging" },
    { code: "government_nhai", name: "Government & Public Sector", who: "Forest dept, NHAI, PSUs", bar: "3 photos · strict integrity" },
    { code: "corporate_esg", name: "Industry & Corporate ESG", who: "Listed cos, CSR, mines", bar: "2 photos · board exports" },
    { code: "ngo_community", name: "NGO & Community", who: "NGOs, cooperatives", bar: "2 photos · scheme-linked" },
  ];
  return (
    <div className="inst-programs">
      <div className="inst-programs-grid">
        {programs.map((p) => (
          <div key={p.code} className="inst-program-card">
            <code>{p.code}</code>
            <strong>{p.name}</strong>
            <span>{p.who}</span>
            <small>{p.bar}</small>
          </div>
        ))}
      </div>
      <div className="inst-program-flow">
        <span>Signup → OTP → enrollment</span>
        <span>→</span>
        <span>Professional access request</span>
        <span>→</span>
        <span>Scheme picker on project create</span>
      </div>
      <p className="inst-program-note">
        <strong>Program</strong> = who you are · <strong>Scheme</strong> = funding/compliance programme · <strong>Project</strong> = plantation with polygons & MRV lifecycle
      </p>
    </div>
  );
}

export function MrvLifecycleRing() {
  const phases = [
    { phase: "Plan", cap: "Scheme picker, polygons, species" },
    { phase: "Plant", cap: "Mobile/web registration, offline queue" },
    { phase: "Prove", cap: "AI analysis, fusion score, re-geotag" },
    { phase: "Watch", cap: "Satellite + SAR sweeps, estate mode" },
    { phase: "Alert", cap: "20+ kinds → email, SMS, push" },
    { phase: "Report", cap: "MRV export, evidence ZIP, PDFs" },
    { phase: "Repeat", cap: "Monthly NDVI, weekly SAR, nightly backfill" },
  ];
  return (
    <div className="inst-lifecycle">
      {phases.map((p, i) => (
        <div key={p.phase} className="inst-lifecycle-step">
          <div className="inst-lifecycle-num">{i + 1}</div>
          <strong>{p.phase}</strong>
          <span>{p.cap}</span>
        </div>
      ))}
    </div>
  );
}

export function ScanCycleSchedule() {
  return (
    <div className="inst-scan-grid">
      <div className="inst-scan-block">
        <h4>Monthly</h4>
        <InstTable
          compact
          headers={["When", "Scan", "Purpose"]}
          rows={[
            ["1st 02:00 UTC", "Optical NDVI sweep", "Re-scan stale areas; NDVI degradation ≥15%"],
            ["5th 03:00 UTC", "SAR monthly sweep", "Moisture, waterlogging, wetland signals"],
          ]}
        />
      </div>
      <div className="inst-scan-block">
        <h4>Weekly</h4>
        <InstTable
          compact
          headers={["When", "Scan", "Purpose"]}
          rows={[
            ["Mon 04:00", "SAR integrity watch", "At-risk fences from prior divergence"],
            ["Sun 04:30", "Biodiversity baseline", "GBIF/IUCN species snapshot"],
          ]}
        />
      </div>
      <div className="inst-scan-block inst-scan-block--wide">
        <h4>Daily heartbeat</h4>
        <InstTable
          compact
          headers={["Time", "Job", "Purpose"]}
          rows={[
            ["03:00", "Health roundup", "Portfolio health + compliance escalation"],
            ["03:45", "Integrity fusion backfill", "Re-score 50 projects nightly"],
            ["05:30", "Threat watch scan", "Weather + pest + locust heuristics"],
            ["06:00", "Survival survey reminders", "Overdue field surveys"],
            ["06:30", "Satellite health digest", "Canopy summary to supervisors"],
            ["07:00", "Compliance deadline scan", "Approaching / overdue deadlines"],
          ]}
        />
      </div>
    </div>
  );
}

export function ThreatEarlyWarningMatrix() {
  return (
    <InstTable
      compact
      headers={["Threat", "Detection signal", "Alert", "Response"]}
      rows={[
        ["Fire / canopy loss", "Acute NDVI drop; satellite health critical", "ndvi_degradation, sar_optical_divergent", "Supervisor → field inspection brief"],
        ["Heavy rain / flood", "Open-Meteo forecast", "weather_heavy_rain, weather_hail", "Pre-event warning to field teams"],
        ["Waterlogging", "SAR double-bounce", "sar_flood_risk", "Ground verification prompted"],
        ["Hidden moisture", "SAR moisture signatures", "sar_hidden_moisture", "Estate / mine polygon watch"],
        ["Heat / drought", "Forecast + fire_drought watch", "weather_heat_stress", "Preventive irrigation review"],
        ["Pest / disease", "AI disease_risk + pest intel", "pest_intel_high/critical", "Treatment pushed to work-area panel"],
      ]}
    />
  );
}

export function IntelligenceFusionStack() {
  const layers = [
    { label: "Tree Photo", tech: "OpenAI Vision → species, health, disease, growth" },
    { label: "Sentinel NDVI", tech: "Optical canopy time series" },
    { label: "SAR L-band", tech: "Ground moisture & integrity" },
    { label: "Bhoonidhi", tech: "ISRO dual fusion" },
    { label: "Open-Meteo", tech: "Weather threat rules" },
    { label: "Pest Intel", tech: "Composite risk score" },
    { label: "Bioacoustic", tech: "Shannon · IUCN enrichment" },
  ];
  return (
    <div className="inst-fusion-stack">
      <div className="inst-fusion-layers">
        {layers.map((l) => (
          <div key={l.label} className="inst-fusion-layer">
            <strong>{l.label}</strong>
            <span>{l.tech}</span>
          </div>
        ))}
      </div>
      <div className="inst-fusion-core">
        <Radar className="h-6 w-6" />
        <div>
          <strong>Integrity Fusion Score</strong>
          <span>Field + satellite + AI → Alert Engine → Supervisor → Field Action</span>
        </div>
      </div>
    </div>
  );
}

export function AiAnalysisGrid() {
  return (
    <InstTable
      compact
      headers={["Output", "Value for MRV"]}
      rows={[
        ["Species identification", "Scientific + common name, confidence, alternates"],
        ["Health classification", "healthy · moderate · unhealthy · disease_risk"],
        ["Disease detection", "Named pathogens with severity when present"],
        ["Growth estimates", "DBH, height, canopy, biomass"],
        ["Carbon update", "Rolls into IPCC-aligned carbon engine"],
        ["Recommendations", "Prioritised care actions"],
        ["Integrity input", "Feeds fusion; low confidence = audit blocker"],
      ]}
    />
  );
}

export function BioacousticLayers() {
  return (
    <div className="inst-bio-grid">
      <InstTable
        compact
        headers={["Layer", "Capability"]}
        rows={[
          ["Capture", "60–180s recordings — web + mobile; offline queue"],
          ["BirdNET", "Bird species identification"],
          ["Multi-taxa", "Perch, frogs, insect activity indices"],
          ["Metrics", "Shannon diversity, SPL, acoustic complexity"],
          ["Enrichment", "GBIF + IUCN threatened-species signals"],
          ["Correlation", "Bioacoustic health × NDVI trends"],
          ["Compliance", "TNFD packs · Darwin Core export"],
        ]}
      />
      <div className="inst-bio-callout">
        <Bird className="h-8 w-8 text-emerald-600" />
        <p>You can count trees from space. <strong>Only Aranyix also asks what lives in them.</strong></p>
      </div>
    </div>
  );
}

export function SchemeNativeIndia() {
  const schemes = [
    "CAMPA", "GIM", "MISHTI", "Nagar Van", "NHAI Highway", "MGNREGA", "Jal Shakti",
    "Green Credit", "Sahakar Van", "Mining Reclamation", "Estate Monitoring",
    "DFI Green Corridor", "Rajasthan Poshan Vatika", "+ state-filtered",
  ];
  return (
    <div className="inst-scheme-native">
      <div className="inst-scheme-chips">
        {schemes.map((s) => (
          <span key={s} className="inst-scheme-chip">{s}</span>
        ))}
      </div>
      <p className="inst-scheme-foot">
        Each scheme: metadata forms · KPI targets · auto checklists · MRV export · field-ops rollup · CAMPA APO CSV import
      </p>
      <p className="inst-scheme-foot"><strong>India admin hierarchy:</strong> State → District → Block → Gram Panchayat on every project</p>
    </div>
  );
}

export function ComplianceUniverse() {
  const groups = [
    { title: "India", items: "BRSR P6 wizard · NGT/CAMPA · Green Credit · DPDP · ISO 14064" },
    { title: "Carbon", items: "VM0047 · Gold Standard LUF · IPCC AR6 · credit ledger" },
    { title: "UN / Nature", items: "TNFD · REDD+ · Paris NDC · GBF · Darwin Core · World Bank ESF" },
    { title: "Trade", items: "EU DRF/EUDR supplier geo pack" },
    { title: "Audit", items: "Evidence ZIP + signing · audit trail · 19 checklists · 17 report views" },
  ];
  return (
    <div className="inst-compliance-universe">
      {groups.map((g) => (
        <div key={g.title} className="inst-compliance-card">
          <strong>{g.title}</strong>
          <p>{g.items}</p>
        </div>
      ))}
      <p className="inst-compliance-tagline">Audit-ready. Not certifying. Not issuing registry credits. <strong>Making your evidence undeniable.</strong></p>
    </div>
  );
}

export function UseCaseCard({
  title,
  audience,
  bullets,
  icon: Icon,
}: {
  title: string;
  audience: string;
  bullets: string[];
  icon: typeof Landmark;
}) {
  return (
    <div className="inst-usecase">
      <div className="inst-usecase-head">
        <Icon className="h-6 w-6 text-emerald-700" />
        <div>
          <strong>{title}</strong>
          <span>{audience}</span>
        </div>
      </div>
      <ul>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

export function InstitutionalMarketCompare() {
  const rows: [string, string, string][] = [
    ["Field offline mobile", "Rare / basic", "Full offline queue + sync"],
    ["AI on tree photos", "Add-on or absent", "Live vision → health, species, disease, carbon"],
    ["Satellite NDVI", "Dashboard only", "Per-tree + polygon + monthly sweep"],
    ["SAR moisture/flood", "Enterprise silo", "Integrated weekly/monthly alerts"],
    ["Bioacoustic biodiversity", "Research tools", "Production pipeline + TNFD path"],
    ["India scheme depth", "Custom consulting", "14 schemes native in product"],
    ["Integrity anti-fraud", "Manual audit", "Automated fusion gating credits"],
    ["Compliance exports", "One framework", "15+ frameworks, same data"],
    ["Alert automation", "Email reports", "20+ kinds, daily beat, SMS critical"],
    ["GHG methane", "Separate vendor", "TROPOMI + dispersion in portal"],
    ["Platform governance", "Per-customer build", "Super-admin, RBAC, webhooks"],
  ];
  return (
    <InstTable
      compact
      headers={["Capability", "Typical market", "Aranyix"]}
      rows={rows.map(([cap, market, aranyix]) => [
        cap,
        market,
        <span key={cap} className="inst-check-cell"><Check className="inline h-3.5 w-3.5 text-emerald-600" /> {aranyix}</span>,
      ])}
    />
  );
}

export function PortalEvolutionTimeline() {
  const phases = [
    { phase: "Foundation", built: "Auth, RBAC, registration, carbon, AI, satellite NDVI", value: "Core MRV loop" },
    { phase: "Field Ops", built: "Mobile offline, projects, survival surveys, field dashboard", value: "Bharat-scale ground truth" },
    { phase: "Monitoring", built: "Celery automation, SAR sweeps, alert engine", value: "Always-on watch" },
    { phase: "Intelligence", built: "Weather, pest intel, Bhoonidhi, AI assistant", value: "Decision intelligence" },
    { phase: "Audit", built: "Evidence bundles, credit ledger, webhooks", value: "Boardroom ready" },
    { phase: "Scheme integration", built: "14 schemes, CAMPA APO, mining reclamation", value: "India programme-native" },
    { phase: "Integrity", built: "EXIF, dedup, fusion, credit gating", value: "Anti-fraud trust layer" },
    { phase: "Portal maturity", built: "Portfolio Health, 17 reports, bioacoustic, emissions", value: "Institutional command centre" },
  ];
  return (
    <div className="inst-evolution">
      {phases.map((p, i) => (
        <div key={p.phase} className="inst-evolution-row">
          <span className="inst-evolution-num">{i + 1}</span>
          <div>
            <strong>{p.phase}</strong>
            <p>{p.built}</p>
            <small>{p.value}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ImpactColumns() {
  const items = [
    { who: "Departments", text: "One pane for survival, satellite, scheme KPIs, and alerts — not five vendors" },
    { who: "Field teams", text: "Offline-first; know exactly what evidence is missing before audit fails" },
    { who: "Mining", text: "Progressive closure with continuous SAR + optical watch on reclamation polygons" },
    { who: "Boards", text: "BRSR/TNFD packs from live data, not annual consultant scramble" },
    { who: "Auditors", text: "Signed evidence bundles + immutable audit log + framework-mapped refs" },
    { who: "Nature", text: "Bioacoustic proof that plantations are habitats, not just carbon rows" },
  ];
  return (
    <div className="inst-impact-grid">
      {items.map((item) => (
        <div key={item.who} className="inst-impact-card">
          <strong>{item.who}</strong>
          <p>{item.text}</p>
        </div>
      ))}
    </div>
  );
}

export function InstitutionalClose() {
  const lines = [
    "We watch — satellite, SAR, weather, and acoustics on a schedule, not on request",
    "We fuse — photo + GPS + AI + canopy + sound = integrity score you can defend",
    "We report — from CAMPA survival KPI to TNFD nature disclosure, from one truth layer",
  ];
  return (
    <div className="inst-close">
      <p className="inst-close-lead">
        Aranyix turns every planted tree into a continuously monitored, multi-sensor verified, alert-responsive climate and nature asset — from the field worker&apos;s phone to the auditor&apos;s evidence bundle.
      </p>
      <div className="inst-close-lines">
        {lines.map((l, i) => (
          <div key={l} className="inst-close-line">
            <span>{i + 1}</span>
            <p>{l}</p>
          </div>
        ))}
      </div>
      <p className="inst-close-final">Built for programmes that must prove outcomes. Ready for the stakeholders who finally demand them.</p>
    </div>
  );
}

export function FraudMechanismHub() {
  const mechanisms = [
    "Compliance rules", "Coordinate dedup", "Photo dedup", "GPS & EXIF",
    "AI confidence", "Satellite NDVI", "SAR integrity", "Fusion engine",
    "Verification ladder", "Credit gates",
  ];
  return (
    <div className="inst-fraud-hub">
      <div className="inst-fraud-center">One tree → one claim</div>
      <div className="inst-fraud-orbit">
        {mechanisms.map((m) => (
          <span key={m} className="inst-fraud-chip">{m}</span>
        ))}
      </div>
    </div>
  );
}

export function FraudSummaryTable() {
  return (
    <InstTable
      compact
      headers={["Mechanism", "Technology", "Primary fraud prevented"]}
      rows={[
        ["Compliance rules", "Rule engine, geofencing", "Fake placement, boundary gaming"],
        ["Coordinate dedup", "PostGIS <5 m", "Double-counting same location"],
        ["Photo dedup", "SHA-256 + perceptual hash", "Reused / recycled photos"],
        ["GPS & EXIF", "Live camera, timestamp", "Spoofed or stale evidence"],
        ["AI analysis", "Vision confidence scoring", "Weak photo evidence"],
        ["Satellite NDVI", "Sentinel presence checks", "Ghost trees, no canopy"],
        ["SAR integrity", "Sentinel-1 fusion", "Land-use change, divergence"],
        ["Fusion engine", "Weighted multi-signal", "Single-point trust failure"],
        ["Verification ladder", "Status machine + blockers", "Premature trust"],
        ["Credit / registry gates", "80% / 90% thresholds", "Portfolio-scale gaming"],
        ["Verifier & audit", "Sampling, signed bundles", "Post-hoc tampering"],
      ]}
    />
  );
}

export function VerificationLadder() {
  const steps = [
    { status: "Registered", req: "Default; may have integrity flags" },
    { status: "Field verified", req: "GPS/photo match, composite risk < 0.3" },
    { status: "Satellite corroborated", req: "Satellite verified, low risk, no dup photo" },
    { status: "Audit ready", req: "All blockers cleared" },
  ];
  return (
    <div className="inst-ladder">
      {steps.map((s, i) => (
        <div key={s.status} className="inst-ladder-step">
          <span>{i + 1}</span>
          <div>
            <strong>{s.status}</strong>
            <p>{s.req}</p>
          </div>
          {i < steps.length - 1 ? <div className="inst-ladder-arrow">↓</div> : null}
        </div>
      ))}
    </div>
  );
}

export function CompositeRiskTable() {
  return (
    <InstTable
      compact
      headers={["Signal", "Risk added"]}
      rows={[
        ["Duplicate coordinate", "+0.45"],
        ["Duplicate photo", "+0.35"],
        ["GPS ↔ photo mismatch", "+0.20"],
        ["GPS accuracy fail", "+0.15"],
        ["Re-geotag mismatch", "+0.15"],
        ["Low AI confidence", "+0.10"],
      ]}
    />
  );
}
