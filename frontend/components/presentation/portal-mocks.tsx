"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Bird,
  Check,
  FolderKanban,
  Leaf,
  MapPin,
  Radar,
  Satellite,
  ShieldCheck,
  Sparkles,
  TreePine,
  TrendingUp,
} from "lucide-react";

function MiniChart({ tone = "green" }: { tone?: "green" | "amber" | "sky" }) {
  const stroke = tone === "amber" ? "#f59e0b" : tone === "sky" ? "#0ea5e9" : "#22c55e";
  const fill = tone === "amber" ? "rgba(245,158,11,0.15)" : tone === "sky" ? "rgba(14,165,233,0.15)" : "rgba(34,197,94,0.15)";
  return (
    <svg viewBox="0 0 240 64" className="h-full w-full">
      <defs>
        <linearGradient id={`g-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M0 48 L30 42 L60 38 L90 40 L120 28 L150 32 L180 22 L210 26 L240 18 L240 64 L0 64 Z"
        fill={`url(#g-${tone})`}
      />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        points="0,48 30,42 60,38 90,40 120,28 150,32 180,22 210,26 240,18"
      />
    </svg>
  );
}

export function ExecutiveDashboardMock() {
  return (
    <div className="mock-portal mock-portal--dash">
      <div className="mock-sidebar">
        <div className="mock-sidebar-logo">Aranyix</div>
        {["Dashboard", "Projects", "Satellite", "Compliance", "Map"].map((l, i) => (
          <div key={l} className={i === 0 ? "mock-nav-item mock-nav-item--active" : "mock-nav-item"}>
            {l}
          </div>
        ))}
      </div>
      <div className="mock-main">
        <div className="mock-hero">
          <div className="mock-live-pill">
            <span className="mock-live-dot" /> Executive command center
          </div>
          <h3 className="mock-hero-title">Good afternoon, Demo</h3>
          <p className="mock-hero-copy">
            Carbon, canopy health, SAR integrity, biodiversity, and compliance evidence — unified.
          </p>
          <div className="mock-hero-stats">
            {[
              ["2,847", "Trees"],
              ["412 t", "CO₂e"],
              ["91%", "Canopy"],
              ["87", "Integrity"],
            ].map(([v, l]) => (
              <div key={l} className="mock-stat">
                <span className="mock-stat-val">{v}</span>
                <span className="mock-stat-lbl">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mock-grid-4">
          {[
            { icon: FolderKanban, label: "Active projects", val: "6" },
            { icon: AlertTriangle, label: "Open violations", val: "2", warn: true },
            { icon: Bell, label: "Unread alerts", val: "5", warn: true },
            { icon: Satellite, label: "Sites monitored", val: "14" },
          ].map(({ icon: Icon, label, val, warn }) => (
            <div key={label} className="mock-metric">
              <Icon className="h-3.5 w-3.5 text-emerald-600" />
              <span className={warn ? "mock-metric-val mock-metric-val--warn" : "mock-metric-val"}>{val}</span>
              <span className="mock-metric-lbl">{label}</span>
            </div>
          ))}
        </div>
        <div className="mock-chart-row">
          <div className="mock-chart-card">
            <span className="mock-chart-title">Portfolio CO₂e trend</span>
            <MiniChart />
          </div>
          <div className="mock-chart-card">
            <span className="mock-chart-title">NDVI health index</span>
            <MiniChart tone="sky" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SatelliteMonitoringMock() {
  return (
    <div className="mock-portal mock-portal--satellite">
      <div className="mock-sat-header">
        <Satellite className="h-4 w-4 text-emerald-500" />
        <span>Satellite health · Work areas</span>
        <span className="mock-badge mock-badge--live">Sweep complete</span>
      </div>
      <div className="mock-sat-grid">
        <div className="mock-ndvi-strip">
          <div className="mock-ndvi-gradient" />
          <div className="mock-ndvi-line" />
          <span className="mock-ndvi-caption">NDVI · 12-month trend</span>
        </div>
        <div className="mock-sat-cards">
          {[
            { name: "Sector A · Nagar Van", ndvi: "0.72", delta: "+0.04", ok: true },
            { name: "Sector B · CAMPA", ndvi: "0.51", delta: "-0.18", ok: false },
            { name: "Riparian · Jal Shakti", ndvi: "0.68", delta: "+0.02", ok: true },
          ].map((s) => (
            <div key={s.name} className="mock-sat-row">
              <div>
                <p className="mock-sat-name">{s.name}</p>
                <p className="mock-sat-meta">Sentinel-2 · cloud 8%</p>
              </div>
              <div className="mock-sat-ndvi">
                <span>{s.ndvi}</span>
                <span className={s.ok ? "text-emerald-500" : "text-amber-500"}>{s.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mock-sar-bar">
        <Radar className="h-3.5 w-3.5" />
        <span>SAR integrity</span>
        <div className="mock-sar-track">
          <div className="mock-sar-fill" style={{ width: "87%" }} />
        </div>
        <span className="font-semibold text-emerald-400">87 B+</span>
      </div>
    </div>
  );
}

export function CompliancePortalMock() {
  return (
    <div className="mock-portal mock-portal--compliance">
      <div className="mock-comp-header">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>Compliance checklists</span>
        <span className="mock-badge">VM0047 · CAMPA</span>
      </div>
      {[
        { name: "VM0047 ARR accounting", pct: 78 },
        { name: "CAMPA plantation report", pct: 92 },
        { name: "SEBI BRSR Principle 6", pct: 65 },
        { name: "DPDP consent records", pct: 100 },
      ].map((c) => (
        <div key={c.name} className="mock-comp-row">
          <div className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>{c.name}</span>
          </div>
          <div className="mock-comp-bar-wrap">
            <div className="mock-comp-bar" style={{ width: `${c.pct}%` }} />
          </div>
          <span className="mock-comp-pct">{c.pct}%</span>
        </div>
      ))}
      <div className="mock-comp-export">
        <Sparkles className="h-3.5 w-3.5" />
        Export signed evidence bundle · Ed25519
      </div>
    </div>
  );
}

export function FieldOpsMock() {
  return (
    <div className="mock-portal mock-portal--field">
      <div className="mock-phone">
        <div className="mock-phone-notch" />
        <div className="mock-phone-screen">
          <div className="mock-phone-header">
            <MapPin className="h-3 w-3" />
            Field ops · Offline ready
          </div>
          <div className="mock-tree-card">
            <TreePine className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold">BYOT-TREE-00421</p>
              <p className="text-[0.45rem] text-stone-500">Neem · DBH 24cm · synced</p>
            </div>
          </div>
          <div className="mock-map-block">
            <div className="mock-map-pin" />
            <span>Work area · 12.4 ha</span>
          </div>
          <div className="mock-phone-actions">
            <span>Survey</span>
            <span>Measure</span>
            <span>Photo</span>
          </div>
        </div>
      </div>
      <div className="mock-field-stats">
        <div className="mock-field-stat">
          <Activity className="h-4 w-4" />
          <span>847 trees queued</span>
        </div>
        <div className="mock-field-stat">
          <Leaf className="h-4 w-4" />
          <span>94% survival rate</span>
        </div>
        <div className="mock-field-stat">
          <TrendingUp className="h-4 w-4" />
          <span>Append-only measurements</span>
        </div>
      </div>
    </div>
  );
}

export function BioacousticMock() {
  return (
    <div className="mock-portal mock-portal--bio">
      <div className="mock-bio-header">
        <Bird className="h-4 w-4 text-lime-500" />
        Biodiversity · Bioacoustic panel
      </div>
      <div className="mock-waveform">
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            className="mock-wave-bar"
            style={{ height: `${20 + Math.sin(i * 0.5) * 18 + (i % 7) * 3}px` }}
          />
        ))}
      </div>
      <div className="mock-bio-species">
        {["Indian Robin", "Common Iora", "Purple Sunbird", "Black Drongo"].map((s) => (
          <span key={s} className="mock-species-chip">
            {s}
          </span>
        ))}
      </div>
      <div className="mock-bio-scores">
        <div>
          <span className="mock-bio-score-val">3.42</span>
          <span className="mock-bio-score-lbl">Shannon index</span>
        </div>
        <div>
          <span className="mock-bio-score-val">78</span>
          <span className="mock-bio-score-lbl">Bio health score</span>
        </div>
      </div>
    </div>
  );
}

export function CarbonCreditsMock() {
  return (
    <div className="mock-portal mock-portal--carbon">
      <div className="mock-carbon-header">Carbon MRV · 90% confidence</div>
      <div className="mock-carbon-range">
        <div className="mock-carbon-track">
          <div className="mock-carbon-band" />
          <div className="mock-carbon-point" />
        </div>
        <div className="mock-carbon-labels">
          <span>1.2 t</span>
          <span className="text-emerald-400 font-bold">1.8 t CO₂e</span>
          <span>2.4 t</span>
        </div>
      </div>
      <div className="mock-carbon-ledger">
        <p className="font-mono text-[0.5rem] text-emerald-700">BYOT-2026-MH-00042</p>
        <p className="text-[0.45rem] text-stone-500">verified · buffer 18% · VM0047</p>
        <div className="mock-ledger-states">
          {["Estimated", "Verified", "Issued"].map((s, i) => (
            <span key={s} className={i === 1 ? "mock-ledger-pill mock-ledger-pill--on" : "mock-ledger-pill"}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
