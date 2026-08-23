"use client";

import {
  Brain,
  Leaf,
  MapPin,
  Mic,
  Radar,
  Satellite,
  ShieldCheck,
} from "lucide-react";

/** Distinct, product-grade infographics for marketing sections. */

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

function CanopyTree({
  x,
  y,
  scale = 1,
  tone = 0,
}: {
  x: number;
  y: number;
  scale?: number;
  tone?: number;
}) {
  const canopy = [
    ["#14532d", "#166534", "#4ade80"],
    ["#3f6212", "#4d7c0f", "#a3e635"],
    ["#166534", "#15803d", "#86efac"],
  ][tone % 3];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="22" rx="11" ry="3.4" fill="#052e1f" opacity="0.2" />
      <path d="M0 6 L0 24" stroke="#44403c" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M0 16 L-6 12 M0 18 L7 13" stroke="#57534e" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="-7" cy="0" rx="10" ry="11" fill={canopy[0]} />
      <ellipse cx="8" cy="1" rx="9" ry="10" fill={canopy[1]} />
      <ellipse cx="0" cy="-8" rx="11" ry="12" fill={canopy[2]} />
      <ellipse cx="4" cy="-12" rx="4.5" ry="3.2" fill="#ecfccb" opacity="0.38" />
    </g>
  );
}

export function FieldMapVisual() {
  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="fm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f5ee" />
          <stop offset="55%" stopColor="#d1fae5" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
        <linearGradient id="fm-ridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="fm-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#57534e" />
          <stop offset="100%" stopColor="#292524" />
        </linearGradient>
        <radialGradient id="fm-gps" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
          <stop offset="70%" stopColor="#22c55e" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <filter id="fm-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#14532d" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect width="640" height="360" fill="url(#fm-sky)" />
      {[80, 160, 240, 320, 400, 480, 560].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="360" stroke="#14532d" strokeOpacity="0.05" />
      ))}
      {[60, 120, 180, 240, 300].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="640" y2={y} stroke="#14532d" strokeOpacity="0.05" />
      ))}

      <path d="M0 168 C90 128 170 188 280 150 C390 112 500 168 640 132 L640 360 L0 360Z" fill="url(#fm-ridge)" opacity="0.55" />
      <path d="M0 214 C120 188 210 236 330 204 C440 176 530 228 640 200 L640 360 L0 360Z" fill="#22c55e" opacity="0.28" />

      <path d="M-10 268 C140 248 250 292 360 262 C470 234 560 274 650 252 L650 318 C560 336 470 300 360 322 C250 346 140 308 -10 328Z" fill="url(#fm-road)" />
      <path d="M0 290 C140 272 250 310 360 284 C470 260 560 296 640 278" fill="none" stroke="#facc15" strokeWidth="2.2" strokeDasharray="14 12" />

      {[
        [88, 276, "12+320"],
        [248, 286, "12+340"],
        [420, 274, "12+360"],
        [560, 282, "12+380"],
      ].map(([x, y, label]) => (
        <g key={String(label)} transform={`translate(${x} ${y})`}>
          <rect x="-2" y="-18" width="4" height="18" rx="1" fill="#fef3c7" />
          <rect x="-22" y="-34" width="44" height="16" rx="4" fill="#1c1917" />
          <text x="0" y="-23" textAnchor="middle" fill="#fde68a" fontSize="8" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
            {label}
          </text>
        </g>
      ))}

      <CanopyTree x={70} y={198} scale={0.86} tone={0} />
      <CanopyTree x={118} y={186} scale={1} tone={2} />
      <CanopyTree x={168} y={204} scale={0.78} tone={1} />
      <CanopyTree x={232} y={176} scale={1.08} tone={0} />
      <CanopyTree x={292} y={196} scale={0.9} tone={2} />
      <CanopyTree x={348} y={168} scale={1.12} tone={1} />
      <CanopyTree x={410} y={188} scale={0.84} tone={0} />
      <CanopyTree x={468} y={174} scale={1} tone={2} />
      <CanopyTree x={528} y={198} scale={0.8} tone={1} />
      <CanopyTree x={584} y={182} scale={0.94} tone={0} />

      <circle cx="348" cy="168" r="34" fill="url(#fm-gps)" />
      <circle cx="348" cy="168" r="18" fill="none" stroke="#166534" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.55" />

      <g transform="translate(24 22)" filter="url(#fm-soft)">
        <rect width="196" height="118" rx="18" fill="#052e1f" />
        <rect x="1" y="1" width="194" height="116" rx="17" fill="none" stroke="#86efac" strokeOpacity="0.28" />
        <text x="18" y="28" fill="#86efac" fontSize="10" fontFamily="ui-sans-serif, system-ui" fontWeight="700" letterSpacing="1.4">
          CORRIDOR 12+340
        </text>
        <text x="18" y="58" fill="#fff" fontSize="26" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          248 trees
        </text>
        <text x="18" y="80" fill="#bbf7d0" fontSize="11" fontFamily="ui-sans-serif, system-ui">
          GPS lock · 4.2 m accuracy
        </text>
        <rect x="18" y="90" width="118" height="16" rx="8" fill="#14532d" />
        <circle cx="30" cy="98" r="3" fill="#4ade80" />
        <text x="40" y="102" fill="#d9f99d" fontSize="9" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
          offline cache ready
        </text>
      </g>

      <g transform="translate(454 22)">
        <rect width="162" height="52" rx="12" fill="rgba(255,255,255,0.78)" />
        <circle cx="18" cy="18" r="5" fill="#22c55e" />
        <text x="30" y="22" fill="#14532d" fontSize="10" fontFamily="ui-sans-serif, system-ui">Healthy 214</text>
        <circle cx="18" cy="36" r="5" fill="#ca8a04" />
        <text x="30" y="40" fill="#713f12" fontSize="10" fontFamily="ui-sans-serif, system-ui">Watch 34</text>
      </g>
    </svg>
  );
}

