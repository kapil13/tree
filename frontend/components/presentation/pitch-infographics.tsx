"use client";

import {
  Activity,
  Check,
  FileCheck,
  Globe,
  Leaf,
  Lock,
  MapPin,
  Radar,
  Rocket,
  Satellite,
  Shield,
  ShieldCheck,
  TreePine,
  X,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

/* ── Mini SVG illustrations for pitch-deck cards ── */

function PolicyArt() {
  return (
    <svg viewBox="0 0 200 100" className="pitch-art-svg" aria-hidden>
      <circle cx="100" cy="50" r="32" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <ellipse cx="100" cy="50" rx="32" ry="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
      <ellipse cx="100" cy="50" rx="14" ry="32" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
      <rect x="148" y="22" width="42" height="56" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="154" y={30 + i * 12} width="28" height="6" rx="2" fill="rgba(255,255,255,0.35)" />
      ))}
      <text x="100" y="54" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">INDIA</text>
      <text x="100" y="68" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="7">MoEFCC · NDC</text>
    </svg>
  );
}

function ArchitectureArt() {
  return (
    <svg viewBox="0 0 200 100" className="pitch-art-svg" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="30" y={12 + i * 20} width="140" height="16" rx="3" fill={`rgba(255,255,255,${0.12 + i * 0.05})`} stroke="rgba(255,255,255,0.25)" />
          <rect x="30" y={12 + i * 20} width="36" height="16" rx="3" fill="rgba(255,255,255,0.35)" />
        </g>
      ))}
      <path d="M100 8 L100 92" stroke="rgba(134,239,172,0.5)" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}

function FieldMrvArt() {
  return (
    <svg viewBox="0 0 200 100" className="pitch-art-svg" aria-hidden>
      <circle cx="55" cy="55" r="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 3" />
      <path d="M55 38 L55 72 M38 55 L72 55" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
      <circle cx="55" cy="55" r="4" fill="#86efac" />
      <rect x="95" y="30" width="36" height="52" rx="6" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" />
      <rect x="101" y="38" width="24" height="32" rx="2" fill="rgba(255,255,255,0.15)" />
      <circle cx="113" cy="76" r="3" fill="rgba(255,255,255,0.5)" />
      <path d="M148 70 L148 45 L160 38 L172 45 L172 70 Z" fill="rgba(74,222,128,0.4)" stroke="#86efac" strokeWidth="1" />
      <path d="M148 70 L160 58 L172 70" fill="rgba(34,197,94,0.5)" />
    </svg>
  );
}

function CarbonArt() {
  return (
    <svg viewBox="0 0 200 100" className="pitch-art-svg" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={40 + i * 24}
          y={70 - (i + 1) * 10}
          width="16"
          height={(i + 1) * 10}
          rx="2"
          fill={`rgba(255,255,255,${0.2 + i * 0.08})`}
        />
      ))}
      <path d="M40 75 Q80 30 120 45 T168 35" fill="none" stroke="#86efac" strokeWidth="2" />
      <text x="100" y="22" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">90% CI</text>
      <text x="100" y="36" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8">t CO₂e / tree</text>
    </svg>
  );
}

function TrustArt() {
  return (
    <svg viewBox="0 0 200 100" className="pitch-art-svg" aria-hidden>
      <path d="M100 18 L130 30 L130 55 Q130 72 100 82 Q70 72 70 55 L70 30 Z" fill="rgba(255,255,255,0.2)" stroke="#86efac" strokeWidth="1.5" />
      <path d="M88 52 L96 60 L114 42" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={36 + i * 52} y="68" width="40" height="18" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" />
      ))}
      <text x="56" y="80" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="6">SHA-256</text>
      <text x="108" y="80" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="6">Ed25519</text>
      <text x="160" y="80" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="6">TSA</text>
    </svg>
  );
}

