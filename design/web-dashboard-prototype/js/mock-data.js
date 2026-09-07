/**
 * Aranyix Dashboard — production-parity mock data
 */

const MOCK_USER = {
  full_name: "Priya Sharma",
  organization_name: "NHAI Regional Plantation Cell",
  role: "Program Manager",
};

const MOCK_SCHEMES = [
  { id: "all", label: "All programmes" },
  { id: "nhai", label: "NHAI Greenbelt" },
  { id: "campa", label: "CAMPA" },
  { id: "nagar", label: "Nagar Van" },
];

const MOCK_PROJECTS = [
  {
    id: "p1", schemeId: "nhai", name: "KM-48 Greenbelt", shortName: "KM-48",
    trees: 4821, targetTrees: 6000, openViolations: 2, survivalDue: 0,
    integrityScore: 76, integrityTrend: -5, progressPct: 80,
    ndvi: 0.52, ndviDelta: -12, sarIntegrity: 74, satelliteDays: 16,
    mapZone: { left: 22, top: 38, width: 42, height: 24 },
  },
  {
    id: "p2", schemeId: "campa", name: "CAMPA Block A", shortName: "CAMPA A",
    trees: 9104, targetTrees: 10000, openViolations: 0, survivalDue: 4,
    integrityScore: 82, integrityTrend: 1, progressPct: 91,
    ndvi: 0.71, ndviDelta: 2, sarIntegrity: 86, satelliteDays: 4,
    mapZone: { left: 62, top: 24, width: 28, height: 22 },
  },
  {
    id: "p3", schemeId: "nagar", name: "Nagar Van Ph.2", shortName: "Nagar Van",
    trees: 312, targetTrees: 500, openViolations: 1, survivalDue: 12,
    integrityScore: 68, integrityTrend: -2, progressPct: 62,
    ndvi: 0.55, ndviDelta: -5, sarIntegrity: 71, satelliteDays: 9,
    mapZone: { left: 18, top: 54, width: 24, height: 20 },
  },
];

