/* Aranyix prototype — realistic mock data aligned with web product model */

const MOCK_PROGRAMS = [
  {
    id: "government_nhai",
    name: "Government NHAI",
    description: "Highway plantation & compensatory afforestation programmes",
  },
  {
    id: "byot",
    name: "Bring Your Own Trees",
    description: "Citizen and community tree tagging",
  },
  {
    id: "corporate_esg",
    name: "Corporate ESG",
    description: "Corporate sustainability plantation",
  },
];

const MOCK_SCHEMES = [
  {
    id: "nhai_highway",
    code: "nhai_highway",
    name: "NHAI Highway Plantation",
    programId: "government_nhai",
    complianceMode: "strict",
    template: "nhai_highway_v1",
    rules: {
      requirePitPhoto: true,
      chainageEnabled: true,
      minPhotos: 3,
      spacingM: 6,
      pitSize: "60×60×60 cm",
      guardRequired: true,
    },
  },
  {
    id: "campa_ca",
    code: "campa_ca",
    name: "CAMPA Compensatory Afforestation",
    programId: "government_nhai",
    complianceMode: "guided",
    template: "campa_ca_v1",
    rules: {
      requirePitPhoto: false,
      chainageEnabled: false,
      minPhotos: 3,
      spacingM: 4,
      nativePctMin: 80,
    },
  },
  {
    id: "nagar_van",
    code: "nagar_van",
    name: "Nagar Van Urban Forest",
    programId: "government_nhai",
    complianceMode: "guided",
    template: "nagar_van_urban_forest_v1",
    rules: {
      requirePitPhoto: false,
      chainageEnabled: false,
      minPhotos: 2,
      nativePctMin: 80,
    },
  },
];

const MOCK_PROJECTS = [
  {
    id: "p1",
    name: "NHAI KM-48 Greenbelt",
    trees: 4821,
    targetTrees: 6000,
    segment: "Highway",
    programId: "government_nhai",
    schemeId: "nhai_highway",
    workAreas: ["Chainage 142–148", "Chainage 148–155"],
    progressPct: 80,
    openViolations: 2,
    survivalDue: 0,
    integrityScore: 76,
  },
  {
    id: "p2",
    name: "CAMPA Block A",
    trees: 9104,
    targetTrees: 10000,
    segment: "CAMPA",
    programId: "government_nhai",
    schemeId: "campa_ca",
    workAreas: ["Compartment 3", "Compartment 4"],
    progressPct: 91,
    openViolations: 0,
    survivalDue: 4,
    integrityScore: 82,
  },
  {
    id: "p3",
    name: "Nagar Van Phase 2",
    trees: 312,
    targetTrees: 500,
    segment: "Urban forest",
    programId: "government_nhai",
    schemeId: "nagar_van",
    workAreas: ["Zone A", "Zone B"],
    progressPct: 62,
    openViolations: 1,
    survivalDue: 12,
    integrityScore: 68,
  },
];