function ndviFill(value: number) {
  if (value < 0.38) return "#b45309";
  if (value < 0.5) return "#ca8a04";
  if (value < 0.64) return "#65a30d";
  if (value < 0.76) return "#16a34a";
  return "#14532d";
}

export function SatelliteFusionVisual() {
  const mosaic = [
    [0.32, 0.4, 0.48, 0.55, 0.62, 0.7, 0.66, 0.52],
    [0.36, 0.46, 0.58, 0.68, 0.74, 0.78, 0.7, 0.5],
    [0.3, 0.42, 0.6, 0.76, 0.82, 0.8, 0.64, 0.46],
    [0.34, 0.5, 0.66, 0.8, 0.86, 0.76, 0.58, 0.4],
    [0.28, 0.38, 0.52, 0.64, 0.72, 0.68, 0.5, 0.36],
    [0.26, 0.34, 0.44, 0.54, 0.6, 0.56, 0.42, 0.3],
  ];

  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sf-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#082f49" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
        <linearGradient id="sf-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill="url(#sf-bg)" />

      {mosaic.map((row, y) =>
        row.map((value, x) => (
          <rect
            key={`${x}-${y}`}
            x={24 + x * 36}
            y={64 + y * 36}
            width="32"
            height="32"
            rx="6"
            fill={ndviFill(value)}
            opacity={0.92}
          />
        )),
      )}

      <rect x="132" y="136" width="32" height="32" rx="6" fill="none" stroke="#f8fafc" strokeWidth="2" />

      <g transform="translate(332 56)">
        <rect width="284" height="248" rx="20" fill="rgba(8, 47, 73, 0.72)" stroke="rgba(125,211,252,0.22)" />
        <text x="20" y="32" fill="#7dd3fc" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="700" letterSpacing="1.2">
          SENTINEL-2 · NISAR
        </text>
        <text x="20" y="56" fill="#f8fafc" fontSize="18" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          Canopy fusion
        </text>
        <path d="M20 168 L20 86 L268 86 L268 168" fill="none" stroke="#38bdf8" strokeOpacity="0.18" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="20" y1={86 + i * 27} x2="268" y2={86 + i * 27} stroke="#38bdf8" strokeOpacity="0.1" />
        ))}
        <polyline
          points="28,150 68,136 108,140 148,112 188,118 228,96 260,102"
          fill="none"
          stroke="url(#sf-line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="28,162 68,156 108,158 148,146 188,148 228,140 260,142"
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="2"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        <circle cx="188" cy="118" r="4" fill="#ecfccb" />
        <text x="20" y="198" fill="#bbf7d0" fontSize="12" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          NDVI 0.72
        </text>
        <text x="20" y="220" fill="#bae6fd" fontSize="12" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          SAR integrity 0.91
        </text>
        <text x="264" y="220" textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="ui-sans-serif, system-ui">
          30-day trend
        </text>
      </g>

      <g transform="translate(24 20)">
        <rect width="118" height="28" rx="9" fill="rgba(15, 23, 42, 0.55)" />
        <text x="12" y="18" fill="#e2e8f0" fontSize="10" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
          NDVI mosaic
        </text>
      </g>
      <g transform="translate(24 292)">
        {["#b45309", "#ca8a04", "#65a30d", "#16a34a", "#14532d"].map((color, i) => (
          <rect key={color} x={i * 22} y="8" width="20" height="8" rx="2" fill={color} />
        ))}
        <text x="0" y="32" fill="#94a3b8" fontSize="9" fontFamily="ui-sans-serif, system-ui">
          stressed
        </text>
        <text x="86" y="32" fill="#94a3b8" fontSize="9" fontFamily="ui-sans-serif, system-ui">
          dense
        </text>
      </g>
    </svg>
  );
}