const MOCK_DASHBOARD = {
  statusLabel: "Follow-up needed",
  statusTone: "warn",
  statusSummary: "3 compliance items · 6 alerts · 5 stale satellite sites",
  updatedAt: "2 min ago",
  aiInsight: "NDVI decline and SAR divergence are concentrated around KM-48 corridor Ch. 142–148.",
  forestIntegrity: { score: 76, trend: -3, prevScore: 79, majorRisk: "NDVI stress corridor" },
  kpi: {
    total_trees: 14237, trees_delta: 19,
    total_co2e_kg: 284500, co2e_delta_pct: 1.8, co2e_delta_t: 43.5,
    pct_healthy: 84.2, pct_satellite_verified: 71.5,
    annual_sequestration_kg: 19915, lifetime_credits_tco2e: 1564.75,
    trees_attention: 18, trees_attention_delta: 4,
    active_projects: 3, sites_monitored: 8,
  },
  fieldOps: { open_violations: 3, survival_due: 16, inspections_due: 4, evidence_capture_due: 7 },
  monitoring: {
    stale_satellite_work_areas: 5, sar_at_risk_work_areas: 1,
    anomaly_count: 7, anomaly_delta: 2, sar_avg_integrity: 78,
  },
  compliance: {
    avg_readiness_pct: 82.4, evidence_verified: 847, evidence_pending: 23,
    evidence_gaps: 5, blocking_violations: 1, schemes_enrolled: 3,
  },
  bioacoustic: {
    total_recordings: 142, analyzed_recordings: 128,
    total_species_detected: 34, species_delta: 2,
    avg_health_score: 73, avg_shannon_index: 2.14,
    threatened_species_count: 2, chorus_activity_pct: 82, chorus_delta: -18,
    new_observations: 2,
  },
  threatWatch: {
    fire_detections: 3, fire_areas: ["KM-48", "CAMPA A", "Nagar Van"],
    pest_risk: "moderate", locust_watch: false, weather_alerts: 1,
  },
  sar: {
    avg_integrity: 78, trend: -2, at_risk_areas: 1,
    last_scan: "18h ago", divergence_zones: ["Ch. 142–148"],
    series: [
      { label: "W1", value: 82 }, { label: "W2", value: 81 },
      { label: "W3", value: 80 }, { label: "W4", value: 79 },
      { label: "W5", value: 78 }, { label: "W6", value: 78 },
    ],
  },
  audience: {
    enrolled_programs: ["NHAI Greenbelt", "CAMPA", "Nagar Van"],
    stakeholder_type: "Government",
    reporting_cycle: "Q3 FY26",
  },
  governmentRollup: {
    district: "Chennai", state: "Tamil Nadu",
    total_trees_state: 482000, schemes_active: 12, compliance_pct: 79,
  },
  dataSources: [
    { name: "Sentinel-2", status: "active", freshness: "4d" },
    { name: "SAR NISAR", status: "active", freshness: "18h" },
    { name: "Bioacoustic", status: "active", freshness: "8h" },
    { name: "FIRMS Fire", status: "warn", freshness: "1h" },
    { name: "Field registry", status: "active", freshness: "1h" },
  ],
  unreadAlerts: 6,
  health_distribution: [
    { label: "Healthy", pct: 84, value: 11959, color: "#5c7a6e" },
    { label: "Stressed", pct: 13, value: 1851, color: "#b8956b" },
    { label: "Dead", pct: 2, value: 285, color: "#c4705a" },
    { label: "Unknown", pct: 1, value: 142, color: "#c4b8a8" },
  ],
  risk_distribution: [
    { label: "Low", pct: 58, color: "#5c7a6e" },
    { label: "Moderate", pct: 28, color: "#b8956b" },
    { label: "High", pct: 11, color: "#c4705a" },
    { label: "Critical", pct: 3, color: "#a85a48" },
  ],
  species_distribution: [
    { label: "Neem (Azadirachta)", value: 3842 },
    { label: "Pongamia", value: 2910 },
    { label: "Teak", value: 2184 },
    { label: "Gulmohar", value: 1642 },
    { label: "Other native mix", value: 3659 },
  ],
  carbon_trajectory: {
    historical: [
      { label: "Jan", value: 228 }, { label: "Feb", value: 234 },
      { label: "Mar", value: 241 }, { label: "Apr", value: 248 },
      { label: "May", value: 255 }, { label: "Jun", value: 263 },
      { label: "Jul", value: 271 }, { label: "Aug", value: 278 },
      { label: "Sep", value: 284.5 },
    ],
    projected: [
      { label: "Oct", value: 291 }, { label: "Nov", value: 298 }, { label: "Dec", value: 305 },
    ],
    target: 310, on_track: true, status: "on_track",
  },
  ndvi_series: [
    { label: "W1", value: 0.68 }, { label: "W2", value: 0.66 },
    { label: "W3", value: 0.64 }, { label: "W4", value: 0.62 },
    { label: "W5", value: 0.61 }, { label: "W6", value: 0.58 },
  ],
  canopy_series: [
    { label: "W1", value: 86 }, { label: "W2", value: 85 },
    { label: "W3", value: 85 }, { label: "W4", value: 84 },
    { label: "W5", value: 84 }, { label: "W6", value: 84 },
  ],
  survival_series: [
    { label: "W1", value: 92 }, { label: "W2", value: 91 },
    { label: "W3", value: 91 }, { label: "W4", value: 90 },
    { label: "W5", value: 89 }, { label: "W6", value: 88 },
  ],
  satellite_freshness: [
    { label: "W1", value: 92 }, { label: "W2", value: 88 },
    { label: "W3", value: 85 }, { label: "W4", value: 78 },
    { label: "W5", value: 74 }, { label: "W6", value: 71 },
  ],
  anomaly_series: [
    { label: "W1", value: 3 }, { label: "W2", value: 4 },
    { label: "W3", value: 4 }, { label: "W4", value: 5 },
    { label: "W5", value: 6 }, { label: "W6", value: 7 },
  ],
  alert_trend: [
    { label: "W1", value: 2 }, { label: "W2", value: 3 },
    { label: "W3", value: 3 }, { label: "W4", value: 4 },
    { label: "W5", value: 5 }, { label: "W6", value: 6 },
  ],
  bio_activity_series: [
    { label: "W1", value: 94 }, { label: "W2", value: 91 },
    { label: "W3", value: 90 }, { label: "W4", value: 88 },
    { label: "W5", value: 85 }, { label: "W6", value: 82 },
  ],
  bio_observations: [
    { label: "Mon", value: 6 }, { label: "Tue", value: 4 },
    { label: "Wed", value: 8 }, { label: "Thu", value: 5 },
    { label: "Fri", value: 7 }, { label: "Sat", value: 9 }, { label: "Sun", value: 3 },
  ],
  taxon_breakdown: [
    { name: "Birds", value: 18 }, { name: "Insects", value: 9 },
    { name: "Amphibians", value: 4 }, { name: "Mammals", value: 2 }, { name: "Reptiles", value: 1 },
  ],
  mrv_pipeline: [
    { stage: "Capture", pct: 100, status: "done", pending: 0, gaps: 0, blocked: 0 },
    { stage: "Evidence", pct: 97, status: "done", pending: 12, gaps: 0, blocked: 0 },
    { stage: "Verify", pct: 82, status: "active", pending: 23, gaps: 5, blocked: 1 },
    { stage: "MRV", pct: 45, status: "pending", pending: 0, gaps: 0, blocked: 0 },
    { stage: "Report", pct: 12, status: "pending", pending: 0, gaps: 0, blocked: 0 },
  ],
  change_strip: [
    { label: "+19 trees", trend: "up", type: "trees" },
    { label: "↓12% NDVI", trend: "down", type: "ndvi" },
    { label: "+3 alerts", trend: "up", type: "alerts" },
    { label: "+1 compliance gap", trend: "warn", type: "compliance" },
    { label: "+2 biodiversity obs", trend: "up", type: "bio" },
    { label: "+43.5 tCO₂e", trend: "up", type: "carbon" },
  ],
  operations: [
    { id: "op1", type: "inspection", label: "KM-48 corridor inspect", status: "due", due: "48h", projectId: "p1" },
    { id: "op2", type: "survey", label: "Survival survey Zone B", status: "overdue", due: "Overdue", projectId: "p3" },
    { id: "op3", type: "evidence", label: "Evidence capture CAMPA A", status: "pending", due: "3d", projectId: "p2" },
    { id: "op4", type: "satellite", label: "Satellite refresh ×5", status: "overdue", due: "Overdue", projectId: "all" },
    { id: "op5", type: "compliance", label: "Verify MRV batch", status: "blocked", due: "Blocked", projectId: "all" },
  ],
  kpi_sparklines: {
    trees: [13800, 13950, 14020, 14100, 14180, 14237],
    co2e: [268, 272, 276, 279, 282, 284.5],
    alerts: [2, 3, 3, 4, 5, 6],
    violations: [2, 2, 3, 3, 3, 3],
  },
  fences: [
    { id: "f1", name: "KM-48 Main", projectId: "p1", ndvi: 0.52, area_ha: 124, last_scan: "16d" },
    { id: "f2", name: "CAMPA A Block", projectId: "p2", ndvi: 0.71, area_ha: 86, last_scan: "4d" },
    { id: "f3", name: "Nagar Van Zone B", projectId: "p3", ndvi: 0.55, area_ha: 12, last_scan: "9d" },
    { id: "f4", name: "KM-48 East", projectId: "p1", ndvi: 0.61, area_ha: 48, last_scan: "16d" },
  ],
  recent_trees: [
    { id: "t1", code: "ARX-NH-004822", species: "Neem", health: "healthy", time: "1h" },
    { id: "t2", code: "ARX-NH-004821", species: "Pongamia", health: "stressed", time: "3h" },
    { id: "t3", code: "ARX-CA-009104", species: "Teak", health: "healthy", time: "5h" },
    { id: "t4", code: "ARX-NV-000312", species: "Gulmohar", health: "healthy", time: "8h" },
    { id: "t5", code: "ARX-NH-004820", species: "Neem", health: "unknown", time: "12h" },
  ],
  recent_reports: [
    { kind: "BRSR Principle 6", status: "ready" },
    { kind: "CAMPA quarterly", status: "draft" },
    { kind: "Carbon portfolio", status: "ready" },
  ],
};