const MOCK_DASHBOARD = {
  operationalStatus: "attention", // healthy | watch | attention | critical
  statusLabel: "Attention required",
  statusDetail: "2 critical alerts · 18 trees need review · 1 pending sync",
  forestIntegrity: {
    score: 76,
    trend: -3,
    grade: "Moderate",
    factors: [
      { label: "SAR ground alignment", value: 82, impact: "positive" },
      { label: "NDVI canopy health", value: 68, impact: "negative" },
      { label: "Compliance placement", value: 91, impact: "positive" },
      { label: "Survival rate (90d)", value: 74, impact: "neutral" },
    ],
    affectedProjects: ["p1", "p3"],
    recommendedActions: [
      "Inspect Chainage 142–148 NDVI drop",
      "Complete 12 survival surveys in Nagar Van Zone B",
    ],
  },
  priorities: [
    {
      id: "pr1",
      type: "alert",
      title: "Acute NDVI drop",
      subtitle: "NHAI KM-48 · Ch. 142–148",
      severity: "critical",
      action: "Investigate",
      target: "alert-detail",
      targetId: "a1",
    },
    {
      id: "pr2",
      type: "trees",
      title: "18 trees need attention",
      subtitle: "Stressed canopy · 3 projects",
      severity: "high",
      action: "View trees",
      target: "dashboard-attention",
    },
    {
      id: "pr3",
      type: "sync",
      title: "1 tree pending sync",
      subtitle: "Captured offline 2h ago",
      severity: "medium",
      action: "Sync now",
      target: "sync-queue",
    },
    {
      id: "pr4",
      type: "survey",
      title: "12 survival surveys due",
      subtitle: "Nagar Van Phase 2 · Zone B",
      severity: "medium",
      action: "Start",
      target: "field",
    },
  ],
  kpis: {
    totalTrees: 1248,
    pctHealthy: 84,
    openViolations: 3,
    unreadAlerts: 4,
    co2Stored: 28450,
    sitesMonitored: 8,
    evidenceGaps: 5,
    needsAttention: 82,
  },
  briefLines: [
    "NDVI dropped sharply at Chainage 142–148 — field inspection recommended within 48h.",
    "Forest integrity score 76/100 (−3 vs last week) driven by canopy stress in 2 work areas.",
    "CAMPA Block A fire watch active — 3 VIIRS detections within 25 km.",
  ],
  recentActivity: [
    {
      id: "act1",
      type: "tree",
      title: "Tree registered",
      detail: "ARX-NH-004822 · Khejri · Ch. 142–148",
      time: "1h ago",
      target: "tree-detail",
      targetId: "t2",
    },
    {
      id: "act2",
      type: "alert",
      title: "NDVI alert triggered",
      detail: "Chainage 142–148 · acute drop",
      time: "2h ago",
      target: "alert-detail",
      targetId: "a1",
    },
    {
      id: "act3",
      type: "evidence",
      title: "Evidence verified",
      detail: "CAMPA Block A · Compartment 3 batch",
      time: "5h ago",
      target: "reports",
    },
    {
      id: "act4",
      type: "monitoring",
      title: "Weekly scan completed",
      detail: "NHAI KM-48 · SAR aligned",
      time: "1d ago",
      target: "monitor",
    },
  ],
};

const MOCK_REGISTRATION_CONTEXT = {
  program: MOCK_PROGRAMS[0],
  scheme: MOCK_SCHEMES[0],
  project: MOCK_PROJECTS[0],
  workArea: "Chainage 142–148",
  workAreaId: "wa1",
  inherited: {
    pitSize: "60×60×60 cm",
    spacing: "6 m",
    guardType: "MS guard required",
    requirePitPhoto: true,
    chainageEnabled: true,
    minPhotos: 3,
    complianceMode: "strict",
    implementingAgency: "NHAI / Contractor XYZ",
    permitReference: "PCA/RJ/2024/0482",
  },
  suggestedNext: {
    chainageKm: 146.2,
    chainageLabel: "KM 146+200",
    latitude: 26.9128,
    longitude: 75.7878,
    workAreaName: "Chainage 142–148",
  },
  progress: { treeCount: 4821, targetTreeCount: 6000, progressPct: 80 },
};

const MOCK_TREES = [
  {
    id: "t1",
    code: "ARX-NH-004821",
    species: "Neem (Azadirachta indica)",
    project: "NHAI KM-48 Greenbelt",
    projectId: "p1",
    workArea: "Chainage 142–148",
    health: "good",
    sync: "synced",
    verified: true,
    needsAttention: false,
    photo:
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=400&fit=crop",
    lat: 26.9124,
    lng: 75.7873,
    chainage: "KM 146+000",
  },
  {
    id: "t2",
    code: "ARX-NH-004822",
    species: "Khejri",
    project: "NHAI KM-48 Greenbelt",
    projectId: "p1",
    workArea: "Chainage 142–148",
    health: "stressed",
    sync: "pending",
    verified: false,
    needsAttention: true,
    attentionReason: "NDVI drop · pending verification",
    photo:
      "https://images.unsplash.com/photo-1513836279014-a89f9a76ae07?w=400&h=400&fit=crop",
    lat: 26.9131,
    lng: 75.7881,
    chainage: "KM 146+150",
  },
  {
    id: "t3",
    code: "ARX-CA-009104",
    species: "Unidentified",
    project: "CAMPA Block A",
    projectId: "p2",
    workArea: "Compartment 3",
    health: "unknown",
    sync: "failed",
    verified: false,
    needsAttention: true,
    attentionReason: "Missing photo · sync failed",
    photo: null,
    lat: 27.0234,
    lng: 74.5521,
  },
  {
    id: "t4",
    code: "ARX-CA-009105",
    species: "Babul",
    project: "CAMPA Block A",
    projectId: "p2",
    workArea: "Compartment 3",
    health: "good",
    sync: "synced",
    verified: true,
    needsAttention: false,
    photo:
      "https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=400&h=400&fit=crop",
    lat: 27.024,
    lng: 74.553,
  },
  {
    id: "t5",
    code: "ARX-NV-000312",
    species: "Pilkhan",
    project: "Nagar Van Phase 2",
    projectId: "p3",
    workArea: "Zone B",
    health: "good",
    sync: "synced",
    verified: true,
    needsAttention: false,
    photo:
      "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=400&h=400&fit=crop",
    lat: 28.6139,
    lng: 77.209,
  },
  {
    id: "t6",
    code: "ARX-NV-000313",
    species: "Jamun",
    project: "Nagar Van Phase 2",
    projectId: "p3",
    workArea: "Zone B",
    health: "at_risk",
    sync: "synced",
    verified: true,
    needsAttention: true,
    attentionReason: "Survival survey due",
    photo:
      "https://images.unsplash.com/photo-1502082553048-f009c37126b9?w=400&h=400&fit=crop",
    lat: 28.6145,
    lng: 77.2102,
  },
];

