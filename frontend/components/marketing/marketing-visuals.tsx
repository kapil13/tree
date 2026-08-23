"use client";

import { Leaf } from "lucide-react";

/** Distinct infographics for marketing sections — not generic icon tiles. */

export function HeroCommandVisual({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 560" className={className} role="img" aria-label="Field, satellite, and audit intelligence orbiting a living tree">
      <defs>
        <linearGradient id="hcv-canopy" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="55%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <radialGradient id="hcv-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#041f17" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hcv-ndvi" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      <circle cx="280" cy="280" r="250" fill="url(#hcv-glow)" />
      <circle cx="280" cy="280" r="214" fill="none" stroke="#4ade80" strokeOpacity="0.18" strokeWidth="1.2" />
      <ellipse cx="280" cy="280" rx="214" ry="78" fill="none" stroke="#86efac" strokeOpacity="0.22" strokeDasharray="6 8">
        <animateTransform attributeName="transform" type="rotate" from="0 280 280" to="360 280 280" dur="48s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="280" cy="280" rx="78" ry="214" fill="none" stroke="#38bdf8" strokeOpacity="0.16" strokeDasharray="4 10">
        <animateTransform attributeName="transform" type="rotate" from="360 280 280" to="0 280 280" dur="64s" repeatCount="indefinite" />
      </ellipse>

      <path
        d="M280 392 C280 318 214 288 214 220 C214 168 246 132 280 112 C314 132 346 168 346 220 C346 288 280 318 280 392Z"
        fill="url(#hcv-canopy)"
      />
      <path d="M280 392 L280 428 M252 412 L280 428 L308 412" stroke="#bbf7d0" strokeWidth="4" strokeLinecap="round" />
      <circle cx="280" cy="188" r="5" fill="#fff" />

      <g className="motion-soft-glow">
        <g transform="translate(68 96)">
          <rect width="118" height="72" rx="14" fill="#052e1f" stroke="#86efac" strokeOpacity="0.35" />
          <text x="14" y="22" fill="#a7f3d0" fontSize="9" fontFamily="ui-sans-serif, system-ui">NDVI 30d</text>
          <polyline
            points="14,52 28,46 42,48 56,38 70,34 84,40 98,28 108,32"
            fill="none"
            stroke="url(#hcv-ndvi)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(372 118)">
          <circle r="28" cx="28" cy="28" fill="#041f17" stroke="#7dd3fc" strokeOpacity="0.45" />
          <path d="M16 36 L28 16 L40 36" fill="none" stroke="#7dd3fc" strokeWidth="2" />
          <circle cx="28" cy="22" r="3" fill="#e0f2fe" />
          <text x="62" y="24" fill="#bae6fd" fontSize="11" fontFamily="ui-sans-serif, system-ui">SAR</text>
          <text x="62" y="40" fill="#67e8f9" fontSize="10" fontFamily="ui-sans-serif, system-ui">integrity 0.91</text>
        </g>
        <g transform="translate(54 340)">
          <rect width="132" height="64" rx="14" fill="#041f17" stroke="#d9f99d" strokeOpacity="0.3" />
          <path d="M16 40 Q28 22 40 36 T64 30 T88 38 T112 26" fill="none" stroke="#a3e635" strokeWidth="2" />
          <text x="16" y="18" fill="#ecfccb" fontSize="9" fontFamily="ui-sans-serif, system-ui">BirdNET · 18 spp</text>
        </g>
        <g transform="translate(368 348)">
          <rect width="128" height="68" rx="12" fill="#fff" />
          <rect x="10" y="12" width="72" height="6" rx="2" fill="#14532d" />
          <rect x="10" y="26" width="96" height="4" rx="2" fill="#d6d3d1" />
          <rect x="10" y="36" width="88" height="4" rx="2" fill="#d6d3d1" />
          <rect x="10" y="46" width="54" height="8" rx="3" fill="#84cc16" />
          <text x="70" y="53" fill="#365314" fontSize="8" fontFamily="ui-sans-serif, system-ui">BRSR pack</text>
        </g>
      </g>
    </svg>
  );
}

