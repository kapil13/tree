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

const MOCK_SCHEMES = [
  { id: "all", label: "All programmes" },
  { id: "nhai", label: "NHAI Greenbelt" },
  { id: "campa", label: "CAMPA" },
  { id: "nagar", label: "Nagar Van" },
];

const MOCK_PROJECTS = [
  {
    id: "p1",
    schemeId: "nhai",
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
    schemeId: "campa",
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
    schemeId: "nagar",
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
      "Your portfolio <em>remains stable at 76/100</em>, but integrity has <em>declined 3 points this week</em>. The main concern is <em>KM-48</em>, where NDVI is <em>12% below its 30-day baseline</em> and <em>18 trees require attention</em>.",
    support:
      "Satellite and SAR signals are divergent at Chainage 142–148. Bioacoustic monitoring in Zone B shows reduced dawn chorus activity (−18% vs prior month). Five work areas have stale observations, and evidence gaps in CAMPA Block A may block the next scheme KPI export.",
    why:
      "A 12% NDVI decline at KM-48 Greenbelt threatens survival verification for 482 registered trees and may delay the next NHAI compliance checkpoint. Combined with 5 stale satellite scans and 3 open violations, the portfolio integrity trend (−3 pts) signals monitoring follow-up is needed before the quarterly MRV export window.",
    bioStory:
      "Bioacoustic intelligence links canopy stress to biodiversity: <strong>34 species detected</strong> across 42 analyzed sessions, but <strong>Zone B dawn chorus activity fell 18%</strong> coinciding with NDVI decline. <strong>2 threatened species</strong> (Indian Peafowl, Common Hawk-Cuckoo) remain present — field verification recommended to confirm habitat continuity.",
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
    projectId: "p1",
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
    projectId: "all",
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
    projectId: "all",
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
    projectId: "p3",
    severity: "medium",
    title: "12 survival surveys due",
    subtitle: "Nagar Van Phase 2 · Zone B · CAMPA Block A",
    action: "Start surveys",
    detail: "fieldOps.survival_due = 16 across portfolio; 12 concentrated in two work areas due this week per programme SLA.",
    links: ["Field ops", "Export survey list"],
  },
];

const MOCK_CHANGES = {
  sinceYesterday: [
    { icon: "down", text: "Integrity score", sub: "76 (−1 pt) · KM-48 NDVI alert triggered 2h ago" },
    { icon: "neutral", text: "3 trees registered", sub: "NHAI KM-48 · Chainage 142–148" },
    { icon: "info", text: "Bioacoustic session analyzed", sub: "Zone B · 8 species · Shannon 2.1" },
    { icon: "down", text: "1 new compliance gap", sub: "CAMPA Block A · pit photo missing" },
  ],
  sinceLastReview: [
    { icon: "down", text: "Portfolio integrity −3 pts", sub: "76/100 · trend declining over 7 days" },
    { icon: "down", text: "NDVI −12% at Ch. 142–148", sub: "SAR divergent · 3 linked alerts" },
    { icon: "neutral", text: "5 satellite scans went stale", sub: ">14 day refresh SLA exceeded" },
    { icon: "up", text: "Carbon +43.5 tCO₂e", sub: "Portfolio estimate · Apr–Sep growth" },
  ],
};

const MOCK_RECOMMENDATIONS = [
  {
    id: "rec1",
    priority: 1,
    title: "Schedule field inspection at Chainage 142–148",
    detail: "NDVI dropped 12% below baseline with SAR divergence. Verify survival status of 18 flagged trees within 48 hours.",
    module: "field-ops",
    due: "Within 48h",
  },
  {
    id: "rec2",
    priority: 2,
    title: "Trigger satellite refresh for 5 stale work areas",
    detail: "Monitoring confidence is degraded. Refresh scans for Chainage 148–155, Compartment 4, and Zone B.",
    module: "satellite",
    due: "This week",
  },
  {
    id: "rec3",
    priority: 3,
    title: "Resolve 5 evidence gaps before KPI export",
    detail: "3 pit photos missing in CAMPA Block A. Blocking violations may prevent scheme KPI export.",
    module: "compliance",
    due: "Before export",
  },
  {
    id: "rec4",
    priority: 4,
    title: "Complete 12 survival surveys in Nagar Van Zone B",
    detail: "fieldOps.survival_due concentrated in Zone B. Programme SLA due this week.",
    module: "field-ops",
    due: "This week",
  },
];

const MOCK_BRIEF_CHIPS = [
  { topic: "ndvi", label: "NDVI drop · Ch. 142–148", class: "danger" },
  { topic: "satellite", label: "5 stale satellite scans", class: "warn" },
  { topic: "trees", label: "18 trees need attention", class: "" },
  { topic: "bio", label: "Bioacoustic · Zone B ↓18%", class: "" },
  { topic: "fire", label: "Fire watch · 3 VIIRS", class: "warn" },
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
    projectId: "p3",
    left: 28,
    top: 62,
    ndvi: 0.55,
    delta: "-5%",
    severity: "high",
    detail: "12 survival surveys due · integrity 68/100",
  },
  {
    id: "h5",
    type: "bio",
    name: "Zone B · Bio station",
    project: "Nagar Van Phase 2",
    projectId: "p3",
    left: 32,
    top: 58,
    ndvi: null,
    delta: "chorus −18%",
    severity: "medium",
    detail: "Dawn chorus activity down 18% · 8 species last session · Shannon 2.1",
  },
];

// Add projectId to existing hotspots
MOCK_MAP_HOTSPOTS[0].projectId = "p1";
MOCK_MAP_HOTSPOTS[1].projectId = "p1";
MOCK_MAP_HOTSPOTS[2].projectId = "p2";

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