const MOCK_ALERTS = [
  {
    id: "a1",
    severity: "critical",
    title: "Acute NDVI drop detected",
    context: "NHAI KM-48 · Chainage 142–148",
    time: "2h ago",
    action: "Inspect site",
    kind: "ndvi_acute_drop",
    projectId: "p1",
    body:
      "NDVI fell 0.18 vs 30-day baseline. Cloud cover 8%. Recommend field inspection within 48h.",
    affectedTrees: ["t1", "t2"],
    recommendedActions: ["Field inspect", "Capture evidence", "Mark reviewed"],
  },
  {
    id: "a2",
    severity: "high",
    title: "Fire watch — active detections nearby",
    context: "CAMPA Block A · 12 km NE",
    time: "5h ago",
    action: "View on map",
    kind: "fire_alert",
    projectId: "p2",
    body: "3 VIIRS detections within 25 km radius. Seasonal risk elevated.",
    affectedTrees: [],
    recommendedActions: ["View on map", "Notify field team"],
  },
  {
    id: "a3",
    severity: "medium",
    title: "Survival survey due",
    context: "12 trees · Nagar Van Phase 2",
    time: "1d ago",
    action: "Start surveys",
    kind: "survival_survey",
    projectId: "p3",
    body: "Trees planted 90 days ago require survival status update.",
    affectedTrees: ["t5", "t6"],
    recommendedActions: ["Start surveys", "Assign to field team"],
  },
  {
    id: "a4",
    severity: "low",
    title: "SAR integrity aligned",
    context: "NHAI KM-48 · All work areas",
    time: "3d ago",
    action: "View monitoring",
    kind: "sar_integrity_drop",
    projectId: "p1",
    body: "Monthly SAR sweep completed. No divergence detected.",
    affectedTrees: [],
    recommendedActions: ["View monitoring"],
  },
];

const MOCK_MONITOR = [
  {
    site: "NHAI KM-48 · Ch. 142–148",
    projectId: "p1",
    ndvi: 0.52,
    trend: "down",
    action: "Field inspect",
    stale: false,
    integrity: 72,
  },
  {
    site: "CAMPA Block A · Comp. 3",
    projectId: "p2",
    ndvi: 0.61,
    trend: "stable",
    action: "No action",
    stale: true,
    integrity: 85,
  },
  {
    site: "Nagar Van · Zone B",
    projectId: "p3",
    ndvi: 0.48,
    trend: "down",
    action: "Review alerts",
    stale: false,
    integrity: 64,
  },
];

const MOCK_EVIDENCE = {
  complete: 142,
  pending: 5,
  verified: 128,
  gaps: [
    { project: "NHAI KM-48", item: "Q1 plantation compliance bundle", status: "incomplete" },
    { project: "Nagar Van Phase 2", item: "Survival survey evidence (Zone B)", status: "due" },
  ],
};

// ── Scalable registry (1,248 trees — procedural, not 1,248 DOM nodes) ──

const REGISTRY_TOTAL = 1248;

const REGISTRY_STATS = {
  total: 1248,
  healthy: 1048,
  needsAttention: 82,
  missingEvidence: 16,
  notRecentlyMonitored: 31,
  unverified: 45,
};

const SPECIES_POOL = [
  "Neem (Azadirachta indica)",
  "Khejri (Prosopis cineraria)",
  "Babul (Vachellia nilotica)",
  "Pilkhan (Ficus virens)",
  "Jamun (Syzygium cumini)",
  "Arjun (Terminalia arjuna)",
  "Sheesham (Dalbergia sissoo)",
  "Unidentified",
];