function MapTreePin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="10" rx="7" ry="2.5" fill="#14532d" opacity="0.18" />
      <path d="M0 8 L0 14" stroke="#166534" strokeWidth="2" strokeLinecap="round" />
      <circle cx="0" cy="0" r="8" fill="#22c55e" stroke="#fff" strokeWidth="2" />
      <circle cx="0" cy="0" r="3" fill="#ecfccb" opacity="0.85" />
    </g>
  );
}

export function FieldMapVisual() {
  const trees: [number, number][] = [
    [72, 148],
    [128, 118],
    [188, 138],
    [248, 108],
    [302, 132],
    [352, 112],
  ];

  return (
    <svg viewBox="0 0 420 280" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="fm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>
        <linearGradient id="fm-hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
        <linearGradient id="fm-hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <pattern id="fm-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0 L0 0 0 28" fill="none" stroke="#14532d" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="420" height="280" fill="url(#fm-sky)" />
      <rect width="420" height="280" fill="url(#fm-grid)" />

      <path d="M0 188 C60 148 120 198 200 162 C270 132 340 178 420 148 L420 280 L0 280Z" fill="url(#fm-hill-back)" opacity="0.85" />
      <path d="M0 210 C80 188 150 228 230 196 C300 170 360 214 420 192 L420 280 L0 280Z" fill="url(#fm-hill-front)" opacity="0.72" />

      {trees.map(([x, y]) => (
        <MapTreePin key={`${x}-${y}`} x={x} y={y} />
      ))}

      <g transform="translate(228 24)">
        <rect width="172" height="88" rx="16" fill="#052e1f" fillOpacity="0.92" stroke="#86efac" strokeOpacity="0.35" />
        <rect x="1" y="1" width="170" height="86" rx="15" fill="none" stroke="#fff" strokeOpacity="0.08" />
        <text x="16" y="28" fill="#86efac" fontSize="10" fontFamily="ui-sans-serif, system-ui" fontWeight="600" letterSpacing="0.08em">
          CORRIDOR 12+340
        </text>
        <text x="16" y="54" fill="#fff" fontSize="22" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          248 trees
        </text>
        <rect x="16" y="64" width="92" height="18" rx="9" fill="#14532d" />
        <text x="24" y="77" fill="#bbf7d0" fontSize="9" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
          offline cache ready
        </text>
      </g>
    </svg>
  );
}

export function SatelliteFusionVisual() {
  const ndviPoints = "48,168 96,138 144,150 192,106 240,120 288,84 336,98 372,72";
  const sarPoints = "48,188 96,176 144,182 192,158 240,164 288,146 336,152 372,138";

  return (
    <svg viewBox="0 0 420 280" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sf-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0c4a6e" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
        <linearGradient id="sf-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sf-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      <rect width="420" height="280" rx="0" fill="url(#sf-bg)" />

      <g opacity="0.22" stroke="#7dd3fc" strokeWidth="0.5">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={36 + i * 42} y1="52" x2={36 + i * 42} y2="228" />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <line key={`h${i}`} x1="28" y1={68 + i * 40} x2="392" y2={68 + i * 40} />
        ))}
      </g>

      <path d={`M${ndviPoints} L372 228 L48 228 Z`} fill="url(#sf-area)" />
      <polyline points={ndviPoints} fill="none" stroke="url(#sf-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={sarPoints} fill="none" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />

      {ndviPoints.split(" ").map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#ecfccb" stroke="#22c55e" strokeWidth="1.5" />;
      })}

      <g transform="translate(20 16)">
        <rect width="128" height="34" rx="10" fill="rgba(8,47,73,0.85)" stroke="rgba(125,211,252,0.35)" />
        <circle cx="18" cy="17" r="4" fill="#38bdf8" />
        <text x="30" y="21" fill="#e0f2fe" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
          Sentinel · NISAR
        </text>
      </g>

      <g transform="translate(20 232)">
        <rect width="118" height="32" rx="8" fill="rgba(255,255,255,0.08)" />
        <text x="12" y="20" fill="#bbf7d0" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
          NDVI 0.72
        </text>
      </g>
      <g transform="translate(148 232)">
        <rect width="148" height="32" rx="8" fill="rgba(255,255,255,0.08)" />
        <text x="12" y="20" fill="#bae6fd" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
          SAR integrity 0.91
        </text>
      </g>

      <text x="392" y="248" textAnchor="end" fill="#64748b" fontSize="9" fontFamily="ui-sans-serif, system-ui">
        30d trend
      </text>
    </svg>
  );
}

