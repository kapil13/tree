export function AranyixLogo({ className = "h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 120"
      className={className}
      role="img"
      aria-label="Aranyix"
    >
      <defs>
        <linearGradient id="aranyix-word" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0b3d2e" />
          <stop offset="55%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
        <linearGradient id="aranyix-emblem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <radialGradient id="aranyix-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#86efac" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform="translate(8 8)">
        <circle cx="52" cy="52" r="50" fill="url(#aranyix-glow)" />
        <circle cx="52" cy="52" r="44" fill="#052e1f" opacity="0.92" />
        <circle cx="52" cy="52" r="44" fill="none" stroke="#4ade80" strokeOpacity="0.25" />

        <ellipse cx="52" cy="78" rx="34" ry="8" fill="#0f766e" opacity="0.35" />
        <path
          d="M52 74 C52 58 38 50 38 36 C38 24 46 16 52 12 C58 16 66 24 66 36 C66 50 52 58 52 74Z"
          fill="url(#aranyix-emblem)"
        />
        <path d="M52 74 L52 88 M44 82 L52 88 L60 82" stroke="#86efac" strokeWidth="2.2" strokeLinecap="round" />

        <g stroke="#d9f99d" strokeWidth="1.2" opacity="0.85">
          <line x1="52" y1="30" x2="40" y2="22" />
          <line x1="52" y1="30" x2="64" y2="22" />
          <line x1="52" y1="30" x2="52" y2="16" />
          <line x1="46" y1="38" x2="34" y2="34" />
          <line x1="58" y1="38" x2="70" y2="34" />
          <circle cx="40" cy="22" r="2.2" fill="#ecfccb" />
          <circle cx="64" cy="22" r="2.2" fill="#ecfccb" />
          <circle cx="52" cy="16" r="2.2" fill="#ecfccb" />
          <circle cx="34" cy="34" r="2.2" fill="#ecfccb" />
          <circle cx="70" cy="34" r="2.2" fill="#ecfccb" />
          <circle cx="52" cy="30" r="2.8" fill="#ffffff" />
        </g>

        <g transform="translate(78 10) rotate(18)">
          <rect x="0" y="8" width="18" height="7" rx="2" fill="#cbd5e1" />
          <rect x="16" y="4" width="8" height="4" rx="1" fill="#94a3b8" />
          <path d="M4 15 L10 24" stroke="#86efac" strokeWidth="1.5" opacity="0.8" />
        </g>
      </g>

      <text
        x="118"
        y="58"
        fill="url(#aranyix-word)"
        fontSize="42"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="-1"
      >
        Aranyix
      </text>
      <text
        x="120"
        y="82"
        fill="#3f6212"
        fontSize="10.5"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="3.2"
      >
        INTELLIGENCE FOR A THRIVING PLANET
      </text>
    </svg>
  );
}
