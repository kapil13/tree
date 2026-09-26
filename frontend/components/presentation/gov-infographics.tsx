"use client";

import {
  Activity,
  Check,
  FileCheck,
  Globe,
  Leaf,
  MapPin,
  Radar,
  Satellite,
  Shield,
  ShieldCheck,
  TreePine,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

/** SVG & React infographics for government-grade slides */

export function NationalMrvContext() {
  const items = [
    { label: "CAMPA", sub: "Compensatory afforestation MRV", icon: TreePine },
    { label: "Green India Mission", sub: "Landscape restoration", icon: Leaf },
    { label: "Green Credit Programme", sub: "2023 rules · MoEFCC", icon: Shield },
    { label: "Paris Agreement", sub: "NDC · Art. 6 traceability", icon: Globe },
    { label: "SEBI BRSR", sub: "Principle 6 disclosure", icon: FileCheck },
    { label: "DPDP Act 2023", sub: "Consent · data residency", icon: ShieldCheck },
  ];
  return (
    <div className="ppt-infographic ppt-infographic--grid-3">
      {items.map(({ label, sub, icon: Icon }) => (
        <div key={label} className="ppt-info-card ppt-info-card--icon">
          <span className="ppt-info-card-icon">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className="ppt-info-card-title">{label}</p>
          <p className="ppt-info-card-sub">{sub}</p>
        </div>
      ))}
    </div>
  );
}

export function AgendaRoadmap({
  items,
}: {
  items: { num: string; title: string; sub: string; icon: ReactNode }[];
}) {
  return (
    <div className="ppt-agenda-roadmap">
      <svg className="ppt-agenda-roadmap-path" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden>
        <path d="M40 20 H760" stroke="#bbf7d0" strokeWidth="3" strokeDasharray="8 6" />
        <path d="M40 20 H760" stroke="#15803d" strokeWidth="2" opacity="0.35" />
      </svg>
      <div className="ppt-agenda-roadmap-grid">
        {items.map((item) => (
          <div key={item.num} className="ppt-agenda-roadmap-node">
            <div className="ppt-agenda-roadmap-icon">{item.icon}</div>
            <span className="ppt-agenda-roadmap-num">{item.num}</span>
            <p className="ppt-agenda-roadmap-title">{item.title}</p>
            <p className="ppt-agenda-roadmap-sub">{item.sub}</p>
          </div>
        ))}
      </div>
      <div className="ppt-agenda-roadmap-footer">
        <span className="ppt-agenda-roadmap-chip">Field GPS</span>
        <span className="ppt-agenda-roadmap-arrow">→</span>
        <span className="ppt-agenda-roadmap-chip">Satellite MRV</span>
        <span className="ppt-agenda-roadmap-arrow">→</span>
        <span className="ppt-agenda-roadmap-chip">Carbon 90% CI</span>
        <span className="ppt-agenda-roadmap-arrow">→</span>
        <span className="ppt-agenda-roadmap-chip ppt-agenda-roadmap-chip--accent">Signed evidence</span>
      </div>
    </div>
  );
}

export function TransformationInfographic() {
  const gaps = [
    { label: "Fragmented records", icon: "📋" },
    { label: "No remote MRV", icon: "☁" },
    { label: "Carbon guesses", icon: "?" },
    { label: "Manual compliance", icon: "📁" },
  ];
  const wins = [
    { label: "Per-tree GPS registry", icon: MapPin },
    { label: "Sentinel + SAR fusion", icon: Satellite },
    { label: "Monte Carlo 90% CI", icon: Activity },
    { label: "Ed25519 evidence bundle", icon: ShieldCheck },
  ];
  return (
    <div className="ppt-transform">
      <div className="ppt-transform-col ppt-transform-col--before">
        <p className="ppt-transform-heading">Today</p>
        {gaps.map(({ label, icon }) => (
          <div key={label} className="ppt-transform-row ppt-transform-row--bad">
            <span className="ppt-transform-emoji">{icon}</span>
            <X className="h-3 w-3 shrink-0 text-red-500" />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="ppt-transform-bridge">
        <div className="ppt-transform-bridge-line" />
        <div className="ppt-transform-bridge-badge">ARANYIX</div>
        <div className="ppt-transform-bridge-line" />
      </div>
      <div className="ppt-transform-col ppt-transform-col--after">
        <p className="ppt-transform-heading">Audit-ready MRV</p>
        {wins.map(({ label, icon: Icon }) => (
          <div key={label} className="ppt-transform-row ppt-transform-row--good">
            <span className="ppt-transform-icon">
              <Icon className="h-3 w-3" />
            </span>
            <Check className="h-3 w-3 shrink-0 text-emerald-600" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProblemSolutionDiagram() {
  return <TransformationInfographic />;
}

export function PlatformArchitectureDiagram() {
  const layers = [
    { label: "Presentation", items: "Web dashboard · Mobile field app · Executive views" },
    { label: "MRV services", items: "Carbon · Compliance · Satellite · Bioacoustic · Alerts" },
    { label: "Evidence core", items: "PostGIS · Audit chain · Media · Credit ledger" },
    { label: "Integration", items: "API · Webhooks · STAC · GeoJSON · BRSR export" },
    { label: "Data sources", items: "Sentinel-2 · Sentinel-1 · Bhoonidhi · Open-Meteo · Field GPS" },
  ];
  return (
    <svg viewBox="0 0 480 280" className="ppt-svg w-full" role="img" aria-label="Platform architecture">
      {layers.map(({ label, items }, i) => (
        <g key={label}>
          <rect x="10" y={20 + i * 52} width="460" height="44" rx="6" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
          <rect x="10" y={20 + i * 52} width="100" height="44" rx="6" fill="#15803d" />
          <text x="60" y={20 + i * 52 + 26} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">
            {label}
          </text>
          <text x="120" y={20 + i * 52 + 26} fill="#1c1917" fontSize="9">
            {items}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MrvPipelineDiagram() {
  const steps = [
    { label: "Register", sub: "GPS + photo", icon: TreePine },
    { label: "Measure", sub: "DBH / height", icon: Activity },
    { label: "Monitor", sub: "Sat + SAR", icon: Satellite },
    { label: "Quantify", sub: "90% CI CO₂e", icon: Leaf },
    { label: "Comply", sub: "9 schemes", icon: ShieldCheck },
    { label: "Prove", sub: "Signed bundle", icon: FileCheck },
  ];
  return (
    <div className="ppt-pipeline-rich">
      {steps.map(({ label, sub, icon: Icon }, i) => (
        <div key={label} className="ppt-pipeline-rich-step">
          <span className="ppt-pipeline-rich-num">{String(i + 1).padStart(2, "0")}</span>
          <span className="ppt-pipeline-rich-icon">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="ppt-pipeline-rich-label">{label}</span>
          <span className="ppt-pipeline-rich-sub">{sub}</span>
          {i < steps.length - 1 ? <span className="ppt-pipeline-rich-arrow" aria-hidden /> : null}
        </div>
      ))}
    </div>
  );
}

export function PipelineEvidenceStrip() {
  return (
    <div className="ppt-evidence-strip">
      <div className="ppt-evidence-strip-item">
        <span className="ppt-evidence-strip-val">12.4k+</span>
        <span className="ppt-evidence-strip-lbl">Audit events</span>
      </div>
      <div className="ppt-evidence-strip-divider" />
      <div className="ppt-evidence-strip-item">
        <span className="ppt-evidence-strip-val">Hash chain</span>
        <span className="ppt-evidence-strip-lbl">SHA-256 linked</span>
      </div>
      <div className="ppt-evidence-strip-divider" />
      <div className="ppt-evidence-strip-item">
        <span className="ppt-evidence-strip-val">Ed25519</span>
        <span className="ppt-evidence-strip-lbl">Signed export</span>
      </div>
      <div className="ppt-evidence-strip-divider" />
      <div className="ppt-evidence-strip-item ppt-evidence-strip-item--accent">
        <span className="ppt-evidence-strip-val">Evidence bundle</span>
        <span className="ppt-evidence-strip-lbl">PDF + JSON + GeoJSON</span>
      </div>
    </div>
  );
}

export function FieldWorkflowDiagram() {
  const steps = [
    { label: "Capture", detail: "Mobile GPS + photo" },
    { label: "Validate", detail: "Supervisor queue" },
    { label: "Store", detail: "Append-only log" },
    { label: "Sync", detail: "Offline → cloud" },
    { label: "Attest", detail: "Verifier sample" },
  ];
  return (
    <div className="ppt-field-flow">
      {steps.map(({ label, detail }, i) => (
        <div key={label} className="ppt-field-flow-step">
          <div className="ppt-field-flow-marker">{i + 1}</div>
          <div>
            <p className="ppt-field-flow-label">{label}</p>
            <p className="ppt-field-flow-detail">{detail}</p>
          </div>
          {i < steps.length - 1 ? <div className="ppt-field-flow-connector" aria-hidden /> : null}
        </div>
      ))}
    </div>
  );
}

export function NdviTrendChart() {
  return (
    <svg viewBox="0 0 360 160" className="ppt-svg w-full" role="img" aria-label="NDVI trend chart">
      <defs>
        <linearGradient id="ndviArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <text x="8" y="14" fill="#57534e" fontSize="9" fontWeight="600">
        NDVI canopy health — 12-month trend (work area)
      </text>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="40" y1={30 + i * 30} x2="350" y2={30 + i * 30} stroke="#e7e5e4" strokeWidth="0.5" />
      ))}
      <path
        d="M40 110 L70 100 L100 95 L130 88 L160 92 L190 78 L220 72 L250 68 L280 75 L310 70 L340 65 L340 130 L40 130 Z"
        fill="url(#ndviArea)"
      />
      <polyline
        fill="none"
        stroke="#15803d"
        strokeWidth="2.5"
        points="40,110 70,100 100,95 130,88 160,92 190,78 220,72 250,68 280,75 310,70 340,65"
      />
      <line x1="190" y1="30" x2="190" y2="130" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
      <text x="195" y="42" fill="#b45309" fontSize="8">
        Alert threshold
      </text>
      <rect x="280" y="38" width="62" height="28" rx="4" fill="#ecfdf5" stroke="#bbf7d0" />
      <text x="311" y="52" textAnchor="middle" fill="#15803d" fontSize="9" fontWeight="700">
        NDVI 0.72
      </text>
      <text x="311" y="62" textAnchor="middle" fill="#78716c" fontSize="7">
        Healthy canopy
      </text>
      <text x="40" y="148" fill="#78716c" fontSize="8">
        Jan
      </text>
      <text x="340" y="148" fill="#78716c" fontSize="8" textAnchor="end">
        Dec
      </text>
    </svg>
  );
}

export function EoFusionDiagram() {
  return (
    <div className="ppt-fusion-flow">
      <div className="ppt-fusion-sources">
        {[
          { label: "Sentinel-2", sub: "Optical NDVI", color: "#22c55e" },
          { label: "Bhoonidhi", sub: "ISRO catalog", color: "#0ea5e9" },
          { label: "Sentinel-1", sub: "SAR C-band", color: "#8b5cf6" },
        ].map(({ label, sub, color }) => (
          <div key={label} className="ppt-fusion-source" style={{ borderTopColor: color }}>
            <Satellite className="h-3 w-3" style={{ color }} />
            <p className="ppt-fusion-source-label">{label}</p>
            <p className="ppt-fusion-source-sub">{sub}</p>
          </div>
        ))}
      </div>
      <div className="ppt-fusion-connector">
        <div className="ppt-fusion-connector-line" />
        <div className="ppt-fusion-connector-badge">FUSION ENGINE</div>
        <div className="ppt-fusion-connector-line" />
      </div>
      <div className="ppt-fusion-output">
        <div className="ppt-fusion-gauge">
          <svg viewBox="0 0 120 70" className="ppt-fusion-gauge-svg">
            <path d="M15 60 A45 45 0 0 1 105 60" fill="none" stroke="#e7e5e4" strokeWidth="8" strokeLinecap="round" />
            <path d="M15 60 A45 45 0 0 1 95 35" fill="none" stroke="#15803d" strokeWidth="8" strokeLinecap="round" />
            <text x="60" y="52" textAnchor="middle" fill="#15803d" fontSize="18" fontWeight="700">
              87
            </text>
            <text x="60" y="64" textAnchor="middle" fill="#78716c" fontSize="7">
              Canopy score
            </text>
          </svg>
        </div>
        <div className="ppt-fusion-output-meta">
          <p className="ppt-fusion-output-title">Fused canopy integrity</p>
          <p className="ppt-fusion-output-sub">Grade B+ · Monsoon-resilient · All-weather KPI</p>
          <div className="ppt-fusion-output-tags">
            <span>Optical</span>
            <span>SAR</span>
            <span>ISRO</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SarOpticalCompare() {
  return (
    <div className="ppt-compare-mini">
      <div className="ppt-compare-mini-panel ppt-compare-mini-panel--bad">
        <p className="ppt-compare-mini-title">Optical (monsoon)</p>
        <p className="ppt-compare-mini-sub">Cloud cover · no NDVI</p>
        <div className="ppt-compare-mini-icon">☁</div>
        <p className="ppt-compare-mini-stat">0% usable</p>
      </div>
      <div className="ppt-compare-mini-arrow">+</div>
      <div className="ppt-compare-mini-panel ppt-compare-mini-panel--good">
        <p className="ppt-compare-mini-title">Sentinel-1 SAR</p>
        <p className="ppt-compare-mini-sub">Penetrates cloud · C-band</p>
        <Radar className="mx-auto mt-1 h-5 w-5 text-emerald-600" />
        <p className="ppt-compare-mini-stat">100% coverage</p>
      </div>
    </div>
  );
}

export function CarbonConfidenceDiagram() {
  return (
    <svg viewBox="0 0 400 140" className="ppt-svg w-full" role="img" aria-label="Carbon confidence interval">
      <text x="8" y="16" fill="#57534e" fontSize="9" fontWeight="600">
        Monte Carlo 90% confidence interval — t CO₂e per tree (VM0047)
      </text>
      <rect x="40" y="50" width="320" height="12" rx="6" fill="#e7e5e4" />
      <rect x="80" y="50" width="200" height="12" rx="6" fill="url(#carbonGrad)" />
      <line x1="180" y1="42" x2="180" y2="70" stroke="#1c1917" strokeWidth="2" />
      <text x="60" y="78" fill="#78716c" fontSize="9">
        Lower 90%
      </text>
      <text x="180" y="78" textAnchor="middle" fill="#15803d" fontSize="10" fontWeight="700">
        1.8 t estimate
      </text>
      <text x="340" y="78" textAnchor="end" fill="#78716c" fontSize="9">
        Upper 90%
      </text>
      <text x="60" y="92" fill="#57534e" fontSize="9">
        1.2 t
      </text>
      <text x="340" y="92" textAnchor="end" fill="#57534e" fontSize="9">
        2.4 t
      </text>
      <text x="200" y="118" textAnchor="middle" fill="#b45309" fontSize="8">
        −18% Verra buffer when uncertainty &gt;15% · Mortality-adjusted ex-ante
      </text>
      <defs>
        <linearGradient id="carbonGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="50%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AuditChainDiagram() {
  return (
    <div className="ppt-audit-rich">
      <svg viewBox="0 0 420 90" className="ppt-svg w-full" role="img" aria-label="Audit hash chain">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={20 + i * 100} y="10" width="80" height="50" rx="6" fill="#ecfdf5" stroke="#16a34a" strokeWidth="1.5" />
            <text x={60 + i * 100} y="32" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="600">
              Block {i + 1}
            </text>
            <text x={60 + i * 100} y="48" textAnchor="middle" fill="#78716c" fontSize="7">
              SHA-256
            </text>
            {i < 3 ? (
              <path d={`M${100 + i * 100} 35 L${120 + i * 100} 35`} stroke="#16a34a" strokeWidth="2" markerEnd="url(#arr2)" />
            ) : null}
          </g>
        ))}
        <defs>
          <marker id="arr2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#16a34a" />
          </marker>
        </defs>
      </svg>
      <div className="ppt-audit-badges">
        {["Daily root anchor", "Ed25519 signature", "RFC 3161 TSA", "Verifier API"].map((b) => (
          <span key={b} className="ppt-audit-badge-chip">
            <ShieldCheck className="h-2.5 w-2.5" />
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VerificationSamplingDiagram() {
  return (
    <div className="ppt-verify-pyramid">
      <div className="ppt-verify-pyramid-level ppt-verify-pyramid-level--1">
        <span>Portfolio</span>
        <span className="ppt-verify-pyramid-count">100%</span>
      </div>
      <div className="ppt-verify-pyramid-level ppt-verify-pyramid-level--2">
        <span>Work areas · stratified</span>
        <span className="ppt-verify-pyramid-count">30%</span>
      </div>
      <div className="ppt-verify-pyramid-level ppt-verify-pyramid-level--3">
        <span>Random plots · species strata</span>
        <span className="ppt-verify-pyramid-count">10%</span>
      </div>
      <div className="ppt-verify-pyramid-level ppt-verify-pyramid-level--4">
        <span>Field attestation · Tier 4 MRV</span>
        <span className="ppt-verify-pyramid-count">Sample</span>
      </div>
      <p className="ppt-verify-pyramid-note">Verifier role: read-only + cryptographic attestation per item</p>
    </div>
  );
}

export function DeploymentModelDiagram() {
  const phases = [
    {
      phase: "Phase 1",
      weeks: "Weeks 1–4",
      task: "Pilot plantation · seed data · scheme mapping",
      deliverables: ["Org setup", "Field training", "Scheme profile"],
    },
    {
      phase: "Phase 2",
      weeks: "Weeks 5–8",
      task: "Satellite sweep · bioacoustic baseline · checklist setup",
      deliverables: ["NDVI baseline", "SAR watch", "Checklists live"],
    },
    {
      phase: "Phase 3",
      weeks: "Weeks 9–12",
      task: "Evidence bundle · auditor walkthrough · scale plan",
      deliverables: ["Signed bundle", "Audit demo", "Rollout plan"],
    },
  ];
  return (
    <div className="ppt-timeline ppt-timeline--rich">
      {phases.map((p, i) => (
        <div key={p.phase} className="ppt-timeline-item ppt-timeline-item--rich">
          <div className="ppt-timeline-marker">{i + 1}</div>
          <div className="ppt-timeline-content">
            <p className="ppt-timeline-phase">
              {p.phase} <span className="ppt-timeline-weeks">{p.weeks}</span>
            </p>
            <p className="ppt-timeline-task">{p.task}</p>
            <div className="ppt-timeline-deliverables">
              {p.deliverables.map((d) => (
                <span key={d} className="ppt-timeline-chip">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SchemeCardsGrid({
  rows,
}: {
  rows: string[][];
}) {
  const ministryColors: Record<string, string> = {
    MoEFCC: "#15803d",
    MoRTH: "#0369a1",
    "Rural Dev": "#b45309",
    "Jal Shakti": "#0284c7",
    Cooperation: "#7c3aed",
  };
  return (
    <div className="ppt-scheme-grid">
      {rows.map(([scheme, ministry, capability]) => (
        <div key={scheme} className="ppt-scheme-card">
          <span
            className="ppt-scheme-ministry"
            style={{ background: `${ministryColors[ministry] ?? "#57534e"}18`, color: ministryColors[ministry] ?? "#57534e" }}
          >
            {ministry}
          </span>
          <p className="ppt-scheme-name">{scheme}</p>
          <p className="ppt-scheme-cap">{capability}</p>
        </div>
      ))}
    </div>
  );
}

export function StandardsHubDiagram({
  rows,
}: {
  rows: string[][];
}) {
  const categories = [
    { label: "Carbon", filter: (r: string[]) => ["Verra", "Gold Standard", "IPCC", "WRI-WBCSD"].some((b) => r[1].includes(b) || r[0].includes("VM") || r[0].includes("GHG") || r[0].includes("Paris")) },
    { label: "Nature", filter: (r: string[]) => ["TNFD", "GBIF", "ICVCM"].some((b) => r[1].includes(b)) },
    { label: "Governance", filter: (r: string[]) => ["ISO", "UNFCCC", "OGC"].some((b) => r[1].includes(b)) },
  ];
  return (
    <div className="ppt-standards-hub">
      <div className="ppt-standards-hub-core">
        <Leaf className="h-5 w-5 text-emerald-600" />
        <p>One evidence base</p>
        <span>Per-tree GPS · Satellite · Carbon CI</span>
      </div>
      <div className="ppt-standards-hub-spokes">
        {categories.map(({ label, filter }) => (
          <div key={label} className="ppt-standards-spoke">
            <p className="ppt-standards-spoke-label">{label}</p>
            <div className="ppt-standards-chips">
              {rows.filter(filter).map(([name, body]) => (
                <span key={name} className="ppt-standards-chip" title={body}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ppt-standards-hub-footer">
        {rows.slice(0, 4).map(([name, body, cap]) => (
          <div key={name} className="ppt-standards-row-mini">
            <span className="ppt-standards-row-name">{name}</span>
            <span className="ppt-standards-row-body">{body}</span>
            <span className="ppt-standards-row-cap">{cap}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GeospatialLayersDiagram() {
  return (
    <div className="ppt-map-layers">
      {[
        { layer: "Trees", color: "#22c55e", pct: "100%" },
        { layer: "Work areas", color: "#0ea5e9", pct: "12 zones" },
        { layer: "NDVI overlay", color: "#f59e0b", pct: "0.72 avg" },
        { layer: "Verification", color: "#8b5cf6", pct: "50% done" },
      ].map(({ layer, color, pct }) => (
        <div key={layer} className="ppt-map-layer-row">
          <span className="ppt-map-layer-swatch" style={{ background: color }} />
          <span className="ppt-map-layer-name">{layer}</span>
          <span className="ppt-map-layer-bar">
            <span className="ppt-map-layer-fill" style={{ width: layer === "Trees" ? "100%" : "65%", background: color }} />
          </span>
          <span className="ppt-map-layer-pct">{pct}</span>
        </div>
      ))}
    </div>
  );
}