const MOCK_MAP_HOTSPOTS = [
  { id: "h1", type: "alert", projectId: "p1", name: "Ch. 142–148", left: 38, top: 44, ndvi: 0.52, delta: -12, severity: "critical" },
  { id: "h2", type: "stale", projectId: "p1", name: "Ch. 148–155", left: 58, top: 48, ndvi: 0.61, delta: 0, severity: "medium", staleDays: 16 },
  { id: "h3", type: "tree", projectId: "p2", name: "Comp. 3", left: 72, top: 32, ndvi: 0.71, delta: 2, severity: "ok" },
  { id: "h4", type: "tree", projectId: "p3", name: "Zone B", left: 28, top: 62, ndvi: 0.55, delta: -5, severity: "high" },
  { id: "h5", type: "bio", projectId: "p3", name: "Bio station", left: 32, top: 58, ndvi: null, delta: -18, severity: "medium" },
  { id: "h6", type: "field", projectId: "p1", name: "Field team", left: 42, top: 50, ndvi: null, delta: 0, severity: "info" },
  { id: "h7", type: "fire", projectId: "p1", name: "Fire watch", left: 48, top: 36, ndvi: null, delta: 0, severity: "high" },
];

const MOCK_ALERTS = [
  { id: "a1", severity: "critical", title: "NDVI drop", location: "Ch. 142–148", trend: "down", action: "Inspect KM-48", due: "48h", projectId: "p1", status: "open", sla: "48h" },
  { id: "a2", severity: "high", title: "18 trees attention", location: "Portfolio", trend: "up", action: "Registry review", due: "Today", projectId: "all", status: "open", sla: "24h" },
  { id: "a3", severity: "high", title: "Fire watch", location: "3 areas", trend: "flat", action: "Monitor", due: "Active", projectId: "p1", status: "open", sla: "Active" },
  { id: "a4", severity: "medium", title: "Stale satellite", location: "5 sites", trend: "down", action: "Refresh scan", due: "Overdue", projectId: "all", status: "overdue", sla: "7d" },
  { id: "a5", severity: "medium", title: "Evidence gap", location: "CAMPA A", trend: "flat", action: "Resolve", due: "3d", projectId: "p2", status: "open", sla: "3d" },
  { id: "a6", severity: "low", title: "Surveys due", location: "Zone B", trend: "flat", action: "Survey", due: "Week", projectId: "p3", status: "open", sla: "7d" },
  { id: "a7", severity: "low", title: "SAR scan done", location: "Comp. 3", trend: "up", action: "—", due: "Done", projectId: "p2", status: "completed", sla: "—" },
];