export function BioacousticVisual() {
  const bars = [18, 34, 22, 48, 30, 56, 40, 28, 50, 36, 24, 44, 32, 20, 42];
  return (
    <svg viewBox="0 0 640 120" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="bio-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
      </defs>
      <rect width="640" height="120" rx="20" fill="#14532d" />
      <rect width="640" height="120" rx="20" fill="url(#bio-bar)" opacity="0.08" />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={28 + i * 40}
          y={90 - h}
          width="16"
          height={h}
          rx="4"
          fill="url(#bio-bar)"
          opacity={0.65 + (i % 3) * 0.1}
        />
      ))}
      <text x="28" y="28" fill="#ecfccb" fontSize="12" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
        Dawn chorus · BirdNET detections
      </text>
    </svg>
  );
}

const PIPELINE_STEPS = [
  { label: "Field", detail: "Capture" },
  { label: "Orbit", detail: "Satellite" },
  { label: "Habitat", detail: "Bioacoustic" },
  { label: "AI", detail: "Intelligence" },
  { label: "Audit", detail: "Export" },
] as const;

export function IntelligenceRiver() {
  return (
    <div className="marketing-pipeline" role="img" aria-label="Evidence flowing from field capture to audit export">
      <div className="marketing-pipeline-track" aria-hidden />
      {PIPELINE_STEPS.map((step) => (
        <div key={step.label} className="marketing-pipeline-node">
          <span className="marketing-pipeline-node-label">{step.label}</span>
          <span className="marketing-pipeline-node-detail">{step.detail}</span>
        </div>
      ))}
    </div>
  );
}