const PHOTO_POOL = [
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=120&h=120&fit=crop",
  "https://images.unsplash.com/photo-1513836279014-a89f9a76ae07?w=120&h=120&fit=crop",
  "https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=120&h=120&fit=crop",
  "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=120&h=120&fit=crop",
  null,
];

const MOCK_FIELD_TASKS = [
  { id: "ft1", title: "Inspect NDVI drop", context: "Ch. 142–148 · 240m NE", type: "alert", priority: "critical" },
  { id: "ft2", title: "Survival survey", context: "12 trees · Zone B", type: "survey", priority: "medium" },
  { id: "ft3", title: "Capture pit evidence", context: "KM 146+350 · pending photo", type: "evidence", priority: "high" },
  { id: "ft4", title: "Verify placement", context: "3 unverified · nearby", type: "verify", priority: "medium" },
];

function registryCategoryForIndex(i) {
  if (i <= 6) {
    const t = MOCK_TREES[i - 1];
    if (t.needsAttention) return "attention";
    if (!t.verified) return "unverified";
    if (!t.photo) return "missing_evidence";
    return "healthy";
  }
  if (i % 17 < 2) return "attention";
  if (i % 78 === 0) return "missing_evidence";
  if (i % 40 === 0) return "stale_monitoring";
  if (i % 28 === 0) return "unverified";
  return "healthy";
}

function generateRegistryTree(index) {
  if (index >= 1 && index <= 6) return { ...MOCK_TREES[index - 1], registryIndex: index };
  const proj = MOCK_PROJECTS[index % 3];
  const healthRoll = index % 11;
  const health =
    healthRoll <= 7 ? "good" : healthRoll <= 9 ? "stressed" : healthRoll === 10 ? "at_risk" : "unknown";
  const hasPhoto = index % 13 !== 0;
  const prefix = proj.id === "p1" ? "NH" : proj.id === "p2" ? "CA" : "NV";
  return {
    id: `tree-${index}`,
    registryIndex: index,
    code: `ARX-${prefix}-${String(400000 + index).slice(-6)}`,
    species: SPECIES_POOL[index % SPECIES_POOL.length],
    project: proj.name,
    projectId: proj.id,
    workArea: proj.workAreas[index % proj.workAreas.length],
    health,
    sync: index % 97 === 0 ? "failed" : index % 23 === 0 ? "pending" : "synced",
    verified: index % 28 !== 0,
    needsAttention: registryCategoryForIndex(index) === "attention",
    attentionReason:
      registryCategoryForIndex(index) === "attention" ? "Monitoring flag · review needed" : null,
    photo: hasPhoto ? PHOTO_POOL[index % PHOTO_POOL.length] : null,
    lastMonitored: index % 40 === 0 ? "45d ago" : index % 8 === 0 ? "12d ago" : "3d ago",
    distanceM: 80 + (index % 900),
    lat: 26.91 + (index % 100) * 0.0001,
    lng: 75.78 + (index % 100) * 0.0001,
    category: registryCategoryForIndex(index),
  };
}

function getTreeById(id) {
  const featured = MOCK_TREES.find((t) => t.id === id);
  if (featured) return featured;
  const m = id.match(/^tree-(\d+)$/);
  if (m) return generateRegistryTree(parseInt(m[1], 10));
  return MOCK_TREES[0];
}

function queryRegistry(opts = {}) {
  const {
    search = "",
    category = "all",
    projectId = "all",
    page = 1,
    pageSize = 25,
    sort = "recent",
  } = opts;
  let indices = [];
  for (let i = 1; i <= REGISTRY_TOTAL; i++) {
    const cat = registryCategoryForIndex(i);
    if (category !== "all" && cat !== category) continue;
    const tree = generateRegistryTree(i);
    if (projectId !== "all" && tree.projectId !== projectId) continue;
    if (search) {
      const q = search.toLowerCase();
      if (
        !tree.code.toLowerCase().includes(q) &&
        !tree.species.toLowerCase().includes(q) &&
        !tree.workArea.toLowerCase().includes(q) &&
        !tree.project.toLowerCase().includes(q)
      )
        continue;
    }
    indices.push(i);
  }
  if (sort === "code") indices.sort((a, b) => a - b);
  else if (sort === "health") indices.sort((a, b) => registryCategoryForIndex(a).localeCompare(registryCategoryForIndex(b)));
  else if (sort === "proximity") indices.sort((a, b) => (a % 900) - (b % 900));
  else indices.sort((a, b) => b - a);
  const total = indices.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  const trees = indices.slice(start, start + pageSize).map((i) => generateRegistryTree(i));
  return { trees, total, page: safePage, pages, pageSize };
}
