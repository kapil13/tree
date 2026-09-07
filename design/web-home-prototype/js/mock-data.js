/**
 * Aranyix Web Home — mock data aligned with production API shapes
 * (dashboard, field-ops-summary, monitoring-summary, compliance, alerts, bioacoustic, threat-watch)
 */

const MOCK_USER = {
  full_name: "Priya Sharma",
  role: "government",
  org_role: "manager",
  organization_name: "NHAI Regional Plantation Cell",
  audience: "government",
};

const MOCK_PROJECTS = [
  {
    id: "p1",
    name: "NHAI KM-48 Greenbelt",
    trees: 4821,
    targetTrees: 6000,
    openViolations: 2,
    survivalDue: 0,
    integrityScore: 76,
    progressPct: 80,
    workAreas: ["Chainage 142–148", "Chainage 148–155"],
  },
  {
    id: "p2",
    name: "CAMPA Block A",
    trees: 9104,
    targetTrees: 10000,
    openViolations: 0,
    survivalDue: 4,
    integrityScore: 82,
    progressPct: 91,
    workAreas: ["Compartment 3", "Compartment 4"],
  },
  {
    id: "p3",
    name: "Nagar Van Phase 2",
    trees: 312,
    targetTrees: 500,
    openViolations: 1,
    survivalDue: 12,
    integrityScore: 68,
    progressPct: 62,
    workAreas: ["Zone A", "Zone B"],
  },
];

const MOCK_DASHBOARD = {
  operationalStatus: "attention",
  statusLabel: "Monitoring follow-up needed",
  updatedAt: "2 min ago",
  forestIntegrity: { score: 76, trend: -3, grade: "Moderate" },
  narrative: {
    headline:
      "Your portfolio is <em>stable at 76/100</em>, but <em>5 sites have stale satellite observations</em> and <em>18 trees require attention</em>.",
    support:
      "The highest-risk area is <strong>NHAI KM-48 Greenbelt</strong>, where NDVI has declined <strong>12%</strong> over the last 30 days at Chainage 142–148. Field inspection is recommended within 48 hours; evidence gaps in CAMPA Block A may block the next scheme KPI export.",
  },
  kpi: {
    total_trees: 14237,
    total_co2e_kg: 284500,
    annual_sequestration_kg: 19915,
    pct_healthy: 84.2,
    pct_satellite_verified: 71.5,
    lifetime_credits_tco2e: 1564.75,
  },
  fieldOps: {
    project_count: 3,
    open_violations: 3,
    survival_due: 16,
  },
  monitoring: {
    stale_satellite_work_areas: 5,
    sar_avg_forest_integrity: 76,
    sar_at_risk_work_areas: 1,
    sar_divergent_work_areas: 1,
    sar_aligned_work_areas: 5,
  },
  compliance: {
    avg_readiness_pct: 82.4,
    open_violations: 3,
    blocking_violations: 1,
    safeguard_gap_count: 2,
    evidence_verified: 847,
    evidence_pending: 23,
    evidence_gaps: 5,
  },
  bioacoustic: {
    total_recordings: 48,
    analyzed_recordings: 42,
    avg_health_score: 73,
    avg_shannon_index: 2.14,
    total_species_detected: 34,
    threatened_species_count: 2,
  },
  threatWatch: {
    sites_monitored: 8,
    weather_alerts_count: 2,
    pest_high_count: 1,
    highest_risk: "high",
    fire_detections: 3,
  },
  carbon_growth: [
    { label: "Apr", value: 241 },
    { label: "May", value: 248 },
    { label: "Jun", value: 255 },
    { label: "Jul", value: 263 },
    { label: "Aug", value: 271 },
    { label: "Sep", value: 284.5 },
  ],
  ndvi_series: [
    { label: "W1", value: 0.68 },
    { label: "W2", value: 0.66 },
    { label: "W3", value: 0.64 },
    { label: "W4", value: 0.62 },
    { label: "W5", value: 0.61 },
    { label: "W6", value: 0.58 },
  ],
  health_distribution: [
    { label: "Healthy", value: 84, pct: 84 },
    { label: "Stressed", value: 13, pct: 13 },
    { label: "Dead", value: 2, pct: 2 },
    { label: "Unknown", value: 1, pct: 1 },
  ],
  unreadAlerts: 3,
};