export function ComplianceOrbit({ codes }: { codes: string[] }) {
  const shown = codes.slice(0, 12);

  return (
    <div
      className="marketing-orbit"
      role="img"
      aria-label="Compliance frameworks arranged around a living core"
    >
      <div className="marketing-orbit-ring marketing-orbit-ring--outer" aria-hidden />
      <div className="marketing-orbit-ring marketing-orbit-ring--inner" aria-hidden />

      <div className="marketing-orbit-core">
        <div className="marketing-orbit-core-icon">
          <Leaf className="h-7 w-7 text-lime-300" strokeWidth={1.75} aria-hidden />
        </div>
        <span className="marketing-orbit-core-label">MRV core</span>
      </div>

      {shown.map((code, i) => {
        const angle = (360 / shown.length) * i - 90;
        return (
          <div
            key={`${code}-${i}`}
            className="marketing-orbit-pill-wrap"
            style={{ ["--orbit-angle" as string]: `${angle}deg` }}
          >
            <span className="marketing-orbit-pill" title={code}>
              {code}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportPaper({
  tag,
  title,
  accent,
}: {
  tag: string;
  title: string;
  accent: string;
}) {
  return (
    <div className="marketing-paper" style={{ ["--paper-accent" as string]: accent }}>
      <div className="marketing-paper-spine" />
      <p className="marketing-paper-tag">{tag}</p>
      <p className="marketing-paper-title">{title}</p>
      <div className="marketing-paper-lines" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="marketing-paper-stamp">SIGNED</p>
    </div>
  );
}

export function ProgramScene({ kind }: { kind: string }) {
  if (/byot|citizen/i.test(kind)) {
    return (
      <svg viewBox="0 0 360 200" className="h-full w-full" aria-hidden>
        <rect width="360" height="200" fill="#dcfce7" />
        <rect x="248" y="48" width="72" height="120" rx="12" fill="#052e1f" />
        <rect x="258" y="62" width="52" height="78" rx="6" fill="#14532d" />
        <circle cx="284" cy="152" r="5" fill="#86efac" />
        <path d="M40 160 C70 90 110 120 140 80 C170 50 200 100 240 70" fill="none" stroke="#16a34a" strokeWidth="8" />
        <text x="20" y="32" fill="#14532d" fontSize="13" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          Citizen tree passport
        </text>
      </svg>
    );
  }
  if (/government|nhai|highway/i.test(kind)) {
    return (
      <svg viewBox="0 0 360 200" className="h-full w-full" aria-hidden>
        <rect width="360" height="200" fill="#f59e0b" />
        <rect y="120" width="360" height="80" fill="#78716c" />
        <path d="M0 120 L360 120" stroke="#fde68a" strokeWidth="6" />
        <path d="M0 132 L360 132" stroke="#fff" strokeWidth="2" strokeDasharray="16 14" />
        {[40, 100, 160, 220, 280].map((x) => (
          <g key={x}>
            <rect x={x} y="86" width="6" height="34" fill="#365314" />
            <ellipse cx={x + 3} cy="82" rx="14" ry="16" fill="#16a34a" />
          </g>
        ))}
        <text x="20" y="28" fill="#451a03" fontSize="13" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          NHAI chainage corridor
        </text>
      </svg>
    );
  }
  if (kind.includes("Corporate") || kind.includes("Industry") || kind.includes("ESG")) {
    return (
      <svg viewBox="0 0 360 200" className="h-full w-full" aria-hidden>
        <rect width="360" height="200" fill="#0f172a" />
        <rect x="40" y="70" width="48" height="110" fill="#334155" />
        <rect x="100" y="40" width="56" height="140" fill="#1e293b" />
        <rect x="168" y="88" width="40" height="92" fill="#334155" />
        <path d="M230 160 C250 110 290 90 340 70" fill="none" stroke="#4ade80" strokeWidth="3" />
        <text x="230" y="40" fill="#bbf7d0" fontSize="13" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          Board ESG pack
        </text>
      </svg>
    );
  }
  if (kind.includes("NGO") || kind.includes("Community")) {
    return (
      <svg viewBox="0 0 360 200" className="h-full w-full" aria-hidden>
        <rect width="360" height="200" fill="#ecfccb" />
        <ellipse cx="180" cy="150" rx="150" ry="28" fill="#65a30d" opacity="0.35" />
        <path d="M40 150 Q180 40 320 150" fill="#16a34a" opacity="0.85" />
        <circle cx="90" cy="128" r="10" fill="#365314" />
        <circle cx="180" cy="108" r="12" fill="#14532d" />
        <circle cx="260" cy="124" r="10" fill="#365314" />
        <text x="20" y="32" fill="#365314" fontSize="13" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          Watershed restoration
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 360 200" className="h-full w-full" aria-hidden>
      <rect width="360" height="200" fill="#dcfce7" />
      <rect x="248" y="48" width="72" height="120" rx="12" fill="#052e1f" />
      <rect x="258" y="62" width="52" height="78" rx="6" fill="#14532d" />
      <circle cx="284" cy="152" r="5" fill="#86efac" />
      <path d="M40 160 C70 90 110 120 140 80 C170 50 200 100 240 70" fill="none" stroke="#16a34a" strokeWidth="8" />
      <text x="20" y="32" fill="#14532d" fontSize="13" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
        Citizen tree passport
      </text>
    </svg>
  );
}
