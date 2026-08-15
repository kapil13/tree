"use client";

import {
  Activity,
  Bird,
  Check,
  CheckCircle2,
  CloudRain,
  FileCheck,
  Globe2,
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
  Zap,
} from "lucide-react";
import {
  BrowserChrome,
  CoverSlide,
  FlowPipeline,
  MetricRibbon,
  PillRow,
  SlideSplit,
} from "./deck-primitives";
import {
  BioacousticMock,
  CarbonCreditsMock,
  CompliancePortalMock,
  ExecutiveDashboardMock,
  FieldOpsMock,
  SatelliteMonitoringMock,
} from "./portal-mocks";
import { SlideBullets, SlideFooter, SlideFrame } from "./slide-frame";

export const DECK_SLIDE_COUNT = 26;

const INDIAN_SCHEMES = [
  ["CAMPA", "MoEFCC", "Checklist · report · APO import"],
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
    <table className="deck-table mt-2">
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

function IntegrityGauge({ score = 87 }: { score?: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="90" height="90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="52" textAnchor="middle" fill="#f0fdf4" fontSize="18" fontWeight="700">
          {score}
        </text>
      </svg>
      <span className="text-[0.5rem] font-semibold uppercase tracking-wider text-emerald-300">
        Forest Integrity
      </span>
    </div>
  );
}

export function DeckSlides({ onlySlide }: { onlySlide?: number }) {
  const slides = renderAllSlides();
  if (onlySlide != null) {
    return <>{slides[onlySlide - 1]}</>;
  }
  return <>{slides}</>;
}

function renderAllSlides() {
  const T = DECK_SLIDE_COUNT;
  return [
    <CoverSlide key="s1" />,

    <SlideFrame key="s2" slideNum={2} variant="light">
      <SlideSplit
        eyebrow="The challenge"
        title="Plantation claims collapse under audit"
        copy="Spreadsheets, WhatsApp photos, and one-off consultant reports cannot survive regulator scrutiny — or buyer due diligence."
        variant="light"
      >
        <div className="grid h-full grid-cols-2 gap-2">
          <div className="rounded-lg border-2 border-dashed border-red-200 bg-gradient-to-br from-red-50 to-white p-3">
            <p className="text-[0.55rem] font-bold uppercase tracking-wider text-red-700">Today</p>
            <SlideBullets
              items={[
                "Fragmented field data",
                "Single-point carbon guesses",
                "Manual compliance packs",
                "No tamper-evident trail",
              ]}
            />
          </div>
          <div className="rounded-lg border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm">
            <p className="text-[0.55rem] font-bold uppercase tracking-wider text-emerald-800">With Aranyix</p>
            <SlideBullets
              items={[
                "GPS-verified per-tree registry",
                "90% CI on every CO₂e claim",
                "Auto-filled scheme checklists",
                "Hash-chained signed bundles",
              ]}
            />
          </div>
        </div>
      </SlideSplit>
      <SlideFooter slideNum={2} total={T} />
    </SlideFrame>,

    <SlideFrame key="s3" slideNum={3} variant="dark">
      <div className="deck-eyebrow text-emerald-300">End-to-end MRV</div>
      <h2 className="deck-title mt-1">From geotagged sapling to signed evidence bundle</h2>
      <FlowPipeline
        steps={[
          { label: "Register", sub: "GPS + photo", icon: <TreePine className="h-3.5 w-3.5" /> },
          { label: "Measure", sub: "DBH / height", icon: <Activity className="h-3.5 w-3.5" /> },
          { label: "Monitor", sub: "Sat + SAR", icon: <Satellite className="h-3.5 w-3.5" /> },
          { label: "Quantify", sub: "90% CI CO₂e", icon: <Leaf className="h-3.5 w-3.5" /> },
          { label: "Comply", sub: "IN + global", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
          { label: "Prove", sub: "Signed bundle", icon: <FileCheck className="h-3.5 w-3.5" /> },
        ]}
      />
      <MetricRibbon
        items={[
          { label: "Audit events", value: "12.4k", delta: "hash-chained", tone: "up" },
          { label: "Schemes", value: "9+", delta: "MoEFCC built-in", tone: "up" },
          { label: "Standards", value: "11", delta: "global mapped", tone: "neutral" },
          { label: "Evidence", value: "Ed25519", delta: "signed export", tone: "up" },
        ]}
      />
      <SlideFooter slideNum={3} total={T} />
    </SlideFrame>,

    <SlideFrame key="s4" slideNum={4} variant="dark">
      <SlideSplit
        eyebrow="Live platform"
        title="One portal. Field to boardroom."
        copy="The same Aranyix experience your teams sign into — web dashboard, mobile field app, API, and automated workers."
      >
        <BrowserChrome
          url="https://byot.earth/login"
          imageSrc="/presentation/screenshots/login-page.png"
          imageAlt="Aranyix sign-in — satellite MRV, tree health, biodiversity, AI insights"
          glow="emerald"
        />
      </SlideSplit>
      <PillRow items={["Satellite MRV", "Tree health", "Biodiversity", "AI insights", "Offline field"]} highlight={[0, 3]} />
      <SlideFooter slideNum={4} total={T} />
    </SlideFrame>,

    <SlideFrame key="s5" slideNum={5} variant="light">
      <SlideSplit
        eyebrow="Executive command center"
        title="Portfolio intelligence at a glance"
        copy="Carbon, canopy health, SAR integrity, alerts, and compliance — unified for decision-makers."
        variant="light"
        reverse
      >
        <BrowserChrome url="https://byot.earth/dashboard" glow="sky">
          <ExecutiveDashboardMock />
        </BrowserChrome>
      </SlideSplit>
      <SlideFooter slideNum={5} total={T} />
    </SlideFrame>,

    <SlideFrame key="s6" slideNum={6} variant="dark">
      <SlideSplit
        eyebrow="Field operations"
        title="Field data that survives an audit"
        copy="GPS-tagged registration, append-only measurements, survival surveys, and offline mobile sync."
        reverse
      >
        <FieldOpsMock />
      </SlideSplit>
      <SlideFooter slideNum={6} total={T} />
    </SlideFrame>,

    <SlideFrame key="s7" slideNum={7} variant="dark">
      <div className="deck-eyebrow text-emerald-300">Automation</div>
      <h2 className="deck-title mt-1">Monitoring is scheduled, not requested</h2>
      <div className="mt-2 grid flex-1 grid-cols-3 gap-2">
        {[
          { icon: Satellite, label: "Monthly optical sweep", sub: "Every work area + tree" },
          { icon: Radar, label: "Monthly SAR + weekly watch", sub: "At-risk re-scan" },
          { icon: Shield, label: "Daily health roundup", sub: "Stale data + violations" },
          { icon: FileCheck, label: "Compliance deadlines", sub: "Escalation alerts" },
          { icon: Activity, label: "Job-run audit log", sub: "Ops traceability" },
          { icon: Zap, label: "Health digest", sub: "Email / SMS delivery" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="deck-card flex flex-col gap-1 p-2">
            <Icon className="h-4 w-4 text-sky-400" />
            <span className="text-[0.62rem] font-semibold">{label}</span>
            <span className="text-[0.48rem] opacity-70">{sub}</span>
          </div>
        ))}
      </div>
      <SlideFooter slideNum={7} total={T} />
    </SlideFrame>,

    <SlideFrame key="s8" slideNum={8} variant="light">
      <SlideSplit
        eyebrow="Optical satellite"
        title="Sentinel-2 NDVI, from pixel to project KPI"
        copy="NDVI + EVI for trees and work areas. Alert when canopy drops >0.15 vs baseline."
        variant="light"
      >
        <BrowserChrome url="https://byot.earth/satellite" glow="emerald">
          <SatelliteMonitoringMock />
        </BrowserChrome>
      </SlideSplit>
      <SlideFooter slideNum={8} total={T} />
    </SlideFrame>,

    <SlideFrame key="s9" slideNum={9} variant="dark">
      <SlideSplit
        eyebrow="SAR monitoring"
        title="See through cloud and monsoon"
        copy="Sentinel-1 C-band integrity scoring when optical is unusable — NISAR-inspired L/S analytics."
      >
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="deck-card p-3 text-center opacity-60">
            <CloudRain className="mx-auto h-6 w-6 text-stone-400" />
            <p className="mt-2 text-[0.58rem] font-semibold">Optical (cloudy)</p>
            <p className="text-[0.48rem] opacity-70">No usable NDVI</p>
          </div>
          <IntegrityGauge score={87} />
          <div className="deck-card border-emerald-500/30 p-3 text-center">
            <Radar className="mx-auto h-6 w-6 text-emerald-400" />
            <p className="mt-2 text-[0.58rem] font-semibold">Sentinel-1 SAR</p>
            <p className="text-[0.48rem] opacity-70">Grade B+ integrity</p>
          </div>
        </div>
      </SlideSplit>
      <SlideFooter slideNum={9} total={T} />
    </SlideFrame>,

    <SlideFrame key="s10" slideNum={10} variant="light">
      <div className="deck-eyebrow text-emerald-800">Indian EO</div>
      <h2 className="deck-title mt-1 text-stone-900">ISRO Bhoonidhi & multi-source fusion</h2>
      <div className="mt-3 flex flex-1 items-center justify-center gap-2">
        {["Sentinel-2", "Bhoonidhi", "Sentinel-1"].map((src, i) => (
          <div key={src} className="flex items-center gap-2">
            <div className="deck-card w-24 p-3 text-center">
              <Satellite className="mx-auto h-5 w-5 text-emerald-600" />
              <p className="mt-1 text-[0.6rem] font-semibold">{src}</p>
            </div>
            {i < 2 ? <span className="text-emerald-600">→</span> : null}
          </div>
        ))}
        <div className="deck-card ml-2 border-emerald-400 bg-emerald-50 p-3 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-emerald-700" />
          <p className="mt-1 text-[0.6rem] font-bold">Fused score</p>
        </div>
      </div>
      <SlideFooter slideNum={10} total={T} />
    </SlideFrame>,

    <SlideFrame key="s11" slideNum={11} variant="dark">
      <SlideSplit
        eyebrow="Satellite health AI"
        title="NDVI decline, explained in plain language"
        copy="Rule-based time-series analysis classifies pest, disease, and stress — with treatment recommendations."
      >
        <div className="deck-card w-full p-3">
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[0.5rem] font-bold text-amber-300">
            MODERATE RISK
          </span>
          <p className="mt-2 text-[0.62rem] font-semibold">Pest stress detected — Sector B</p>
          <p className="mt-1 text-[0.52rem] opacity-80">
            NDVI heterogeneity ↑ 23% over 6 weeks. Recommend ground survey within 14 days.
          </p>
          <div className="mt-3 h-12 rounded bg-gradient-to-r from-amber-900/30 via-emerald-900/20 to-emerald-900/30" />
        </div>
      </SlideSplit>
      <SlideFooter slideNum={11} total={T} />
    </SlideFrame>,

    <SlideFrame key="s12" slideNum={12} variant="light">
      <div className="deck-eyebrow text-emerald-800">Threat intelligence</div>
      <h2 className="deck-title mt-1 text-stone-900">Risk before damage</h2>
      <div className="mt-2 grid flex-1 grid-cols-3 gap-2">
        {[
          { label: "7-day forecast", val: "Open-Meteo", icon: CloudRain },
          { label: "Pest intel", val: "Sat + rain + bio", icon: Leaf },
          { label: "Locust corridors", val: "Seasonal watch", icon: MapPin },
        ].map(({ label, val, icon: Icon }) => (
          <div key={label} className="deck-card p-3 text-center">
            <Icon className="mx-auto h-5 w-5 text-sky-600" />
            <p className="mt-2 text-[0.62rem] font-semibold">{label}</p>
            <p className="text-[0.48rem] text-stone-500">{val}</p>
          </div>
        ))}
      </div>
      <SlideFooter slideNum={12} total={T} />
    </SlideFrame>,

    <SlideFrame key="s13" slideNum={13} variant="dark">
      <SlideSplit
        eyebrow="Differentiator"
        title="Prove the forest came back to life"
        copy="BirdNET + multi-taxa audio, Shannon diversity, IUCN baselines, and Darwin Core export."
        reverse
      >
        <BioacousticMock />
      </SlideSplit>
      <SlideFooter slideNum={13} total={T} />
    </SlideFrame>,

    <SlideFrame key="s14" slideNum={14} variant="light">
      <SlideSplit
        eyebrow="Carbon MRV"
        title="A range, not a marketing number"
        copy="IPCC AR6 · VM0047 · Gold Standard LUF with Monte Carlo 90% confidence intervals."
        variant="light"
      >
        <CarbonCreditsMock />
      </SlideSplit>
      <SlideFooter slideNum={14} total={T} />
    </SlideFrame>,

    <SlideFrame key="s15" slideNum={15} variant="dark">
      <div className="deck-eyebrow text-emerald-300">Verra VM0047</div>
      <h2 className="deck-title mt-1">Baseline, additionality, leakage — structured</h2>
      <div className="mt-3 grid flex-1 grid-cols-4 gap-2">
        {["Baseline", "Additionality", "Leakage", "Carbon pools"].map((t) => (
          <div key={t} className="deck-card flex flex-col items-center justify-center p-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="mt-2 text-[0.62rem] font-semibold">{t}</span>
          </div>
        ))}
      </div>
      <SlideFooter slideNum={15} total={T} />
    </SlideFrame>,

    <SlideFrame key="s16" slideNum={16} variant="light">
      <SlideSplit
        eyebrow="Credit integrity"
        title="Registry-grade discipline before the registry"
        copy="Credit ledger, serial numbers, Paris Art. 6 retirement metadata, exclusive claim registry."
        variant="light"
        reverse
      >
        <div className="deck-card w-full p-3 font-mono text-[0.52rem]">
          <p className="text-emerald-700">BYOT-2026-MH-00042</p>
          <p className="mt-1 text-stone-500">status: verified · buffer: 18%</p>
          <p className="mt-2 text-red-600">✕ Claim conflict: campa ↔ gim</p>
          <div className="mt-3 h-16 rounded bg-gradient-to-r from-emerald-100 to-sky-50" />
        </div>
      </SlideSplit>
      <SlideFooter slideNum={16} total={T} />
    </SlideFrame>,

    <SlideFrame key="s17" slideNum={17} variant="dark" className="text-[0.92em]">
      <div className="deck-eyebrow text-emerald-300">National compliance</div>
      <h2 className="deck-title mt-1">Nine central government schemes, built in</h2>
      <table className="deck-table mt-2">
        <thead>
          <tr>
            <th>Scheme</th>
            <th>Ministry</th>
            <th>Platform</th>
          </tr>
        </thead>
        <tbody>
          {INDIAN_SCHEMES.map(([a, b, c]) => (
            <tr key={a}>
              <td className="font-medium">{a}</td>
              <td>{b}</td>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[0.48rem] text-emerald-200/60">+ SEBI BRSR P6 · India DPDP Act</p>
      <SlideFooter slideNum={17} total={T} />
    </SlideFrame>,

    <SlideFrame key="s18" slideNum={18} variant="light" className="text-[0.9em]">
      <div className="deck-eyebrow text-emerald-800">Global standards</div>
      <h2 className="deck-title mt-1 text-stone-900">International standards, same evidence base</h2>
      <table className="deck-table mt-2">
        <thead>
          <tr>
            <th>Standard</th>
            <th>Body</th>
            <th>Capability</th>
          </tr>
        </thead>
        <tbody>
          {INTL_STANDARDS.map(([a, b, c]) => (
            <tr key={a}>
              <td className="font-medium">{a}</td>
              <td>{b}</td>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SlideFooter slideNum={18} total={T} />
    </SlideFrame>,

    <SlideFrame key="s19" slideNum={19} variant="dark">
      <SlideSplit
        eyebrow="Compliance portal"
        title="Twelve guided checklists that fill themselves in"
        copy="Scheme drives checklist + report profile. Auto-signals from live platform data."
      >
        <BrowserChrome url="https://byot.earth/reports" glow="emerald">
          <CompliancePortalMock />
        </BrowserChrome>
      </SlideSplit>
      <SlideFooter slideNum={19} total={T} />
    </SlideFrame>,

    <SlideFrame key="s20" slideNum={20} variant="light">
      <SlideSplit
        eyebrow="Trust layer"
        title="Tamper-evident by construction"
        copy="SHA-256 hash-chained audit log, daily root hash, Ed25519 signed bundles, RFC 3161 TSA."
        variant="light"
      >
        <div className="flex w-full items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                <div className="h-7 w-14 rounded border border-emerald-300 bg-emerald-50 text-center text-[0.42rem] leading-7">
                  hash {n}
                </div>
              </div>
            ))}
          </div>
          <div className="deck-card flex-1 p-3 text-[0.52rem]">
            <p className="font-semibold text-emerald-800">Verifier-callable chain verify API</p>
            <p className="mt-1 text-stone-500">Daily anchor → object storage · bundle signature valid</p>
          </div>
        </div>
      </SlideSplit>
      <SlideFooter slideNum={20} total={T} />
    </SlideFrame>,

    <SlideFrame key="s21" slideNum={21} variant="dark">
      <div className="deck-eyebrow text-emerald-300">Verification</div>
      <h2 className="deck-title mt-1">Auditors attest — without edit rights</h2>
      <SlideBullets
        items={[
          "Verifier role: attest-only permissions",
          "Random or species-stratified tree sampling",
          "Cryptographic attestation hash per item",
          "PDF sample audit report export",
          "Stratified plot monitoring — census alternative",
        ]}
      />
      <SlideFooter slideNum={21} total={T} />
    </SlideFrame>,

    <SlideFrame key="s22" slideNum={22} variant="light">
      <div className="deck-eyebrow text-emerald-800">Reporting</div>
      <h2 className="deck-title mt-1 text-stone-900">One click from dashboard to disclosure</h2>
      <div className="mt-3 grid flex-1 grid-cols-4 gap-2">
        {["BRSR P6", "ISO 14064-2", "TNFD LEAP", "GHG Protocol", "Darwin Core", "Framework PDF", "STAC catalog", "GeoJSON"].map(
          (r) => (
            <div key={r} className="deck-card flex items-center justify-center p-2 text-center text-[0.58rem] font-semibold">
              {r}
            </div>
          ),
        )}
      </div>
      <SlideFooter slideNum={22} total={T} />
    </SlideFrame>,

    <SlideFrame key="s23" slideNum={23} variant="dark">
      <div className="deck-eyebrow text-emerald-300">Personas</div>
      <h2 className="deck-title mt-1">Purpose-built views for every stakeholder</h2>
      <div className="mt-3 grid flex-1 grid-cols-4 gap-2">
        {[
          { icon: Users, title: "Citizen", sub: "Tag · scan · stewardship" },
          { icon: MapPin, title: "Field worker", sub: "Offline · surveys" },
          { icon: FileCheck, title: "Compliance", sub: "Checklists · exports" },
          { icon: TrendingUp, title: "Executive", sub: "KPIs · integrity" },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="deck-card flex flex-col items-center p-3 text-center">
            <Icon className="h-6 w-6 text-emerald-400" />
            <span className="mt-2 text-[0.68rem] font-semibold">{title}</span>
            <span className="text-[0.48rem] opacity-70">{sub}</span>
          </div>
        ))}
      </div>
      <SlideFooter slideNum={23} total={T} />
    </SlideFrame>,

    <SlideFrame key="s24" slideNum={24} variant="light">
      <SlideSplit
        eyebrow="Enterprise ready"
        title="Built for procurement review"
        copy="DPDP Act, Hindi i18n, WCAG a11y, PWA offline, RBAC, webhooks + API."
        variant="light"
      >
        <div className="grid grid-cols-2 gap-2">
          {["DPDP Act", "Hindi i18n", "WCAG a11y", "PWA offline", "RBAC + orgs", "Webhooks + API"].map((b) => (
            <div key={b} className="deck-card flex items-center p-2.5 text-[0.58rem] font-semibold">
              <ShieldCheck className="mr-2 h-4 w-4 shrink-0 text-emerald-600" />
              {b}
            </div>
          ))}
        </div>
      </SlideSplit>
      <SlideFooter slideNum={24} total={T} />
    </SlideFrame>,

    <SlideFrame key="s25" slideNum={25} variant="light">
      <div className="deck-eyebrow text-emerald-800">Competitive edge</div>
      <h2 className="deck-title mt-1 text-stone-900">The only platform that closes the loop</h2>
      <ComparisonTable />
      <SlideFooter slideNum={25} total={T} />
    </SlideFrame>,

    <SlideFrame key="s26" slideNum={26} variant="dark">
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.18),transparent_60%)]" />
        <Leaf className="relative h-10 w-10 text-emerald-400" />
        <h2 className="deck-title relative mt-3">See your own plantation, verified</h2>
        <div className="relative mt-5 max-w-md space-y-2 text-left">
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
        <p className="relative mt-6 text-[clamp(0.8rem,1.4vw,1.05rem)] font-medium text-lime-300">
          Evidence you can hand to a regulator, an auditor, or a buyer.
        </p>
        <p className="relative mt-3 text-[0.58rem] text-emerald-200/60">demo@byot.earth · aranyix.tech</p>
      </div>
      <SlideFooter slideNum={26} total={T} />
    </SlideFrame>,
  ];
}