function PilotArt() {
  return (
    <svg viewBox="0 0 200 100" className="pitch-art-svg" aria-hidden>
      <line x1="30" y1="70" x2="170" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={50 + i * 55} cy="70" r="8" fill={i === 2 ? "#86efac" : "rgba(255,255,255,0.35)"} />
          <text x={50 + i * 55} y="74" textAnchor="middle" fill={i === 2 ? "#041f17" : "#fff"} fontSize="8" fontWeight="700">{i + 1}</text>
          <text x={50 + i * 55} y="52" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="7">{["Wk 1–4", "Wk 5–8", "Wk 9–12"][i]}</text>
        </g>
      ))}
      <path d="M100 28 L108 44 L100 40 L92 44 Z" fill="#86efac" />
      <text x="100" y="22" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">12-WEEK PILOT</text>
    </svg>
  );
}

const PITCH_AGENDA = [
  {
    num: "01",
    title: "Policy context",
    sub: "National programmes & regulatory landscape",
    chips: ["CAMPA", "GIM", "Green Credit", "Paris NDC"],
    tone: "emerald",
    art: PolicyArt,
    icon: Globe,
  },
  {
    num: "02",
    title: "Platform architecture",
    sub: "Unified MRV stack — field to boardroom",
    chips: ["PostGIS", "Web + Mobile", "API", "STAC"],
    tone: "teal",
    art: ArchitectureArt,
    icon: Activity,
  },
  {
    num: "03",
    title: "Field & remote MRV",
    sub: "Ground truth + satellite intelligence",
    chips: ["GPS registry", "NDVI", "SAR", "Bhoonidhi"],
    tone: "sky",
    art: FieldMrvArt,
    icon: Satellite,
  },
  {
    num: "04",
    title: "Carbon & compliance",
    sub: "Conservative quantification & scheme templates",
    chips: ["90% CI", "9 schemes", "VM0047", "BRSR"],
    tone: "green",
    art: CarbonArt,
    icon: Leaf,
  },
  {
    num: "05",
    title: "Trust & verification",
    sub: "Tamper-evident audit chain & auditor role",
    chips: ["Hash chain", "Ed25519", "Verifier", "Signed PDF"],
    tone: "forest",
    art: TrustArt,
    icon: ShieldCheck,
  },
  {
    num: "06",
    title: "Pilot deployment",
    sub: "12-week rollout for state & PSU programmes",
    chips: ["Seed data", "Sat sweep", "Evidence bundle", "Scale plan"],
    tone: "lime",
    art: PilotArt,
    icon: Rocket,
  },
];