export function BioacousticVisual() {
  const cells = [
    0.2, 0.35, 0.55, 0.8, 0.6, 0.4, 0.7, 0.9, 0.5, 0.3, 0.65, 0.85, 0.45, 0.25, 0.5,
    0.15, 0.4, 0.7, 0.95, 0.75, 0.5, 0.85, 0.6, 0.35, 0.55, 0.8, 0.4, 0.2, 0.6, 0.3,
    0.1, 0.25, 0.45, 0.6, 0.5, 0.3, 0.55, 0.4, 0.2, 0.35, 0.5, 0.25, 0.15, 0.4, 0.2,
  ];
  return (
    <svg viewBox="0 0 1100 168" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="bio-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#052e1f" />
        </linearGradient>
      </defs>
      <rect width="1100" height="168" rx="24" fill="url(#bio-bg)" />
      {cells.map((value, i) => {
        const col = i % 15;
        const row = Math.floor(i / 15);
        return (
          <rect
            key={i}
            x={28 + col * 46}
            y={52 + row * 28}
            width="40"
            height="22"
            rx="5"
            fill={row === 0 ? "#d9f99d" : row === 1 ? "#4ade80" : "#166534"}
            opacity={0.28 + value * 0.7}
          />
        );
      })}
      <path
        d="M28 86 C70 60 110 110 160 78 C210 50 250 104 300 82 C350 58 400 112 450 76 C500 48 550 108 600 80 C650 56 700 118 750 84 C800 54 850 110 900 78 C950 52 1000 96 1072 70"
        fill="none"
        stroke="#ecfccb"
        strokeWidth="2"
        strokeOpacity="0.7"
      />
      <text x="28" y="30" fill="#ecfccb" fontSize="13" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
        Dawn chorus · BirdNET spectrogram
      </text>
      <g transform="translate(720 16)">
        <rect width="118" height="24" rx="12" fill="rgba(236,252,203,0.12)" />
        <text x="12" y="16" fill="#d9f99d" fontSize="10" fontFamily="ui-sans-serif, system-ui">
          18 species
        </text>
      </g>
      <g transform="translate(850 16)">
        <rect width="220" height="24" rx="12" fill="rgba(236,252,203,0.12)" />
        <text x="12" y="16" fill="#d9f99d" fontSize="10" fontFamily="ui-sans-serif, system-ui">
          Indian roller · Coppersmith barbet
        </text>
      </g>
    </svg>
  );
}

