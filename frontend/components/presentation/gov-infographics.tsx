"use client";

/** SVG infographics for government-grade slides — no app screenshots as backgrounds */

export function NationalMrvContext() {
  const items = [
    { label: "CAMPA", sub: "Compensatory afforestation MRV" },
    { label: "Green India Mission", sub: "Landscape restoration" },
    { label: "Green Credit Programme", sub: "2023 rules · MoEFCC" },
    { label: "Paris Agreement", sub: "NDC · Art. 6 traceability" },
    { label: "SEBI BRSR", sub: "Principle 6 disclosure" },
    { label: "DPDP Act 2023", sub: "Consent · data residency" },
  ];
  return (
    <div className="ppt-infographic ppt-infographic--grid-3">
      {items.map(({ label, sub }) => (
        <div key={label} className="ppt-info-card">
          <span className="ppt-info-card-dot" />
          <p className="ppt-info-card-title">{label}</p>
          <p className="ppt-info-card-sub">{sub}</p>
        </div>
      ))}
    </div>
  );
}

export function ProblemSolutionDiagram() {
  return (
    <svg viewBox="0 0 420 280" className="ppt-svg w-full" role="img" aria-label="Problem to solution flow">
      <rect x="10" y="20" width="180" height="240" rx="8" fill="#fef2f2" stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="6 4" />
      <text x="100" y="48" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="700">
        CURRENT STATE
      </text>
      {["Spreadsheets", "WhatsApp photos", "Manual reports", "No audit chain"].map((t, i) => (
        <text key={t} x="30" y={78 + i * 28} fill="#7f1d1d" fontSize="10">
          ✕ {t}
        </text>
      ))}
      <path d="M210 140 L250 140" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrow)" />
      <rect x="260" y="20" width="150" height="240" rx="8" fill="#ecfdf5" stroke="#16a34a" strokeWidth="2" />
      <text x="335" y="48" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="700">
        ARANYIX MRV
      </text>
      {["GPS per-tree registry", "Satellite + SAR", "90% CI carbon", "Signed evidence"].map((t, i) => (
        <text key={t} x="275" y={78 + i * 28} fill="#065f46" fontSize="10">
          ✓ {t}
        </text>
      ))}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#16a34a" />
        </marker>
      </defs>
    </svg>
  );
}