/** Fortune 500 pitch-deck agenda — 2×3 illustrated cards */
export function AgendaPitchDeck() {
  return (
    <div className="pitch-agenda">
      <div className="pitch-agenda-grid">
        {PITCH_AGENDA.map(({ num, title, sub, chips, tone, art: Art, icon: Icon }) => (
          <article key={num} className={`pitch-agenda-card pitch-agenda-card--${tone}`}>
            <div className="pitch-agenda-art">
              <span className="pitch-agenda-watermark">{num}</span>
              <span className="pitch-agenda-art-icon">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <Art />
            </div>
            <div className="pitch-agenda-body">
              <p className="pitch-agenda-title">{title}</p>
              <p className="pitch-agenda-sub">{sub}</p>
              <div className="pitch-agenda-chips">
                {chips.map((c) => (
                  <span key={c} className="pitch-agenda-chip">{c}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="pitch-journey">
        <div className="pitch-journey-node">
          <MapPin className="h-4 w-4" />
          <span>Field GPS</span>
        </div>
        <div className="pitch-journey-line" />
        <div className="pitch-journey-node">
          <Satellite className="h-4 w-4" />
          <span>Satellite MRV</span>
        </div>
        <div className="pitch-journey-line" />
        <div className="pitch-journey-node">
          <Leaf className="h-4 w-4" />
          <span>Carbon 90% CI</span>
        </div>
        <div className="pitch-journey-line" />
        <div className="pitch-journey-node pitch-journey-node--accent">
          <ShieldCheck className="h-4 w-4" />
          <span>Signed evidence</span>
        </div>
      </div>
    </div>
  );
}

/** Backward-compatible export */
export function AgendaRoadmap(_props: { items: { num: string; title: string; sub: string; icon: ReactNode }[] }) {
  return <AgendaPitchDeck />;
}

export function PitchTransformation() {
  return (
    <div className="pitch-transform">
      <div className="pitch-transform-panel pitch-transform-panel--before">
        <div className="pitch-transform-panel-head">
          <span className="pitch-transform-badge pitch-transform-badge--red">TODAY</span>
          <p>Fragmented &amp; unauditable</p>
        </div>
        <div className="pitch-transform-items">
          {[
            { label: "Spreadsheets & WhatsApp", icon: "📋" },
            { label: "No monsoon monitoring", icon: "☁" },
            { label: "Carbon point estimates", icon: "?" },
            { label: "Manual compliance packs", icon: "📁" },
          ].map(({ label, icon }) => (
            <div key={label} className="pitch-transform-item pitch-transform-item--bad">
              <span className="pitch-transform-item-icon">{icon}</span>
              <span>{label}</span>
              <X className="ml-auto h-4 w-4 text-red-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="pitch-transform-hub">
        <div className="pitch-transform-hub-ring" />
        <div className="pitch-transform-hub-core">
          <Zap className="h-6 w-6 text-emerald-300" />
          <span>ARANYIX</span>
          <small>National MRV</small>
        </div>
        <div className="pitch-transform-hub-stats">
          <div><strong>9+</strong><span>Schemes</span></div>
          <div><strong>11</strong><span>Standards</span></div>
          <div><strong>90%</strong><span>CI Carbon</span></div>
        </div>
      </div>
      <div className="pitch-transform-panel pitch-transform-panel--after">
        <div className="pitch-transform-panel-head">
          <span className="pitch-transform-badge pitch-transform-badge--green">AUDIT-READY</span>
          <p>Single evidence platform</p>
        </div>
        <div className="pitch-transform-items">
          {[
            { label: "Per-tree GPS registry", Icon: MapPin },
            { label: "Sentinel + SAR fusion", Icon: Satellite },
            { label: "Monte Carlo 90% CI", Icon: Activity },
            { label: "Ed25519 evidence bundle", Icon: Lock },
          ].map(({ label, Icon }) => (
            <div key={label} className="pitch-transform-item pitch-transform-item--good">
              <span className="pitch-transform-item-icon pitch-transform-item-icon--svg">
                <Icon className="h-4 w-4" />
              </span>
              <span>{label}</span>
              <Check className="ml-auto h-4 w-4 text-emerald-600 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PitchPolicyGrid() {
  const items = [
    { label: "CAMPA", sub: "Compensatory afforestation", stat: "MoEFCC", icon: TreePine, tone: "emerald" },
    { label: "Green India Mission", sub: "Landscape restoration", stat: "GIM", icon: Leaf, tone: "green" },
    { label: "Green Credit 2023", sub: "Market mechanism", stat: "Rules", icon: Shield, tone: "teal" },
    { label: "Paris Agreement", sub: "NDC · Art. 6", stat: "UNFCCC", icon: Globe, tone: "sky" },
    { label: "SEBI BRSR", sub: "Principle 6 disclosure", stat: "Listed cos", icon: FileCheck, tone: "amber" },
    { label: "DPDP Act 2023", sub: "Data residency", stat: "India", icon: ShieldCheck, tone: "violet" },
  ];
  return (
    <div className="pitch-policy-grid">
      {items.map(({ label, sub, stat, icon: Icon, tone }) => (
        <div key={label} className={`pitch-policy-card pitch-policy-card--${tone}`}>
          <div className="pitch-policy-icon">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="pitch-policy-stat">{stat}</div>
          <p className="pitch-policy-label">{label}</p>
          <p className="pitch-policy-sub">{sub}</p>
        </div>
      ))}
    </div>
  );
}

export function PitchPipeline() {
  const steps = [
    { label: "Register", sub: "GPS + photo", icon: TreePine, color: "#15803d" },
    { label: "Measure", sub: "DBH / height", icon: Activity, color: "#0d9488" },
    { label: "Monitor", sub: "Sat + SAR", icon: Satellite, color: "#0284c7" },
    { label: "Quantify", sub: "90% CI CO₂e", icon: Leaf, color: "#16a34a" },
    { label: "Comply", sub: "9 schemes", icon: ShieldCheck, color: "#059669" },
    { label: "Prove", sub: "Signed bundle", icon: FileCheck, color: "#047857" },
  ];
  return (
    <div className="pitch-pipeline">
      {steps.map(({ label, sub, icon: Icon, color }, i) => (
        <div key={label} className="pitch-pipeline-step">
          <div className="pitch-pipeline-icon" style={{ background: color }}>
            <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <span className="pitch-pipeline-num">{String(i + 1).padStart(2, "0")}</span>
          <p className="pitch-pipeline-label">{label}</p>
          <p className="pitch-pipeline-sub">{sub}</p>
          {i < steps.length - 1 ? (
            <svg className="pitch-pipeline-arrow" viewBox="0 0 24 12" aria-hidden>
              <path d="M0 6 H18 M14 2 L22 6 L14 10" fill="none" stroke="#16a34a" strokeWidth="2" />
            </svg>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function PitchFieldFlow() {
  const steps = [
    { label: "Capture", detail: "Mobile GPS + photo", icon: MapPin },
    { label: "Validate", detail: "Supervisor queue", icon: ShieldCheck },
    { label: "Store", detail: "Append-only log", icon: Lock },
    { label: "Sync", detail: "Offline → cloud", icon: Zap },
    { label: "Attest", detail: "Verifier sample", icon: FileCheck },
  ];
  return (
    <div className="pitch-field-flow">
      {steps.map(({ label, detail, icon: Icon }, i) => (
        <div key={label} className="pitch-field-step">
          <div className="pitch-field-icon">
            <Icon className="h-4 w-4" />
          </div>
          <p className="pitch-field-label">{label}</p>
          <p className="pitch-field-detail">{detail}</p>
          {i < steps.length - 1 ? <div className="pitch-field-connector" /> : null}
        </div>
      ))}
    </div>
  );
}

export function PitchEvidenceStrip() {
  return (
    <div className="pitch-evidence-strip">
      {[
        { val: "12.4k+", lbl: "Audit events", icon: Activity },
        { val: "SHA-256", lbl: "Hash chain", icon: Lock },
        { val: "Ed25519", lbl: "Signed export", icon: ShieldCheck },
        { val: "Bundle", lbl: "PDF + JSON + GeoJSON", icon: FileCheck, accent: true },
      ].map(({ val, lbl, icon: Icon, accent }) => (
        <div key={lbl} className={`pitch-evidence-item${accent ? " pitch-evidence-item--accent" : ""}`}>
          <Icon className="h-4 w-4 shrink-0" />
          <div>
            <span className="pitch-evidence-val">{val}</span>
            <span className="pitch-evidence-lbl">{lbl}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PitchFusionDiagram() {
  return (
    <div className="pitch-fusion">
      <div className="pitch-fusion-row">
        {[
          { label: "Sentinel-2", sub: "Optical NDVI", color: "#22c55e", icon: Satellite },
          { label: "Bhoonidhi", sub: "ISRO catalog", color: "#0ea5e9", icon: Globe },
          { label: "Sentinel-1", sub: "SAR C-band", color: "#8b5cf6", icon: Radar },
        ].map(({ label, sub, color, icon: Icon }) => (
          <div key={label} className="pitch-fusion-source" style={{ borderColor: color }}>
            <div className="pitch-fusion-source-icon" style={{ background: `${color}22`, color }}>
              <Icon className="h-5 w-5" />
            </div>
            <p>{label}</p>
            <span>{sub}</span>
          </div>
        ))}
      </div>
      <div className="pitch-fusion-engine">
        <div className="pitch-fusion-engine-line" />
        <div className="pitch-fusion-engine-badge">FUSION ENGINE</div>
        <div className="pitch-fusion-engine-line" />
      </div>
      <div className="pitch-fusion-result">
        <div className="pitch-fusion-gauge">
          <svg viewBox="0 0 100 58" className="w-full">
            <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#e7e5e4" strokeWidth="7" strokeLinecap="round" />
            <path d="M10 50 A40 40 0 0 1 82 28" fill="none" stroke="#15803d" strokeWidth="7" strokeLinecap="round" />
            <text x="50" y="44" textAnchor="middle" fill="#15803d" fontSize="16" fontWeight="700">87</text>
          </svg>
          <p>Canopy score</p>
        </div>
        <div className="pitch-fusion-meta">
          <p className="pitch-fusion-meta-title">Fused canopy integrity index</p>
          <p className="pitch-fusion-meta-sub">Grade B+ · All-weather · Monsoon-resilient monitoring</p>
          <div className="pitch-fusion-tags">
            <span>Optical</span><span>SAR</span><span>ISRO</span><span>Weekly watch</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PitchSchemeMatrix({ rows }: { rows: string[][] }) {
  const colors: Record<string, string> = {
    MoEFCC: "#15803d", MoRTH: "#0369a1", "Rural Dev": "#b45309", "Jal Shakti": "#0284c7", Cooperation: "#7c3aed",
  };
  return (
    <div className="pitch-scheme-matrix">
      {rows.map(([scheme, ministry, cap]) => (
        <div key={scheme} className="pitch-scheme-cell">
          <div className="pitch-scheme-cell-bar" style={{ background: colors[ministry] ?? "#57534e" }} />
          <span className="pitch-scheme-cell-ministry" style={{ color: colors[ministry] }}>{ministry}</span>
          <p className="pitch-scheme-cell-name">{scheme}</p>
          <p className="pitch-scheme-cell-cap">{cap}</p>
        </div>
      ))}
    </div>
  );
}

export function PitchStandardsWheel({ rows }: { rows: string[][] }) {
  const groups = [
    { label: "Carbon markets", items: rows.filter((r) => /Verra|Gold|IPCC|GHG|Paris|VM/.test(r[0] + r[1])) },
    { label: "Nature & disclosure", items: rows.filter((r) => /TNFD|Darwin|ICVCM|REDD/.test(r[0] + r[1])) },
    { label: "Governance & geo", items: rows.filter((r) => /ISO|UNFCCC|STAC|OGC/.test(r[0] + r[1])) },
  ];
  return (
    <div className="pitch-standards">
      <div className="pitch-standards-core">
        <Leaf className="h-6 w-6 text-emerald-400" />
        <p>One evidence base</p>
        <span>GPS · Satellite · Carbon CI · Audit chain</span>
      </div>
      <div className="pitch-standards-groups">
        {groups.map(({ label, items }) => (
          <div key={label} className="pitch-standards-group">
            <p className="pitch-standards-group-label">{label}</p>
            {items.map(([name, body, cap]) => (
              <div key={name} className="pitch-standards-row">
                <span className="pitch-standards-name">{name}</span>
                <span className="pitch-standards-body">{body}</span>
                <span className="pitch-standards-cap">{cap}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PitchVerifyPyramid() {
  return (
    <div className="pitch-pyramid">
      {[
        { label: "Portfolio scope", pct: "100%", w: "100%" },
        { label: "Stratified work areas", pct: "30%", w: "82%" },
        { label: "Random plot samples", pct: "10%", w: "64%" },
        { label: "Field attestation · Tier 4", pct: "Verify", w: "46%", accent: true },
      ].map(({ label, pct, w, accent }) => (
        <div key={label} className={`pitch-pyramid-level${accent ? " pitch-pyramid-level--accent" : ""}`} style={{ width: w }}>
          <span>{label}</span>
          <span>{pct}</span>
        </div>
      ))}
    </div>
  );
}

export function PitchDeployTimeline() {
  const phases = [
    { phase: "Phase 1", weeks: "Weeks 1–4", task: "Seed plantation · scheme mapping · field training", chips: ["Org setup", "GPS capture", "Scheme profile"] },
    { phase: "Phase 2", weeks: "Weeks 5–8", task: "Satellite sweep · bioacoustic · checklist live", chips: ["NDVI baseline", "SAR watch", "Compliance"] },
    { phase: "Phase 3", weeks: "Weeks 9–12", task: "Evidence bundle · auditor demo · scale plan", chips: ["Signed bundle", "Audit walkthrough", "Rollout"] },
  ];
  return (
    <div className="pitch-deploy">
      {phases.map((p, i) => (
        <div key={p.phase} className="pitch-deploy-phase">
          <div className="pitch-deploy-marker">{i + 1}</div>
          <div className="pitch-deploy-content">
            <p className="pitch-deploy-title">{p.phase} <span>{p.weeks}</span></p>
            <p className="pitch-deploy-task">{p.task}</p>
            <div className="pitch-deploy-chips">{p.chips.map((c) => <span key={c}>{c}</span>)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PitchAuditChain() {
  return (
    <div className="pitch-audit">
      <div className="pitch-audit-chain">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="pitch-audit-block">
            <Lock className="h-4 w-4 text-emerald-600" />
            <span>Block {n}</span>
            <small>SHA-256</small>
            {n < 4 ? <div className="pitch-audit-link" /> : null}
          </div>
        ))}
      </div>
      <div className="pitch-audit-badges">
        {["Daily root anchor", "Ed25519 signature", "RFC 3161 TSA", "Verifier API"].map((b) => (
          <span key={b} className="pitch-audit-badge">{b}</span>
        ))}
      </div>
    </div>
  );
}

export function PitchMapLayers() {
  return (
    <div className="pitch-map-layers">
      {[
        { layer: "Trees georeferenced", pct: 100, color: "#22c55e", val: "18" },
        { layer: "Work area polygons", pct: 85, color: "#0ea5e9", val: "12" },
        { layer: "NDVI canopy overlay", pct: 72, color: "#f59e0b", val: "0.72" },
        { layer: "Verification status", pct: 50, color: "#8b5cf6", val: "50%" },
      ].map(({ layer, pct, color, val }) => (
        <div key={layer} className="pitch-map-row">
          <span className="pitch-map-dot" style={{ background: color }} />
          <span className="pitch-map-name">{layer}</span>
          <div className="pitch-map-bar"><span style={{ width: `${pct}%`, background: color }} /></div>
          <span className="pitch-map-val">{val}</span>
        </div>
      ))}
    </div>
  );
}

export function PitchSarCompare() {
  return (
    <div className="pitch-sar-compare">
      <div className="pitch-sar-panel pitch-sar-panel--bad">
        <div className="pitch-sar-icon">☁</div>
        <p>Optical · Monsoon</p>
        <span className="pitch-sar-stat pitch-sar-stat--bad">0% usable</span>
        <small>Cloud blocks NDVI</small>
      </div>
      <div className="pitch-sar-plus">+</div>
      <div className="pitch-sar-panel pitch-sar-panel--good">
        <Radar className="h-8 w-8 text-emerald-600" />
        <p>Sentinel-1 SAR</p>
        <span className="pitch-sar-stat pitch-sar-stat--good">100% coverage</span>
        <small>C-band integrity</small>
      </div>
    </div>
  );
}
