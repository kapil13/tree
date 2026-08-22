"use client";

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

export function FieldMapVisual() {
  return (
    <svg viewBox="0 0 420 260" className="h-full w-full" aria-hidden>
      <rect width="420" height="260" rx="24" fill="#ecfdf5" />
      <path d="M0 160 C70 120 140 190 210 150 C280 110 340 170 420 130 L420 260 L0 260Z" fill="#bbf7d0" />
      <path d="M0 190 C90 170 160 220 250 180 C320 150 370 200 420 176 L420 260 L0 260Z" fill="#86efac" opacity="0.7" />
      {[
        [78, 118],
        [146, 96],
        [198, 132],
        [268, 88],
        [312, 124],
        [362, 102],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill="#14532d" />
          <circle cx={x} cy={y - 14} r="9" fill="#22c55e" />
        </g>
      ))}
      <rect x="248" y="28" width="148" height="78" rx="14" fill="#052e1f" />
      <text x="264" y="52" fill="#bbf7d0" fontSize="11" fontFamily="ui-sans-serif, system-ui">Corridor 12+340</text>
      <text x="264" y="74" fill="#fff" fontSize="16" fontFamily="ui-sans-serif, system-ui" fontWeight="700">248 trees</text>
      <text x="264" y="92" fill="#86efac" fontSize="10" fontFamily="ui-sans-serif, system-ui">offline cache ready</text>
    </svg>
  );
}

export function SatelliteFusionVisual() {
  return (
    <svg viewBox="0 0 420 260" className="h-full w-full" aria-hidden>
      <rect width="420" height="260" rx="24" fill="#0c4a6e" />
      <g opacity="0.35" stroke="#7dd3fc" strokeWidth="0.6">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 48} y1="20" x2={40 + i * 48} y2="240" />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <line key={`h${i}`} x1="20" y1={36 + i * 42} x2="400" y2={36 + i * 42} />
        ))}
      </g>
      <path d="M40 180 L90 150 L140 162 L190 118 L240 132 L290 96 L340 110 L380 84" fill="none" stroke="#86efac" strokeWidth="3" />
      <path d="M40 200 L90 188 L140 194 L190 170 L240 176 L290 158 L340 164 L380 150" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeDasharray="5 6" />
      <rect x="24" y="20" width="112" height="36" rx="10" fill="#082f49" />
      <text x="38" y="43" fill="#7dd3fc" fontSize="11" fontFamily="ui-sans-serif, system-ui">Sentinel · NISAR</text>
      <text x="24" y="236" fill="#bae6fd" fontSize="12" fontFamily="ui-sans-serif, system-ui">NDVI 0.72   ·   SAR integrity 0.91</text>
    </svg>
  );
}

export function BioacousticVisual() {
  const bars = [18, 34, 22, 48, 30, 56, 40, 28, 50, 36, 24, 44, 32, 20, 42];
  return (
    <svg viewBox="0 0 640 120" className="h-full w-full" aria-hidden>
      <rect width="640" height="120" rx="20" fill="#14532d" />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={28 + i * 40}
          y={90 - h}
          width="16"
          height={h}
          rx="4"
          fill={i % 3 === 0 ? "#d9f99d" : "#4ade80"}
          opacity={0.55 + (i % 4) * 0.1}
        />
      ))}
      <text x="28" y="28" fill="#ecfccb" fontSize="12" fontFamily="ui-sans-serif, system-ui">
        Dawn chorus · BirdNET detections
      </text>
    </svg>
  );
}

export function IntelligenceRiver() {
  return (
    <svg viewBox="0 0 1100 280" className="marketing-river-svg" role="img" aria-label="Evidence flowing from field capture to audit export">
      <defs>
        <linearGradient id="river" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#facc15" />
        </linearGradient>
      </defs>
      <path
        d="M40 150 C180 40 280 240 430 140 C560 60 680 220 830 130 C920 80 1000 160 1060 140"
        fill="none"
        stroke="url(#river)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle r="5" fill="#fff">
        <animateMotion
          dur="8s"
          repeatCount="indefinite"
          path="M40 150 C180 40 280 240 430 140 C560 60 680 220 830 130 C920 80 1000 160 1060 140"
        />
      </circle>
      {[
        [80, 132, "Field"],
        [300, 188, "Orbit"],
        [520, 96, "Habitat"],
        [740, 168, "AI"],
        [980, 118, "Audit"],
      ].map(([x, y, label]) => (
        <g key={String(label)} transform={`translate(${x} ${y})`}>
          <circle r="28" fill="#052e1f" stroke="#bbf7d0" strokeWidth="2" />
          <text y="4" textAnchor="middle" fill="#ecfccb" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const ORBIT_POSITIONS = [
  [50, 8],
  [78, 22],
  [92, 50],
  [78, 78],
  [50, 92],
  [22, 78],
  [8, 50],
  [22, 22],
  [64, 6],
  [94, 36],
  [64, 94],
  [6, 36],
] as const;

export function ComplianceOrbit({ codes }: { codes: string[] }) {
  const shown = codes.slice(0, 12);
  return (
    <svg viewBox="0 0 100 100" className="marketing-orbit-svg" role="img" aria-label="Compliance frameworks arranged around a living core">
      <circle cx="50" cy="50" r="34" fill="none" stroke="#86efac" strokeOpacity="0.25" />
      <circle cx="50" cy="50" r="22" fill="#052e1f" />
      <path d="M50 62 C50 52 42 48 42 40 C42 34 46 30 50 28 C54 30 58 34 58 40 C58 48 50 52 50 62Z" fill="#4ade80" />
      <text x="50" y="72" textAnchor="middle" fill="#d9f99d" fontSize="4.2" fontFamily="ui-sans-serif, system-ui">
        MRV core
      </text>
      {shown.map((code, i) => {
        const [x, y] = ORBIT_POSITIONS[i] ?? [50, 8];
        return (
          <g key={code}>
            <rect x={x - 10} y={y - 3.4} width="20" height="6.8" rx="1.8" fill="#064e3b" stroke="#86efac" strokeOpacity="0.45" />
            <text x={x} y={y + 1.1} textAnchor="middle" fill="#ecfccb" fontSize="2.7" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
              {code}
            </text>
          </g>
        );
      })}
    </svg>
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
