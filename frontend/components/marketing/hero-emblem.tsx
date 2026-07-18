export function HeroEmblem({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 520"
      className={className}
      role="img"
      aria-label="Aranyix ecosystem intelligence illustration"
    >
      <defs>
        <linearGradient id="hero-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
        <linearGradient id="hero-tree" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="45%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="hero-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0c2e22" />
          <stop offset="55%" stopColor="#052e1f" />
          <stop offset="100%" stopColor="#041f17" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#041f17" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-scan" cx="18%" cy="12%" r="65%">
          <stop offset="0%" stopColor="#a3e635" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#22c55e" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#041f17" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <circle cx="260" cy="260" r="248" fill="url(#hero-glow)" />
      <circle cx="260" cy="260" r="220" fill="url(#hero-sky)" />
      <circle cx="260" cy="260" r="220" fill="none" stroke="url(#hero-ring)" strokeWidth="3" opacity="0.55" />
      <path
        d="M260 42 A218 218 0 0 1 478 260"
        fill="none"
        stroke="#84cc16"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M42 260 A218 218 0 0 1 260 478"
        fill="none"
        stroke="#15803d"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.7"
      />

      <ellipse cx="260" cy="430" rx="150" ry="28" fill="#0f766e" opacity="0.22" />

      <g opacity="0.35" fill="#052e1f">
        <path d="M40 360 L90 300 L130 330 L170 280 L210 310 L250 270 L290 300 L330 260 L370 290 L410 250 L450 280 L480 320 L480 430 L40 430 Z" />
        <path d="M60 300 L100 250 L140 270 L180 230 L220 250 L260 210 L300 240 L340 200 L380 220 L420 190 L460 220 L460 280 L60 280 Z" opacity="0.7" />
      </g>

      <g fill="#14532d" opacity="0.55">
        <ellipse cx="120" cy="360" rx="8" ry="14" />
        <ellipse cx="400" cy="350" rx="7" ry="12" />
        <path d="M350 320 Q360 300 375 310 Q365 325 350 320" />
      </g>

      <path
        d="M260 390 C260 310 190 280 190 210 C190 155 225 118 260 98 C295 118 330 155 330 210 C330 280 260 310 260 390Z"
        fill="url(#hero-tree)"
      />
      <path
        d="M260 390 L260 418 M235 405 L260 418 L285 405"
        stroke="#bbf7d0"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <g stroke="#d9f99d" strokeWidth="1.6" opacity="0.9">
        <line x1="260" y1="175" x2="220" y2="145" />
        <line x1="260" y1="175" x2="300" y2="145" />
        <line x1="260" y1="175" x2="260" y2="125" />
        <line x1="260" y1="175" x2="200" y2="185" />
        <line x1="260" y1="175" x2="320" y2="185" />
        <line x1="260" y1="175" x2="235" y2="220" />
        <line x1="260" y1="175" x2="285" y2="220" />
        <line x1="220" y1="145" x2="200" y2="185" />
        <line x1="300" y1="145" x2="320" y2="185" />
        <line x1="235" y1="220" x2="200" y2="185" />
        <line x1="285" y1="220" x2="320" y2="185" />
        <circle cx="220" cy="145" r="4" fill="#ecfccb" />
        <circle cx="300" cy="145" r="4" fill="#ecfccb" />
        <circle cx="260" cy="125" r="4" fill="#ecfccb" />
        <circle cx="200" cy="185" r="4" fill="#ecfccb" />
        <circle cx="320" cy="185" r="4" fill="#ecfccb" />
        <circle cx="235" cy="220" r="4" fill="#ecfccb" />
        <circle cx="285" cy="220" r="4" fill="#ecfccb" />
        <circle cx="260" cy="175" r="5.5" fill="#ffffff" />
      </g>

      <g stroke="#86efac" strokeWidth="1.4" opacity="0.75">
        <line x1="260" y1="418" x2="220" y2="440" />
        <line x1="260" y1="418" x2="300" y2="440" />
        <line x1="260" y1="418" x2="260" y2="448" />
        <line x1="220" y1="440" x2="200" y2="430" />
        <line x1="300" y1="440" x2="320" y2="430" />
        <circle cx="220" cy="440" r="3" fill="#bbf7d0" />
        <circle cx="300" cy="440" r="3" fill="#bbf7d0" />
        <circle cx="260" cy="448" r="3" fill="#bbf7d0" />
        <circle cx="200" cy="430" r="3" fill="#bbf7d0" />
        <circle cx="320" cy="430" r="3" fill="#bbf7d0" />
      </g>

      <circle cx="260" cy="260" r="220" fill="url(#hero-scan)" />

      <g transform="translate(72 58) rotate(-12)">
        <rect x="0" y="18" width="42" height="16" rx="4" fill="#cbd5e1" />
        <rect x="36" y="10" width="18" height="10" rx="2" fill="#94a3b8" />
        <rect x="8" y="22" width="10" height="8" rx="1" fill="#64748b" />
        <path d="M12 34 L28 78 L44 34" fill="#84cc16" opacity="0.35" filter="url(#hero-soft)" />
        <path d="M12 34 L28 78" stroke="#a3e635" strokeWidth="2" opacity="0.7" />
        <path d="M44 34 L28 78" stroke="#a3e635" strokeWidth="2" opacity="0.7" />
        <circle cx="28" cy="78" r="5" fill="#84cc16" opacity="0.5" />
      </g>

      <g transform="translate(390 108)">
        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
        <path d="M18 34 C18 26 22 20 28 18 C34 20 38 26 38 34" fill="none" stroke="#bbf7d0" strokeWidth="2" />
        <path d="M22 34 L28 22 L34 34" fill="#4ade80" opacity="0.8" />
        <line x1="28" y1="34" x2="28" y2="40" stroke="#86efac" strokeWidth="2" />
      </g>

      <g transform="translate(72 360)">
        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
        <path d="M16 30 C20 22 26 20 32 22 C30 28 24 32 16 30Z" fill="#4ade80" />
        <circle cx="36" cy="20" r="3" fill="#bbf7d0" />
        <path d="M20 36 Q28 30 36 36" fill="none" stroke="#86efac" strokeWidth="1.5" />
      </g>

      <g transform="translate(390 360)">
        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
        <path d="M18 24 C22 16 30 14 36 18 C32 22 26 24 18 24Z" fill="#4ade80" />
        <circle cx="34" cy="30" r="4" fill="#86efac" />
        <path d="M22 34 L30 28 L38 34" fill="none" stroke="#bbf7d0" strokeWidth="1.5" />
      </g>

      <g transform="translate(390 228)">
        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
        <path
          d="M18 30 C20 22 26 18 32 20 C34 26 30 32 24 34 C20 34 18 32 18 30Z"
          fill="none"
          stroke="#bbf7d0"
          strokeWidth="1.8"
        />
        <circle cx="24" cy="26" r="2" fill="#d9f99d" />
        <circle cx="30" cy="26" r="2" fill="#d9f99d" />
        <path d="M22 32 Q28 35 34 32" fill="none" stroke="#86efac" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