export function PlatformArchitectureDiagram() {
  const layers = [
    { y: 20, label: "Presentation", items: "Web dashboard · Mobile field app · Executive views" },
    { y: 72, label: "MRV services", items: "Carbon · Compliance · Satellite · Bioacoustic · Alerts" },
    { y: 124, label: "Evidence core", items: "PostGIS · Audit chain · Media · Credit ledger" },
    { y: 176, label: "Integration", items: "API · Webhooks · STAC · GeoJSON · BRSR export" },
    { y: 228, label: "Data sources", items: "Sentinel-2 · Sentinel-1 · Bhoonidhi · Open-Meteo · Field GPS" },
  ];
  return (
    <svg viewBox="0 0 480 280" className="ppt-svg w-full" role="img" aria-label="Platform architecture">
      {layers.map(({ y, label, items }) => (
        <g key={label}>
          <rect x="10" y={y} width="460" height="44" rx="6" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
          <rect x="10" y={y} width="100" height="44" rx="6" fill="#15803d" />
          <text x="60" y={y + 26} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">
            {label}
          </text>
          <text x="120" y={y + 26} fill="#1c1917" fontSize="9">
            {items}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MrvPipelineDiagram() {
  const steps = [
    "Register",
    "Measure",
    "Monitor",
    "Quantify",
    "Comply",
    "Prove",
  ];
  return (
    <div className="ppt-pipeline">
      {steps.map((step, i) => (
        <div key={step} className="ppt-pipeline-step">
          <span className="ppt-pipeline-num">{String(i + 1).padStart(2, "0")}</span>
          <span className="ppt-pipeline-label">{step}</span>
          {i < steps.length - 1 ? <span className="ppt-pipeline-chevron" aria-hidden /> : null}
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
    <svg viewBox="0 0 400 200" className="ppt-svg w-full" role="img" aria-label="Earth observation fusion">
      {[
        { x: 30, label: "Sentinel-2", sub: "Optical NDVI" },
        { x: 130, label: "Bhoonidhi", sub: "ISRO catalog" },
        { x: 230, label: "Sentinel-1", sub: "SAR C-band" },
      ].map(({ x, label, sub }) => (
        <g key={label}>
          <rect x={x} y="40" width="90" height="70" rx="6" fill="#fff" stroke="#d1fae5" strokeWidth="1.5" />
          <text x={x + 45} y="72" textAnchor="middle" fill="#047857" fontSize="10" fontWeight="600">
            {label}
          </text>
          <text x={x + 45} y="88" textAnchor="middle" fill="#78716c" fontSize="8">
            {sub}
          </text>
        </g>
      ))}
      <path d="M120 75 L130 75 M220 75 L230 75 M320 75 L340 75" stroke="#16a34a" strokeWidth="1.5" />
      <polygon points="330,70 340,75 330,80" fill="#16a34a" />
      <rect x="300" y="110" width="90" height="50" rx="6" fill="#15803d" />
      <text x="345" y="132" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
        Fused
      </text>
      <text x="345" y="148" textAnchor="middle" fill="#bbf7d0" fontSize="8">
        Canopy score
      </text>
      <text x="200" y="185" textAnchor="middle" fill="#57534e" fontSize="9">
        All-weather monitoring · Monsoon-resilient integrity index
      </text>
    </svg>
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
    <svg viewBox="0 0 420 120" className="ppt-svg w-full" role="img" aria-label="Audit hash chain">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={20 + i * 100} y="30" width="80" height="50" rx="4" fill="#ecfdf5" stroke="#16a34a" strokeWidth="1.5" />
          <text x={60 + i * 100} y="52" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="600">
            Block {i + 1}
          </text>
          <text x={60 + i * 100} y="68" textAnchor="middle" fill="#78716c" fontSize="7">
            SHA-256
          </text>
          {i < 3 ? (
            <path d={`M${100 + i * 100} 55 L${120 + i * 100} 55`} stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#arr2)" />
          ) : null}
        </g>
      ))}
      <text x="210" y="105" textAnchor="middle" fill="#57534e" fontSize="9">
        Daily root anchor · Ed25519 signed bundle · Verifier API
      </text>
      <defs>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#16a34a" />
        </marker>
      </defs>
    </svg>
  );
}

export function DeploymentModelDiagram() {
  const phases = [
    { phase: "Phase 1", weeks: "Weeks 1–4", task: "Pilot plantation · seed data · scheme mapping" },
    { phase: "Phase 2", weeks: "Weeks 5–8", task: "Satellite sweep · field training · checklist setup" },
    { phase: "Phase 3", weeks: "Weeks 9–12", task: "Evidence bundle · auditor walkthrough · scale plan" },
  ];
  return (
    <div className="ppt-timeline">
      {phases.map((p, i) => (
        <div key={p.phase} className="ppt-timeline-item">
          <div className="ppt-timeline-marker">{i + 1}</div>
          <div className="ppt-timeline-content">
            <p className="ppt-timeline-phase">
              {p.phase} <span className="ppt-timeline-weeks">{p.weeks}</span>
            </p>
            <p className="ppt-timeline-task">{p.task}</p>
          </div>
        </div>
      ))}
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
      </div>
      <div className="ppt-compare-mini-arrow">→</div>
      <div className="ppt-compare-mini-panel ppt-compare-mini-panel--good">
        <p className="ppt-compare-mini-title">Sentinel-1 SAR</p>
        <p className="ppt-compare-mini-sub">Integrity score · Grade B+</p>
        <div className="ppt-compare-mini-score">87</div>
      </div>
    </div>
  );
}