const MOCK_PRIORITIES = [
  {
    id: "pr1",
    severity: "critical",
    title: "Acute NDVI drop",
    subtitle: "NHAI KM-48 · Chainage 142–148 · −0.18 vs baseline",
    action: "Investigate",
    detail:
      "Mean NDVI fell from 0.70 to 0.52 over 30 days with only 8% cloud cover on the last Sentinel pass. SAR integrity divergent (−14 pts). Recommended: field inspection + survival survey within 48h.",
    links: ["View alert", "Open on map", "Schedule field visit"],
  },
  {
    id: "pr2",
    severity: "high",
    title: "18 trees need attention",
    subtitle: "Stressed canopy · 3 projects · compliance strict mode",
    action: "View registry",
    detail:
      "12 trees flagged by satellite health fusion; 6 missing follow-up photos spanning 30+ days. Highest concentration in Nagar Van Zone B.",
    links: ["Filter attention queue", "Assign to field team"],
  },
  {
    id: "pr3",
    severity: "medium",
    title: "5 sites need satellite refresh",
    subtitle: "Last scan >14 days · impacts NDVI trend confidence",
    action: "Trigger scan",
    detail:
      "Work areas Chainage 148–155, Compartment 4, and Zone B exceeded the 14-day refresh SLA. Monitoring summary shows stale_satellite_work_areas = 5.",
    links: ["Satellite console", "View monitoring"],
  },
  {
    id: "pr4",
    severity: "medium",
    title: "12 survival surveys due",
    subtitle: "Nagar Van Phase 2 · Zone B · CAMPA Block A",
    action: "Start surveys",
    detail: "fieldOps.survival_due = 16 across portfolio; 12 concentrated in two work areas due this week per programme SLA.",
    links: ["Field ops", "Export survey list"],
  },
];

const MOCK_MAP_HOTSPOTS = [
  {
    id: "h1",
    type: "alert",
    name: "Chainage 142–148",
    project: "NHAI KM-48 Greenbelt",
    left: 38,
    top: 44,
    ndvi: 0.52,
    delta: "-12%",
    severity: "critical",
    detail: "Acute NDVI drop · SAR divergent · 3 unread alerts linked",
  },
  {
    id: "h2",
    type: "stale",
    name: "Chainage 148–155",
    project: "NHAI KM-48 Greenbelt",
    left: 58,
    top: 48,
    ndvi: 0.61,
    delta: "stale scan",
    severity: "medium",
    detail: "Satellite observation 16 days old · refresh recommended",
  },
  {
    id: "h3",
    type: "tree",
    name: "Compartment 3",
    project: "CAMPA Block A",
    left: 72,
    top: 32,
    ndvi: 0.71,
    delta: "+2%",
    severity: "ok",
    detail: "On track · 91% registration · 0 open violations",
  },
  {
    id: "h4",
    type: "tree",
    name: "Zone B",
    project: "Nagar Van Phase 2",
    left: 28,
    top: 62,
    ndvi: 0.55,
    delta: "-5%",
    severity: "high",
    detail: "12 survival surveys due · integrity 68/100",
  },
];

const MOCK_ALERTS = [
  {
    id: "a1",
    kind: "satellite_health",
    severity: "high",
    title: "Acute NDVI drop",
    message: "Mean NDVI fell 0.18 vs 30-day baseline at Chainage 142–148.",
    is_read: false,
    created_at: "2h ago",
  },
  {
    id: "a2",
    kind: "compliance",
    severity: "medium",
    title: "Pit photo missing",
    message: "3 trees in CAMPA Block A lack required pit evidence.",
    is_read: false,
    created_at: "6h ago",
  },
  {
    id: "a3",
    kind: "threat_watch",
    severity: "high",
    title: "Fire watch — VIIRS",
    message: "3 detections within 25 km of KM-48 Greenbelt (last 48h).",
    is_read: false,
    created_at: "1d ago",
  },
];

const MOCK_ACTIVITY = [
  { id: "act1", title: "Tree registered", detail: "ARX-NH-004822 · Khejri · Ch. 142–148", time: "1h ago" },
  { id: "act2", title: "NDVI alert triggered", detail: "Chainage 142–148 · acute drop", time: "2h ago" },
  { id: "act3", title: "Evidence verified", detail: "CAMPA Block A · Compartment 3 batch", time: "5h ago" },
  { id: "act4", title: "Bioacoustic analyzed", detail: "Zone B · 8 species · Shannon 2.1", time: "8h ago" },
  { id: "act5", title: "Weekly SAR scan", detail: "NHAI KM-48 · 1 area at risk", time: "1d ago" },
];

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "📊", active: true },
      { id: "stewardship", label: "Stewardship", icon: "🌱" },
    ],
  },
  {
    label: "Plantation",
    items: [
      { id: "projects", label: "Projects", icon: "📁" },
      { id: "trees", label: "Trees", icon: "🌳" },
      { id: "map", label: "Map", icon: "🗺" },
      { id: "field", label: "Field ops", icon: "🚧" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "portfolio", label: "Portfolio health", icon: "💚" },
      { id: "satellite", label: "Satellite", icon: "🛰" },
      { id: "biodiversity", label: "Biodiversity", icon: "🦜" },
      { id: "alerts", label: "Alerts", icon: "🔔" },
    ],
  },
  {
    label: "Reports",
    items: [
      { id: "reports", label: "Reports", icon: "📄" },
      { id: "assistant", label: "AI Assistant", icon: "✨" },
    ],
  },
];