const PIPELINE_STEPS = [
  { icon: MapPin, label: "Field", detail: "GPS · photos · chainage" },
  { icon: Satellite, label: "Orbit", detail: "NDVI + SAR fusion" },
  { icon: Mic, label: "Habitat", detail: "BirdNET richness" },
  { icon: Brain, label: "AI", detail: "Health + alerts" },
  { icon: ShieldCheck, label: "Audit", detail: "Signed exports" },
] as const;

export function IntelligenceRiver() {
  return (
    <ol className="marketing-pipeline" aria-label="Evidence flowing from field capture to audit export">
      {PIPELINE_STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <li key={step.label} className="marketing-pipeline-card">
            <span className="marketing-pipeline-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="marketing-pipeline-icon">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <strong>{step.label}</strong>
            <em>{step.detail}</em>
          </li>
        );
      })}
    </ol>
  );
}

export function ComplianceOrbit({ codes: _codes }: { codes: string[] }) {
  return (
    <div className="marketing-seal" role="img" aria-label="MRV integrity core for India, carbon, nature, and audit">
      <div className="marketing-seal-ring marketing-seal-ring--outer" />
      <div className="marketing-seal-ring marketing-seal-ring--mid" />
      <div className="marketing-seal-ring marketing-seal-ring--inner" />
      <div className="marketing-seal-core">
        <Leaf className="h-8 w-8 text-lime-300" strokeWidth={1.6} aria-hidden />
        <strong>MRV</strong>
        <span>integrity core</span>
      </div>
      <span className="marketing-seal-chip marketing-seal-chip--n">India</span>
      <span className="marketing-seal-chip marketing-seal-chip--e">Carbon</span>
      <span className="marketing-seal-chip marketing-seal-chip--s">Nature</span>
      <span className="marketing-seal-chip marketing-seal-chip--w">Audit</span>
    </div>
  );
}

export function ReportPaper({
  tag,
  title,
  accent,
  description,
  formats = "PDF · XLSX",
}: {
  tag: string;
  title: string;
  accent: string;
  description?: string;
  formats?: string;
}) {
  return (
    <article className="marketing-report-card">
      <div className="marketing-report-preview" style={{ ["--paper-accent" as string]: accent }}>
        <div className="marketing-report-sheet">
          <span>{tag}</span>
          <i />
          <i />
          <i />
          <b />
        </div>
      </div>
      <div className="marketing-report-body">
        <p className="marketing-report-kicker">{tag}</p>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        <p className="marketing-report-formats">{formats}</p>
      </div>
    </article>
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
      <path d="M40 160 C70 90 110 120 140 80 C170 50 200 100 240 70" fill="none" stroke="#16a34a" strokeWidth="8" />
      <text x="20" y="32" fill="#14532d" fontSize="13" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
        Citizen tree passport
      </text>
    </svg>
  );
}

export const PLATFORM_EDGES = [
  { icon: Satellite, title: "SAR + NDVI fusion", copy: "Sentinel and NISAR integrity — not greenness alone." },
  { icon: Mic, title: "BirdNET + Darwin Core", copy: "Habitat evidence most tree apps never capture." },
  { icon: Radar, title: "India scheme rules", copy: "NHAI chainage, CAMPA, Nagar Van, DPDP, 8 languages." },
  { icon: ShieldCheck, title: "Signed audit chain", copy: "Ed25519 evidence packs. We prepare audits — we do not issue credits." },
] as const;