const MOCK_ACTIVITY = [
  { id: "act1", type: "tree", label: "Tree registered", meta: "ARX-NH-004822", time: "1h", offset: 6 },
  { id: "act2", type: "alert", label: "NDVI alert", meta: "Ch. 142–148", time: "2h", offset: 18 },
  { id: "act3", type: "evidence", label: "Evidence verified", meta: "CAMPA A", time: "5h", offset: 32 },
  { id: "act4", type: "bio", label: "Bioacoustic analyzed", meta: "Zone B · 8 sp.", time: "8h", offset: 48 },
  { id: "act5", type: "satellite", label: "SAR scan completed", meta: "KM-48", time: "18h", offset: 65 },
  { id: "act6", type: "field", label: "Field task completed", meta: "Survival survey", time: "1d", offset: 82 },
];

const QUICK_ACTIONS = [
  { id: "tree", label: "Register tree", sub: "Guided wizard", priority: 2, icon: "♣" },
  { id: "compliance", label: "Portfolio compliance", sub: "Readiness & safeguards", priority: 1, icon: "◉" },
  { id: "health", label: "Portfolio health", sub: "Threats & monitoring", priority: 1, icon: "◎" },
  { id: "satellite", label: "Satellite scan", sub: "NDVI & health", priority: 3, icon: "◌" },
  { id: "bio", label: "Record biodiversity", sub: "Soundscape", priority: 4, icon: "∞" },
  { id: "ai", label: "Ask AI analyst", sub: "Carbon & risk tips", priority: 5, icon: "✦" },
  { id: "report", label: "Generate report", sub: "PDF & Excel", priority: 6, icon: "≡" },
  { id: "map", label: "Open map", sub: "Spatial view", priority: 7, icon: "⊞" },
];

const NAV_GROUPS = [
  { label: "Overview", items: [
    { id: "dashboard", label: "Dashboard", icon: "◫", active: true },
    { id: "stewardship", label: "Stewardship", icon: "◎" },
  ]},
  { label: "Set up & plant", items: [
    { id: "projects", label: "Projects", icon: "▤" },
    { id: "trees", label: "Trees", icon: "♣" },
    { id: "map", label: "Map", icon: "⊞" },
    { id: "field", label: "Field ops", icon: "⚑" },
  ]},
  { label: "Monitor & learn", items: [
    { id: "portfolio", label: "Portfolio health", icon: "◉" },
    { id: "satellite", label: "Satellite", icon: "◌" },
    { id: "biodiversity", label: "Biodiversity", icon: "∞" },
    { id: "alerts", label: "Alerts", icon: "!" },
  ]},
  { label: "Report & prove", items: [
    { id: "reports", label: "Reports", icon: "≡" },
    { id: "compliance", label: "Compliance", icon: "◈" },
    { id: "assistant", label: "AI Assistant", icon: "✦" },
  ]},
];
