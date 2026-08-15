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
import { SlideBullets, SlideFooter, SlideFrame } from "./slide-frame";

const TOTAL = 26;

function PipelineInfographic() {
  const steps = [
    { label: "Register", sub: "GPS + photo" },
    { label: "Measure", sub: "DBH / height" },
    { label: "Monitor", sub: "Sat + SAR" },
    { label: "Quantify", sub: "90% CI CO₂e" },
    { label: "Comply", sub: "IN + global" },
    { label: "Prove", sub: "Signed bundle" },
  ];
  return (
    <div className="mt-4 flex flex-1 items-center">
      <div className="flex w-full items-stretch gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-1">
            <div className="deck-card flex flex-1 flex-col items-center justify-center py-3 text-center">
              <span className="text-[0.55rem] font-bold text-emerald-300">{String(i + 1).padStart(2, "0")}</span>
              <span className="mt-1 text-[0.7rem] font-semibold">{s.label}</span>
              <span className="text-[0.5rem] opacity-70">{s.sub}</span>
            </div>
            {i < steps.length - 1 ? (
              <svg className="h-3 w-3 shrink-0 text-emerald-500/60" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4 2l4 4-4 4V2z" />
              </svg>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureGrid() {
  const cols = [
    { icon: Globe2, title: "Web dashboard", sub: "Executives · compliance · verifiers" },
    { icon: MapPin, title: "Mobile field app", sub: "Offline-first · supervisors" },
    { icon: Zap, title: "API + PostGIS", sub: "Integration · automation" },
    { icon: Activity, title: "Celery workers", sub: "Scheduled sweeps · alerts" },
  ];
  return (
    <div className="mt-4 grid flex-1 grid-cols-2 gap-2">
      {cols.map(({ icon: Icon, title, sub }) => (
        <div key={title} className="deck-card flex flex-col justify-center gap-1 p-3">
          <Icon className="h-5 w-5 text-emerald-400" />
          <span className="text-[0.75rem] font-semibold">{title}</span>
          <span className="text-[0.55rem] opacity-75">{sub}</span>
        </div>
      ))}
    </div>
  );
}

function IntegrityGauge({ score = 87 }: { score?: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
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
      <span className="text-[0.55rem] font-semibold uppercase tracking-wider text-emerald-300">
        Forest Integrity
      </span>
    </div>
  );
}

function CarbonRangeViz() {
  return (
    <div className="deck-card mt-3 p-3">
      <div className="mb-2 flex justify-between text-[0.55rem] font-medium">
        <span>Lower 90%</span>
        <span className="text-amber-300">Estimate</span>
        <span>Upper 90%</span>
      </div>
      <div className="relative h-3 rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-gradient-to-r from-emerald-700 via-emerald-400 to-emerald-700" />
        <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white" />
      </div>
      <div className="mt-2 flex justify-between text-[0.65rem] font-semibold">
        <span>1.2 t</span>
        <span className="text-emerald-300">1.8 t CO₂e</span>
        <span>2.4 t</span>
      </div>
      <div className="mt-2 flex gap-2 text-[0.5rem]">
        <span className="deck-pill">−18% Verra buffer</span>
        <span className="deck-pill">Mortality adjusted</span>
      </div>
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
    <table className="deck-table mt-3">
      <thead>
        <tr>
          <th>Capability</th>
          <th className="text-center">Spreadsheets</th>
          <th className="text-center">Point tools</th>
          <th className="text-center text-emerald-400">Aranyix</th>
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
              <span className="text-[0.55rem] text-amber-400">Partial</span>
            </td>
            <td className="text-center">
              <Check className="mx-auto h-3.5 w-3.5 text-emerald-400" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

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

export const DECK_SLIDE_COUNT = 26;

export function DeckSlides({ onlySlide }: { onlySlide?: number }) {
  const slides = renderAllSlides();
  if (onlySlide != null) {
    return <>{slides[onlySlide - 1]}</>;
  }
  return <>{slides}</>;
}

function renderAllSlides() {
  const TOTAL = DECK_SLIDE_COUNT;
  return [
      <SlideFrame slideNum={1} variant="dark">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative flex flex-1 flex-col justify-center">
          <div className="deck-eyebrow text-emerald-300/90">Bring Your Own Tree · ClimateTech MRV</div>
          <h1 className="deck-title mt-3 max-w-[85%]">
            Aranyix
            <span className="block text-[0.55em] font-normal text-emerald-100/80">
              Intelligence for a Thriving Planet
            </span>
          </h1>
          <p className="deck-subtitle mt-4 max-w-[70%] text-emerald-50/75">
            Audit-ready MRV for plantation, carbon, biodiversity and compliance
          </p>
          <p className="mt-6 text-[clamp(0.8rem,1.4vw,1.1rem)] font-medium text-lime-300">
            One platform. Every tree. Every standard — Indian and international.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["MoEFCC", "Verra", "ICVCM", "SEBI BRSR", "TNFD", "DPDP"].map((t) => (
              <span key={t} className="deck-pill">
                {t}
              </span>
            ))}
          </div>
        </div>
        <SlideFooter slideNum={1} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={2} variant="light">
        <div className="deck-eyebrow text-emerald-800">The challenge</div>
        <h2 className="deck-title mt-1 text-stone-900">Plantation claims collapse under audit</h2>
        <div className="mt-3 grid flex-1 grid-cols-2 gap-3">
          <div className="rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 p-3">
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-red-700">Today</p>
            <SlideBullets
              items={[
                "Spreadsheets + WhatsApp photos",
                "Single-point carbon guesses",
                "Manual compliance packs",
                "One-off consultant satellite reports",
                "No tamper-evident trail",
              ]}
            />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-emerald-800">With Aranyix</p>
            <SlideBullets
              items={[
                "GPS-verified per-tree registry",
                "90% confidence intervals on CO₂e",
                "Auto-filled checklists + exports",
                "Continuous Sentinel + SAR monitoring",
                "Hash-chained audit + signed bundles",
              ]}
            />
          </div>
        </div>
        <SlideFooter slideNum={2} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={3} variant="dark">
        <div className="deck-eyebrow text-emerald-300">End-to-end MRV</div>
        <h2 className="deck-title mt-1">From geotagged sapling to signed evidence bundle</h2>
        <PipelineInfographic />
        <p className="mt-3 text-center text-[0.6rem] text-emerald-200/70">
          Each step writes to a hash-chained audit log — verifiable, tamper-evident, export-ready
        </p>
        <SlideFooter slideNum={3} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={4} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Platform</div>
        <h2 className="deck-title mt-1">Four surfaces, one source of truth</h2>
        <ArchitectureGrid />
        <p className="mt-2 text-center text-[0.55rem] text-emerald-200/60">
          PostGIS geospatial core · S3-compatible media · Role-based access control
        </p>
        <SlideFooter slideNum={4} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={5} variant="light">
        <div className="deck-eyebrow text-emerald-800">Field operations</div>
        <h2 className="deck-title mt-1 text-stone-900">Field data that survives an audit</h2>
        <div className="mt-3 grid flex-1 grid-cols-[1.2fr_1fr] gap-3">
          <SlideBullets
            items={[
              "GPS-tagged registration with photos and species",
              "Append-only DBH / height / canopy measurements",
              "Method + instrument captured per reading",
              "Survival surveys: alive, dead, removed, stressed",
              "Offline mobile queues — auto-sync on reconnect",
              "Work-area polygons as spatial unit of record",
            ]}
          />
          <div className="deck-card flex flex-col gap-2 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-100/80 p-2">
              <TreePine className="h-4 w-4 text-emerald-700" />
              <div>
                <p className="text-[0.65rem] font-semibold">BYOT-TREE-00421</p>
                <p className="text-[0.5rem] text-stone-600">Neem · 28.6139°N · tape DBH 24cm</p>
              </div>
            </div>
            <div className="flex-1 rounded-lg bg-gradient-to-br from-emerald-200/40 to-sky-100/40 p-2">
              <div className="flex h-full flex-col items-center justify-center gap-1">
                <MapPin className="h-8 w-8 text-emerald-600/60" />
                <span className="text-[0.5rem] font-medium text-stone-600">Work area polygon · 12.4 ha</span>
              </div>
            </div>
          </div>
        </div>
        <SlideFooter slideNum={5} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={6} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Automation</div>
        <h2 className="deck-title mt-1">Monitoring is scheduled, not requested</h2>
        <div className="mt-3 grid flex-1 grid-cols-3 gap-2">
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
              <span className="text-[0.65rem] font-semibold">{label}</span>
              <span className="text-[0.5rem] opacity-70">{sub}</span>
            </div>
          ))}
        </div>
        <SlideFooter slideNum={6} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={7} variant="light">
        <div className="deck-eyebrow text-emerald-800">Optical satellite</div>
        <h2 className="deck-title mt-1 text-stone-900">Sentinel-2 NDVI, from pixel to project KPI</h2>
        <div className="mt-3 grid flex-1 grid-cols-2 gap-3">
          <SlideBullets
            items={[
              "NDVI + EVI for trees (point) and work areas (polygon)",
              "Cloud cover + presence confirmation each scan",
              "Alert when NDVI drops >0.15 vs baseline",
              "NDVI preview chips per plantation",
              "Full time-series charts",
              "Copernicus Sentinel Hub · demo fallback",
            ]}
          />
          <div className="deck-card p-2">
            <svg viewBox="0 0 200 80" className="h-full w-full">
              <defs>
                <linearGradient id="ndvi" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#92400e" />
                  <stop offset="35%" stopColor="#ca8a04" />
                  <stop offset="70%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#14532d" />
                </linearGradient>
              </defs>
              <rect x="10" y="10" width="180" height="50" rx="4" fill="url(#ndvi)" opacity="0.85" />
              <polyline
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                points="20,45 50,40 80,35 110,38 140,30 170,28"
              />
              <text x="100" y="72" textAnchor="middle" fill="#57534e" fontSize="8">
                NDVI trend · last 12 months
              </text>
            </svg>
          </div>
        </div>
        <SlideFooter slideNum={7} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={8} variant="dark">
        <div className="deck-eyebrow text-emerald-300">SAR monitoring</div>
        <h2 className="deck-title mt-1">See through cloud and monsoon</h2>
        <div className="mt-3 grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="deck-card p-3 text-center opacity-60">
            <CloudRain className="mx-auto h-6 w-6 text-stone-400" />
            <p className="mt-2 text-[0.6rem] font-semibold">Optical (cloudy)</p>
            <p className="text-[0.5rem] opacity-70">No usable NDVI</p>
          </div>
          <IntegrityGauge score={87} />
          <div className="deck-card border-emerald-500/30 p-3 text-center">
            <Radar className="mx-auto h-6 w-6 text-emerald-400" />
            <p className="mt-2 text-[0.6rem] font-semibold">Sentinel-1 SAR</p>
            <p className="text-[0.5rem] opacity-70">Integrity score · Grade B+</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[0.5rem] text-emerald-200/55">
          L/S analytics are NISAR-inspired; live feed is Sentinel-1 C-band via GEE or Sentinel Hub
        </p>
        <SlideFooter slideNum={8} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={9} variant="light">
        <div className="deck-eyebrow text-emerald-800">Indian EO</div>
        <h2 className="deck-title mt-1 text-stone-900">ISRO Bhoonidhi & multi-source fusion</h2>
        <div className="mt-4 flex flex-1 items-center justify-center gap-2">
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
        <SlideFooter slideNum={9} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={10} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Satellite health AI</div>
        <h2 className="deck-title mt-1">NDVI decline, explained</h2>
        <div className="mt-3 grid flex-1 grid-cols-2 gap-3">
          <div className="deck-card p-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[0.55rem] font-bold text-amber-300">
                MODERATE RISK
              </span>
            </div>
            <p className="mt-2 text-[0.65rem] font-semibold">Pest stress detected — Sector B</p>
            <p className="mt-1 text-[0.55rem] opacity-80">
              NDVI heterogeneity ↑ 23% over 6 weeks. Recommend ground survey within 14 days.
            </p>
          </div>
          <SlideBullets
            items={[
              "Rule-based NDVI time-series analysis",
              "Pest, disease and stress classification",
              "Treatment recommendations per finding",
              "Optional AI narrative for field teams",
              "Triggers alerts + persists analysis record",
            ]}
          />
        </div>
        <SlideFooter slideNum={10} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={11} variant="light">
        <div className="deck-eyebrow text-emerald-800">Threat intelligence</div>
        <h2 className="deck-title mt-1 text-stone-900">Risk before damage</h2>
        <div className="mt-3 grid flex-1 grid-cols-3 gap-2">
          {[
            { label: "7-day forecast", val: "Open-Meteo", icon: CloudRain },
            { label: "Pest intel", val: "Sat + rain + bio", icon: Leaf },
            { label: "Locust corridors", val: "Seasonal watch", icon: MapPin },
          ].map(({ label, val, icon: Icon }) => (
            <div key={label} className="deck-card p-3 text-center">
              <Icon className="mx-auto h-5 w-5 text-sky-600" />
              <p className="mt-2 text-[0.65rem] font-semibold">{label}</p>
              <p className="text-[0.5rem] text-stone-500">{val}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.55rem] text-stone-600">
          Portfolio threat watch: composite risk score + early warnings + recommended actions per site
        </p>
        <SlideFooter slideNum={11} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={12} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Differentiator</div>
        <h2 className="deck-title mt-1">Prove the forest came back to life</h2>
        <div className="mt-3 grid flex-1 grid-cols-[1fr_1.2fr] gap-3">
          <div className="deck-card flex items-center justify-center p-2">
            <Bird className="h-12 w-12 text-lime-300/80" />
          </div>
          <SlideBullets
            items={[
              "BirdNET + multi-taxa species ID from field audio",
              "Shannon & Simpson diversity · Biodiversity Health Score",
              "IUCN Red List + GBIF regional fauna baselines",
              "NDVI ↔ bioacoustic correlation",
              "Darwin Core export for GBIF publishing",
            ]}
          />
        </div>
        <SlideFooter slideNum={12} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={13} variant="light">
        <div className="deck-eyebrow text-emerald-800">Carbon MRV</div>
        <h2 className="deck-title mt-1 text-stone-900">A range, not a marketing number</h2>
        <div className="mt-2 grid flex-1 grid-cols-2 gap-3">
          <SlideBullets
            items={[
              "IPCC AR6 · Verra VM0047 · Gold Standard LUF",
              "Monte Carlo 90% confidence intervals",
              "Verra deduction when uncertainty >15%",
              "Mortality-adjusted ex-ante credits",
              "NPRT dynamic buffer 10–30%",
              "Deadwood, litter, SOC pools",
            ]}
          />
          <CarbonRangeViz />
        </div>
        <SlideFooter slideNum={13} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={14} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Verra VM0047</div>
        <h2 className="deck-title mt-1">Baseline, additionality, leakage — structured</h2>
        <div className="mt-4 grid flex-1 grid-cols-4 gap-2">
          {["Baseline", "Additionality", "Leakage", "Carbon pools"].map((t) => (
            <div key={t} className="deck-card flex flex-col items-center justify-center p-3 text-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="mt-2 text-[0.65rem] font-semibold">{t}</span>
            </div>
          ))}
        </div>
        <SlideFooter slideNum={14} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={15} variant="light">
        <div className="deck-eyebrow text-emerald-800">Credit integrity</div>
        <h2 className="deck-title mt-1 text-stone-900">Registry-grade discipline before the registry</h2>
        <div className="mt-2 grid flex-1 grid-cols-2 gap-3">
          <SlideBullets
            items={[
              "Credit ledger: estimated → verified → issued",
              "Serial numbers with state + year",
              "Paris Art. 6 retirement metadata",
              "Exclusive claim registry — 409 on conflict",
              "MoEFCC Green Credit calculator",
            ]}
          />
          <div className="deck-card p-2 font-mono text-[0.5rem]">
            <p className="text-emerald-700">BYOT-2026-MH-00042</p>
            <p className="mt-1 text-stone-500">status: verified · buffer: 18%</p>
            <p className="mt-2 text-red-600">✕ Claim conflict: campa ↔ gim</p>
          </div>
        </div>
        <p className="text-[0.5rem] text-stone-500">Internal traceability — not external registry issuance</p>
        <SlideFooter slideNum={15} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={16} variant="dark" className="text-[0.95em]">
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
        <p className="mt-1 text-[0.5rem] text-emerald-200/60">+ SEBI BRSR P6 · India DPDP Act</p>
        <SlideFooter slideNum={16} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={17} variant="light" className="text-[0.92em]">
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
        <SlideFooter slideNum={17} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={18} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Compliance portal</div>
        <h2 className="deck-title mt-1">Twelve guided checklists that fill themselves in</h2>
        <div className="mt-3 grid flex-1 grid-cols-2 gap-3">
          <SlideBullets
            items={[
              "Scheme drives checklist + report profile",
              "Auto-signals from live platform data",
              "Violation tracking + deadline escalation",
              "Rule engine: spacing, species, density",
              "7 planting templates · convergence pairs",
            ]}
          />
          <div className="deck-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold">VM0047 checklist</span>
              <span className="text-[0.55rem] text-emerald-300">78%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-full w-[78%] rounded-full bg-emerald-500" />
            </div>
            <ul className="mt-3 space-y-1">
              {["Strata documented", "Measurements time-series", "Evidence export"].map((i) => (
                <li key={i} className="flex items-center gap-2 text-[0.55rem]">
                  <Check className="h-3 w-3 text-emerald-400" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <SlideFooter slideNum={18} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={19} variant="light">
        <div className="deck-eyebrow text-emerald-800">Trust layer</div>
        <h2 className="deck-title mt-1 text-stone-900">Tamper-evident by construction</h2>
        <div className="mt-3 flex flex-1 items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                <div className="h-8 w-16 rounded border border-emerald-300 bg-emerald-50 text-center text-[0.45rem] leading-8">
                  hash {n}
                </div>
              </div>
            ))}
          </div>
          <SlideBullets
            items={[
              "SHA-256 hash-chained audit log",
              "Daily root hash to object storage",
              "Ed25519 signed evidence bundles",
              "RFC 3161 TSA when configured",
              "Verifier-callable chain verify API",
            ]}
          />
        </div>
        <SlideFooter slideNum={19} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={20} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Verification</div>
        <h2 className="deck-title mt-1">Auditors attest — without edit rights</h2>
        <SlideBullets
          items={[
            "Verifier role: attest-only permissions",
            "Random or species-stratified tree sampling",
            "Cryptographic attestation hash per item",
            "PDF sample audit report export",
            "Stratified plot monitoring — census alternative",
            "Plot layout, visits, statistical extrapolation",
          ]}
        />
        <SlideFooter slideNum={20} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={21} variant="light">
        <div className="deck-eyebrow text-emerald-800">Reporting</div>
        <h2 className="deck-title mt-1 text-stone-900">One click from dashboard to disclosure</h2>
        <div className="mt-4 grid flex-1 grid-cols-4 gap-2">
          {["BRSR P6", "ISO 14064-2", "TNFD LEAP", "GHG Protocol", "Darwin Core", "Framework PDF", "STAC catalog", "GeoJSON"].map(
            (r) => (
              <div key={r} className="deck-card flex items-center justify-center p-2 text-center text-[0.6rem] font-semibold">
                {r}
              </div>
            ),
          )}
        </div>
        <SlideFooter slideNum={21} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={22} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Personas</div>
        <h2 className="deck-title mt-1">Purpose-built views for every stakeholder</h2>
        <div className="mt-4 grid flex-1 grid-cols-4 gap-2">
          {[
            { icon: Users, title: "Citizen", sub: "Tag · scan · stewardship" },
            { icon: MapPin, title: "Field worker", sub: "Offline · surveys" },
            { icon: FileCheck, title: "Compliance", sub: "Checklists · exports" },
            { icon: TrendingUp, title: "Executive", sub: "KPIs · integrity" },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="deck-card flex flex-col items-center p-3 text-center">
              <Icon className="h-6 w-6 text-emerald-400" />
              <span className="mt-2 text-[0.7rem] font-semibold">{title}</span>
              <span className="text-[0.5rem] opacity-70">{sub}</span>
            </div>
          ))}
        </div>
        <SlideFooter slideNum={22} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={23} variant="light">
        <div className="deck-eyebrow text-emerald-800">AI layer</div>
        <h2 className="deck-title mt-1 text-stone-900">AI where it adds evidence, not noise</h2>
        <SlideBullets
          items={[
            "Tree photo: species, health, disease, growth estimate",
            "Satellite health narrative in plain language",
            "Portfolio assistant grounded in live data",
            "Executive brief generation",
            "Metered scan quotas per tier",
            "Deterministic fallbacks without API keys",
          ]}
        />
        <SlideFooter slideNum={23} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={24} variant="dark">
        <div className="deck-eyebrow text-emerald-300">Enterprise</div>
        <h2 className="deck-title mt-1">Built for procurement review</h2>
        <div className="mt-4 grid flex-1 grid-cols-3 gap-2">
          {["DPDP Act", "Hindi i18n", "WCAG a11y", "PWA offline", "RBAC + orgs", "Webhooks + API"].map((b) => (
            <div key={b} className="deck-card flex items-center justify-center p-3 text-[0.65rem] font-semibold">
              <ShieldCheck className="mr-2 h-4 w-4 text-emerald-400" />
              {b}
            </div>
          ))}
        </div>
        <SlideFooter slideNum={24} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={25} variant="light">
        <div className="deck-eyebrow text-emerald-800">Competitive edge</div>
        <h2 className="deck-title mt-1 text-stone-900">The only platform that closes the loop</h2>
        <ComparisonTable />
        <SlideFooter slideNum={25} total={TOTAL} />
      </SlideFrame>,

      <SlideFrame slideNum={26} variant="dark">
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.15),transparent_60%)]" />
          <Leaf className="relative h-12 w-12 text-emerald-400" />
          <h2 className="deck-title relative mt-4">See your own plantation, verified</h2>
          <div className="relative mt-6 max-w-md space-y-2 text-left">
            {[
              "Pilot: register trees · satellite sweep · evidence bundle",
              "Compliance mapping workshop for your schemes",
              "Integration review for ESG + GIS systems",
            ].map((item) => (
              <p key={item} className="deck-bullet text-[0.75rem]">
                {item}
              </p>
            ))}
          </div>
          <p className="relative mt-8 text-[clamp(0.85rem,1.5vw,1.15rem)] font-medium text-lime-300">
            Evidence you can hand to a regulator, an auditor, or a buyer.
          </p>
          <p className="relative mt-4 text-[0.65rem] text-emerald-200/60">demo@byot.earth · aranyix.tech</p>
        </div>
        <SlideFooter slideNum={26} total={TOTAL} />
      </SlideFrame>,
  ];
}
