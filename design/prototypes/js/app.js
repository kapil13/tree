/**
 * Aranyix Mobile UX Prototype — Interactive SPA
 * Navigation, screens, mock interactions
 */

const state = {
  screen: "welcome",
  history: [],
  tab: null,
  selectedTree: null,
  selectedAlert: null,
  registerStep: 1,
  registerPhotos: [],
  offline: false,
  projectFilter: "all",
  treeSearch: "",
  treeView: "grid",
  treeFilters: { health: "all", sync: "all", verified: "all" },
  mapSheetOpen: false,
  selectedMapPin: null,
  showFilterSheet: false,
  showProjectSheet: false,
  showPhotoViewer: false,
  photoViewerUrl: null,
  authTab: "email",
};

const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  field: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  back: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevron: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
};

const TAB_SCREENS = ["home", "map", "field", "monitor", "more"];

function syncIcon(sync) {
  if (sync === "synced") return "✓";
  if (sync === "pending") return "↻";
  return "!";
}

function healthBadge(h) {
  const map = {
    good: ["Healthy", "badge-ok"],
    stressed: ["Stressed", "badge-warn"],
    at_risk: ["At risk", "badge-danger"],
    unknown: ["Unknown", "badge-neutral"],
  };
  const [label, cls] = map[h] || ["—", "badge-neutral"];
  return `<span class="badge-status ${cls}">${label}</span>`;
}

function getFilteredTrees() {
  let trees = [...MOCK_TREES];
  if (state.projectFilter !== "all") {
    const proj = MOCK_PROJECTS.find((p) => p.id === state.projectFilter);
    if (proj) trees = trees.filter((t) => t.project === proj.name);
  }
  if (state.treeSearch) {
    const q = state.treeSearch.toLowerCase();
    trees = trees.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.species.toLowerCase().includes(q) ||
        t.workArea.toLowerCase().includes(q)
    );
  }
  if (state.treeFilters.health !== "all")
    trees = trees.filter((t) => t.health === state.treeFilters.health);
  if (state.treeFilters.sync !== "all")
    trees = trees.filter((t) => t.sync === state.treeFilters.sync);
  if (state.treeFilters.verified === "yes")
    trees = trees.filter((t) => t.verified);
  if (state.treeFilters.verified === "no")
    trees = trees.filter((t) => !t.verified);
  return trees;
}

function projectChip() {
  const name =
    state.projectFilter === "all"
      ? "All projects"
      : MOCK_PROJECTS.find((p) => p.id === state.projectFilter)?.name || "All";
  return `<button class="project-chip" onclick="openProjectSheet()" title="${name}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
    ${name.length > 20 ? name.slice(0, 18) + "…" : name}
  </button>`;
}

function appBar(title, opts = {}) {
  const { back, actions = "", transparent } = opts;
  return `<header class="app-bar${transparent ? " transparent" : ""}">
    ${back ? `<button class="app-bar-back" onclick="goBack()">${ICONS.back}</button>` : ""}
    <span class="app-bar-title">${title}</span>
    ${actions}
  </header>`;
}

function bottomNav() {
  const tabs = [
    { id: "home", label: "Home", icon: ICONS.home },
    { id: "map", label: "Map", icon: ICONS.map },
    { id: "field", label: "Field", icon: ICONS.field },
    { id: "monitor", label: "Monitor", icon: ICONS.monitor, badge: true },
    { id: "more", label: "More", icon: ICONS.more },
  ];
  return `<nav class="bottom-nav">
    ${tabs
      .map(
        (t) => `
      <button class="nav-item${state.tab === t.id ? " active" : ""}" onclick="navigateTab('${t.id}')">
        ${t.icon}
        <span>${t.label}</span>
        ${t.badge ? '<span class="nav-badge"></span>' : ""}
      </button>`
      )
      .join("")}
  </nav>`;
}

function offlineBanner() {
  return `<div class="offline-banner${state.offline ? "" : " hidden"}" id="offline-banner">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.58 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
    Offline — changes will sync when connected
  </div>`;
}

// ── Screen renderers ──────────────────────────────────────

function renderWelcome() {
  return `<div class="auth-screen">
    <div class="auth-logo">Aranyix</div>
    <div class="auth-tagline">Forest intelligence for field operations & MRV</div>
    <div style="flex:1"></div>
    <button class="btn btn-primary btn-block" onclick="navigate('login')">Sign in</button>
    <button class="btn btn-secondary btn-block" style="margin-top:12px" onclick="navigate('signup')">Create account</button>
    <p style="text-align:center;margin-top:24px;font-size:12px;color:var(--text-tertiary)">Prototype — tap Sign in to explore</p>
  </div>`;
}

function renderLogin() {
  return `<div class="auth-screen">
    ${appBar("Sign in", { back: true })}
    <div style="padding:0 8px">
      <div class="auth-tabs">
        <button class="auth-tab${state.authTab === "email" ? " active" : ""}" onclick="setAuthTab('email')">Email</button>
        <button class="auth-tab${state.authTab === "phone" ? " active" : ""}" onclick="setAuthTab('phone')">Phone OTP</button>
      </div>
      ${
        state.authTab === "email"
          ? `
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" placeholder="you@org.gov.in" value="field@demo.aranyix.in"></div>
        <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" value="••••••••"></div>
      `
          : `
        <div class="form-group"><label class="form-label">Mobile number</label><input class="form-input" type="tel" placeholder="+91 98765 43210"></div>
        <button class="btn btn-secondary btn-block btn-sm" style="margin-bottom:16px">Send OTP</button>
        <div class="form-group"><label class="form-label">OTP</label><input class="form-input" type="text" placeholder="6-digit code" maxlength="6"></div>
      `
      }
      <button class="btn btn-primary btn-block" onclick="enterApp()">Sign in</button>
      <p style="text-align:center;margin-top:16px;font-size:13px"><a href="#" style="color:var(--brand-canopy)" onclick="return false">Forgot password?</a></p>
    </div>
  </div>`;
}

function renderSignup() {
  return `<div class="auth-screen">
    ${appBar("Create account", { back: true })}
    <div style="padding:0 8px">
      <div class="form-group"><label class="form-label">Full name</label><input class="form-input" placeholder="Your name"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" placeholder="you@org.gov.in"></div>
      <div class="form-group"><label class="form-label">Organization</label><input class="form-input" placeholder="Forest department / NGO"></div>
      <button class="btn btn-primary btn-block" onclick="enterApp()">Continue</button>
    </div>
  </div>`;
}

function renderHome() {
  const pending = MOCK_TREES.filter((t) => t.sync === "pending").length;
  const criticalAlerts = MOCK_ALERTS.filter((a) => a.severity === "critical" || a.severity === "high").length;
  return `
    ${offlineBanner()}
    ${appBar("Today", {
      actions: `${projectChip()}<button class="app-bar-action" onclick="navigate('alerts')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>${criticalAlerts ? `<span class="badge">${criticalAlerts}</span>` : ""}</button>`,
    })}
    <div class="screen-body">
      <div class="greeting">Good morning, Rajesh</div>
      <div class="greeting-sub">Field supervisor · NHAI KM-48 Greenbelt</div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-value">4,821</div><div class="stat-label">Trees</div></div>
        <div class="stat-box"><div class="stat-value">2</div><div class="stat-label">Alerts</div></div>
        <div class="stat-box"><div class="stat-value">${pending}</div><div class="stat-label">Pending sync</div></div>
      </div>
      <div class="section-header"><span class="section-title">Action required</span></div>
      ${
        pending
          ? `<div class="action-card" onclick="navigate('sync-queue')">
          <div class="action-icon sync">↻</div>
          <div class="action-text"><div class="action-title">${pending} tree${pending > 1 ? "s" : ""} waiting to sync</div><div class="action-desc">Tap to review queue</div></div>
          ${ICONS.chevron}
        </div>`
          : ""
      }
      <div class="action-card" onclick="navigate('alerts')">
        <div class="action-icon alert">!</div>
        <div class="action-text"><div class="action-title">NDVI drop at Ch. 142–148</div><div class="action-desc">Inspect within 48 hours</div></div>
        ${ICONS.chevron}
      </div>
      <div class="action-card" onclick="startRegister()">
        <div class="action-icon field">+</div>
        <div class="action-text"><div class="action-title">Register tree</div><div class="action-desc">GPS + photo capture</div></div>
        ${ICONS.chevron}
      </div>
      <div class="section-header"><span class="section-title">Field queue</span><button class="section-link" onclick="navigate('field')">View all</button></div>
      <div class="card card-clickable" onclick="navigate('registry')">
        <div class="card-title">12 survival surveys due</div>
        <div class="card-meta">Nagar Van Phase 2 · Zone B</div>
      </div>
    </div>
    ${bottomNav()}`;
}

function renderMap() {
  const pins = MOCK_TREES.slice(0, 4).map((t, i) => ({
    ...t,
    left: [22, 45, 68, 35][i] + "%",
    top: [30, 55, 40, 70][i] + "%",
  }));
  return `
    ${offlineBanner()}
    <div class="screen-body no-pad" style="position:relative;flex:1;display:flex;flex-direction:column">
      <header class="app-bar" style="position:absolute;top:0;left:0;right:0;z-index:20;background:rgba(247,248,246,0.92);backdrop-filter:blur(8px)">
        <span class="app-bar-title">Map</span>
        ${projectChip()}
      </header>
      <div class="map-container">
        <div class="map-placeholder">
          <div class="map-grid"></div>
          ${pins
            .map(
              (p) => `
            <div class="map-pin tree${state.selectedMapPin === p.id ? " selected" : ""}" style="left:${p.left};top:${p.top}" onclick="selectMapPin('${p.id}')"></div>`
            )
            .join("")}
          <div class="map-pin alert" style="left:60%;top:25%" onclick="selectMapPin('alert')"></div>
          <div class="map-controls">
            <button class="map-ctrl-btn" title="My location">◎</button>
            <button class="map-ctrl-btn" title="Zoom in">+</button>
          </div>
          <div class="map-layers">
            <span class="layer-chip active">Trees</span>
            <span class="layer-chip active">Work areas</span>
            <span class="layer-chip">Alerts</span>
          </div>
        </div>
        <div class="map-sheet${state.mapSheetOpen ? " open" : ""}" id="map-sheet">
          ${renderMapSheet()}
        </div>
      </div>
      <button class="fab" onclick="startRegister()" title="Register here">+</button>
    </div>
    ${bottomNav()}`;
}

function renderMapSheet() {
  if (!state.selectedMapPin) return "";
  if (state.selectedMapPin === "alert") {
    const a = MOCK_ALERTS[0];
    return `
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:4px;background:var(--status-danger);border-radius:2px;align-self:stretch"></div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:4px">${a.title}</div>
          <div style="font-size:13px;color:var(--text-secondary)">${a.context}</div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary btn-sm" onclick="navigate('alert-detail','${a.id}')">View alert</button>
            <button class="btn btn-secondary btn-sm" onclick="closeMapSheet()">Close</button>
          </div>
        </div>
      </div>`;
  }
  const t = MOCK_TREES.find((x) => x.id === state.selectedMapPin);
  if (!t) return "";
  return `
    <div style="display:flex;gap:12px">
      ${t.photo ? `<img class="map-sheet-photo" src="${t.photo}" alt="">` : `<div class="map-sheet-photo" style="display:flex;align-items:center;justify-content:center;color:var(--text-tertiary)">🌳</div>`}
      <div style="flex:1;min-width:0">
        <div class="tree-code">${t.code}</div>
        <div style="font-weight:600;font-size:15px">${t.species}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin:4px 0">${t.workArea}</div>
        ${healthBadge(t.health)}
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary btn-sm" onclick="openTree('${t.id}')">Details</button>
          <button class="btn btn-secondary btn-sm" onclick="closeMapSheet()">Close</button>
        </div>
      </div>
    </div>`;
}

function renderField() {
  return `
    ${offlineBanner()}
    ${appBar("Field", { actions: projectChip() })}
    <div class="screen-body">
      <div class="field-actions">
        <div class="field-action" onclick="startRegister()">
          <div class="field-action-icon">🌱</div>
          <div class="field-action-title">Register tree</div>
          <div class="field-action-desc">GPS + photos</div>
        </div>
        <div class="field-action" onclick="showToast('Survival survey flow')">
          <div class="field-action-icon">📋</div>
          <div class="field-action-title">Survival survey</div>
          <div class="field-action-desc">Due trees</div>
        </div>
        <div class="field-action" onclick="showToast('Bioacoustic capture')">
          <div class="field-action-icon">🎙</div>
          <div class="field-action-title">Bioacoustic</div>
          <div class="field-action-desc">Record & upload</div>
        </div>
        <div class="field-action" onclick="showToast('Plot visit checklist')">
          <div class="field-action-icon">📍</div>
          <div class="field-action-title">Plot visit</div>
          <div class="field-action-desc">Monitoring visit</div>
        </div>
      </div>
      <div class="section-header">
        <span class="section-title">Tree registry</span>
        <button class="section-link" onclick="navigate('registry')">View all ${MOCK_TREES.length}</button>
      </div>
      <div class="tree-grid" style="margin-bottom:16px">
        ${MOCK_TREES.slice(0, 4)
          .map((t) => renderTreeCard(t))
          .join("")}
      </div>
      <div class="section-header"><span class="section-title">Sync status</span></div>
      <div class="card card-clickable" onclick="navigate('sync-queue')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div class="card-title">1 pending · 1 failed</div><div class="card-meta">Last sync 12 min ago</div></div>
          <span class="badge-status badge-warn">↻ Retry</span>
        </div>
      </div>
    </div>
    ${bottomNav()}`;
}

function renderTreeCard(t) {
  return `<div class="tree-card" onclick="openTree('${t.id}')">
    <div class="tree-card-photo">
      ${t.photo ? `<img src="${t.photo}" alt="" loading="lazy" onclick="event.stopPropagation();openPhotoViewer('${t.photo}')">` : `<div class="no-photo"><span style="font-size:24px">🌳</span><span>No photo</span></div>`}
      <span class="tree-card-sync sync-${t.sync}">${syncIcon(t.sync)}</span>
    </div>
    <div class="tree-card-body">
      <div class="tree-code">${t.code}</div>
      <div class="tree-species">${t.species}</div>
      <div class="tree-meta">${healthBadge(t.health)}${t.verified ? '<span class="badge-status badge-ok">Verified</span>' : '<span class="badge-status badge-neutral">Unverified</span>'}</div>
    </div>
  </div>`;
}

function renderTreeListItem(t) {
  return `<div class="tree-list-item" onclick="openTree('${t.id}')">
    ${t.photo ? `<img class="tree-list-photo" src="${t.photo}" alt="">` : `<div class="tree-list-photo" style="display:flex;align-items:center;justify-content:center;font-size:20px">🌳</div>`}
    <div class="tree-list-info">
      <div class="tree-code">${t.code}</div>
      <div class="tree-species">${t.species}</div>
      <div style="font-size:12px;color:var(--text-secondary)">${t.workArea}</div>
      <div class="tree-meta" style="margin-top:4px">${healthBadge(t.health)} <span class="badge-status sync-${t.sync === "synced" ? "badge-ok" : t.sync === "pending" ? "badge-warn" : "badge-danger"}">${t.sync}</span></div>
    </div>
  </div>`;
}

function renderRegistry() {
  const trees = getFilteredTrees();
  return `
    ${offlineBanner()}
    ${appBar("Tree registry", { back: true, actions: projectChip() })}
    <div class="screen-body">
      <div class="registry-toolbar">
        <input class="search-input" placeholder="Search code, species…" value="${state.treeSearch}" oninput="setTreeSearch(this.value)">
        <button class="filter-btn" onclick="openFilterSheet()" title="Filter">☰</button>
        <div class="view-toggle">
          <button class="${state.treeView === "grid" ? "active" : ""}" onclick="setTreeView('grid')">▦</button>
          <button class="${state.treeView === "list" ? "active" : ""}" onclick="setTreeView('list')">≡</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">${trees.length} trees</div>
      ${
        trees.length === 0
          ? `<div class="empty-state"><div class="empty-icon">🌳</div><div class="empty-title">No trees found</div><p>Try adjusting filters or search</p></div>`
          : state.treeView === "grid"
            ? `<div class="tree-grid">${trees.map((t) => renderTreeCard(t)).join("")}</div>`
            : trees.map((t) => renderTreeListItem(t)).join("")
      }
    </div>
    <button class="fab" onclick="startRegister()">+</button>`;
}

function renderTreeDetail() {
  const t = state.selectedTree || MOCK_TREES[0];
  return `
    ${offlineBanner()}
    <div class="screen-body no-pad" style="flex:1;overflow-y:auto">
      <div class="tree-hero">
        ${t.photo ? `<img src="${t.photo}" alt="" onclick="openPhotoViewer('${t.photo}')">` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:64px;background:var(--bg-subtle)">🌳</div>`}
        <button class="app-bar-back" style="position:absolute;top:48px;left:8px;background:rgba(0,0,0,0.4);color:white;border-radius:50%" onclick="goBack()">${ICONS.back}</button>
        <div class="tree-hero-overlay">
          <div class="tree-hero-code">${t.code}</div>
          <div class="tree-hero-species">${t.species}</div>
        </div>
      </div>
      <div style="padding:16px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
          ${healthBadge(t.health)}
          ${t.verified ? '<span class="badge-status badge-ok">✓ Verified</span>' : '<span class="badge-status badge-warn">Pending verification</span>'}
          <span class="badge-status ${t.sync === "synced" ? "badge-ok" : t.sync === "pending" ? "badge-warn" : "badge-danger"}">${t.sync}</span>
        </div>
        <div class="detail-section">
          <div class="section-title" style="margin-bottom:8px">Location & context</div>
          <div class="detail-row"><span class="detail-label">Project</span><span class="detail-value">${t.project}</span></div>
          <div class="detail-row"><span class="detail-label">Work area</span><span class="detail-value">${t.workArea}</span></div>
          <div class="detail-row"><span class="detail-label">Coordinates</span><span class="detail-value" style="font-family:var(--font-mono);font-size:12px">${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}</span></div>
        </div>
        <div class="detail-section">
          <div class="section-title" style="margin-bottom:8px">Monitoring</div>
          <div class="detail-row"><span class="detail-label">NDVI (30d)</span><span class="detail-value">0.52 ↓</span></div>
          <div class="detail-row"><span class="detail-label">Last scan</span><span class="detail-value">2 days ago</span></div>
          <div class="detail-row"><span class="detail-label">Integrity</span><span class="detail-value">Aligned</span></div>
        </div>
        <div class="detail-section">
          <div class="section-title" style="margin-bottom:8px">Timeline</div>
          <div class="timeline-item"><div class="timeline-dot"></div><div><div style="font-weight:500">Registered</div><div style="font-size:12px;color:var(--text-secondary)">12 Mar 2025 · Field capture</div></div></div>
          <div class="timeline-item"><div class="timeline-dot"></div><div><div style="font-weight:500">Verified</div><div style="font-size:12px;color:var(--text-secondary)">15 Mar 2025 · Supervisor review</div></div></div>
          <div class="timeline-item"><div class="timeline-dot"></div><div><div style="font-weight:500">NDVI alert</div><div style="font-size:12px;color:var(--text-secondary)">2h ago · Acute drop detected</div></div></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px">
          <button class="btn btn-primary" style="flex:1" onclick="navigate('map')">View on map</button>
          <button class="btn btn-secondary" style="flex:1" onclick="showToast('Survival survey')">Survey</button>
        </div>
      </div>
    </div>`;
}

function renderRegister() {
  const step = state.registerStep;
  let body = "";
  if (step === 1) {
    body = `
      <div class="gps-card">
        <div class="gps-status">
          <span style="color:var(--status-ok)">●</span>
          <strong>GPS locked</strong>
          <span class="gps-accuracy">±4.2 m</span>
        </div>
        <div class="mini-map"><div class="mini-map-pin"></div></div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-secondary)">Work area: <strong>Chainage 142–148</strong> (auto-detected)</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;padding:0" onclick="showToast('Adjust pin on map')">Adjust location on map</button>
      </div>
      <div class="compliance-result compliance-pass">✓ Placement within work area boundary</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Project context from workspace: NHAI KM-48 Greenbelt</p>
      <button class="btn btn-primary btn-block" onclick="setRegisterStep(2)">Continue to evidence</button>`;
  } else if (step === 2) {
    const slots = [0, 1, 2].map((i) => {
      const photo = state.registerPhotos[i];
      if (photo)
        return `<div class="photo-slot filled"><img src="${photo}" alt=""><span style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.5);color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer" onclick="removeRegisterPhoto(${i})">×</span></div>`;
      return `<div class="photo-slot" onclick="addRegisterPhoto(${i})"><span style="font-size:24px">📷</span><span>Add photo</span></div>`;
    });
    body = `
      <p style="margin-bottom:16px;font-size:14px;color:var(--text-secondary)">Capture at least 2 photos. Species suggestion runs after capture.</p>
      <div class="photo-capture-grid" style="position:relative">${slots.join("")}</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="addRegisterPhoto(state.registerPhotos.length)">📷 Camera</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="showToast('Gallery picker')">🖼 Gallery</button>
      </div>
      <button class="btn btn-primary btn-block" onclick="setRegisterStep(3)" ${state.registerPhotos.length < 1 ? "disabled style='opacity:0.5'" : ""}>Continue to confirm</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="setRegisterStep(1)">Back</button>`;
  } else {
    body = `
      <div style="display:flex;gap:8px;margin-bottom:16px;overflow-x:auto">
        ${state.registerPhotos.map((p) => `<img src="${p}" style="width:72px;height:72px;border-radius:8px;object-fit:cover" alt="">`).join("")}
      </div>
      <div class="compliance-result compliance-pass">✓ Work area: Chainage 142–148</div>
      <div class="form-group">
        <label class="form-label">Species (AI suggested)</label>
        <input class="form-input" value="Neem (Azadirachta indica)" placeholder="Search species…">
        <p style="font-size:12px;color:var(--text-tertiary);margin-top:4px">Suggested from photo · tap to change</p>
      </div>
      ${state.offline ? `<div class="compliance-result compliance-warn">Offline — tree will queue for sync</div>` : ""}
      <button class="btn btn-primary btn-block" onclick="submitRegister()">${state.offline ? "Save offline" : "Submit registration"}</button>
      <button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="submitRegister(true)">Register next in area</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="setRegisterStep(2)">Back</button>`;
  }
  return `
    ${offlineBanner()}
    ${appBar("Register tree", { back: true })}
    <div class="step-indicator">
      ${[1, 2, 3].map((s) => `<div class="step-dot${step === s ? " active" : ""}"></div>`).join("")}
    </div>
    <div class="screen-body">
      <div style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary)">Step ${step} of 3</div>
        <div style="font-size:17px;font-weight:600">${step === 1 ? "Place & context" : step === 2 ? "Evidence" : "Confirm & submit"}</div>
      </div>
      ${body}
    </div>`;
}

function renderMonitor() {
  return `
    ${offlineBanner()}
    ${appBar("Monitor", { actions: `${projectChip()}<button class="app-bar-action" onclick="navigate('alerts')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg><span class="badge">2</span></button>` })}
    <div class="screen-body">
      <div class="section-header"><span class="section-title">Action required</span><button class="section-link" onclick="navigate('alerts')">All alerts</button></div>
      ${MOCK_ALERTS.slice(0, 2)
        .map(
          (a) => `
        <div class="monitor-card" onclick="navigate('alert-detail','${a.id}')">
          <div class="severity-stripe severity-${a.severity}"></div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:15px">${a.title}</div>
            <div style="font-size:13px;color:var(--text-secondary)">${a.context}</div>
            <button class="btn btn-primary btn-sm" style="margin-top:10px">${a.action}</button>
          </div>
        </div>`
        )
        .join("")}
      <div class="section-header"><span class="section-title">Site health</span></div>
      ${MOCK_MONITOR.map((m) => {
        const ndviPct = Math.round(m.ndvi * 100);
        const cls = m.ndvi >= 0.55 ? "ndvi-high" : m.ndvi >= 0.45 ? "ndvi-mid" : "ndvi-low";
        return `
        <div class="card" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div class="card-title">${m.site}</div>
              <div class="card-meta">NDVI ${m.ndvi.toFixed(2)} ${m.trend === "down" ? "↓" : m.trend === "up" ? "↑" : "→"}${m.stale ? " · <span style='color:var(--status-warn)'>Stale scan</span>" : ""}</div>
            </div>
            <span class="badge-status ${m.action === "No action" ? "badge-ok" : "badge-warn"}">${m.action}</span>
          </div>
          <div class="ndvi-bar"><div class="ndvi-fill ${cls}" style="width:${ndviPct}%"></div></div>
        </div>`;
      }).join("")}
      <div class="section-header"><span class="section-title">Hazards</span></div>
      <div class="card">
        <div class="card-title">Fire watch — CAMPA Block A</div>
        <div class="card-meta">3 detections within 25 km · Elevated seasonal risk</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('map')">View on map</button>
      </div>
    </div>
    ${bottomNav()}`;
}

function renderAlerts() {
  return `
    ${offlineBanner()}
    ${appBar("Alerts", { back: true })}
    <div class="screen-body">
      <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
        <span class="filter-chip selected">All</span>
        <span class="filter-chip">Critical</span>
        <span class="filter-chip">NDVI</span>
        <span class="filter-chip">Fire</span>
        <span class="filter-chip">Survey</span>
      </div>
      ${MOCK_ALERTS.map((a) => renderAlertItem(a)).join("")}
    </div>`;
}

function renderAlertItem(a) {
  return `<div class="alert-item" onclick="navigate('alert-detail','${a.id}')">
    <div class="severity-stripe severity-${a.severity}"></div>
    <div class="alert-content">
      <div class="alert-title">${a.title}</div>
      <div class="alert-context">${a.context}</div>
      <div class="alert-time">${a.time}</div>
    </div>
    ${ICONS.chevron}
  </div>`;
}

function renderAlertDetail() {
  const a = state.selectedAlert || MOCK_ALERTS[0];
  return `
    ${offlineBanner()}
    ${appBar("Alert", { back: true })}
    <div class="screen-body">
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <div class="severity-stripe severity-${a.severity}" style="width:6px;border-radius:3px"></div>
        <div>
          <span class="badge-status badge-${a.severity === "critical" ? "danger" : a.severity === "high" ? "warn" : "info"}">${a.severity}</span>
          <h2 style="font-size:20px;font-weight:600;margin:8px 0 4px">${a.title}</h2>
          <div style="font-size:13px;color:var(--text-secondary)">${a.context} · ${a.time}</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px">
        <p style="font-size:14px;line-height:1.6">${a.body}</p>
      </div>
      <div class="section-title" style="margin-bottom:12px">Recommended action</div>
      <button class="btn btn-primary btn-block" onclick="navigate('map')">${a.action}</button>
      <button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="showToast('Marked as reviewed')">Mark reviewed</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="openTree('t1')">View affected trees</button>
    </div>`;
}

function renderMore() {
  return `
    ${offlineBanner()}
    ${appBar("More")}
    <div class="screen-body">
      <div class="more-section">
        <div class="more-section-title">Workspace</div>
        <button class="more-item" onclick="navigate('projects')"><span class="more-item-icon">📁</span> Projects<span class="more-item-chevron">${ICONS.chevron}</span></button>
        <button class="more-item" onclick="navigate('sync-queue')"><span class="more-item-icon">↻</span> Field queue & sync<span class="more-item-chevron">${ICONS.chevron}</span></button>
      </div>
      <div class="more-section">
        <div class="more-section-title">Intelligence</div>
        <button class="more-item" onclick="navigateTab('monitor')"><span class="more-item-icon">📊</span> Monitoring portfolio<span class="more-item-chevron">${ICONS.chevron}</span></button>
        <button class="more-item" onclick="navigate('alerts')"><span class="more-item-icon">🔔</span> Alert inbox<span class="more-item-chevron">${ICONS.chevron}</span></button>
        <button class="more-item" onclick="showToast('Bioacoustic library')"><span class="more-item-icon">🎙</span> Bioacoustic<span class="more-item-chevron">${ICONS.chevron}</span></button>
      </div>
      <div class="more-section">
        <div class="more-section-title">Compliance & MRV</div>
        <button class="more-item" onclick="navigate('reports')"><span class="more-item-icon">📄</span> Reports & exports<span class="more-item-chevron">${ICONS.chevron}</span></button>
      </div>
      <div class="more-section">
        <div class="more-section-title">Carbon & credits</div>
        <button class="more-item" onclick="navigate('carbon')"><span class="more-item-icon">🌿</span> Carbon overview<span class="more-item-chevron">${ICONS.chevron}</span></button>
        <button class="more-item" onclick="navigate('credits')"><span class="more-item-icon">💳</span> Credit ledger<span class="more-item-chevron">${ICONS.chevron}</span></button>
      </div>
      <div class="more-section">
        <div class="more-section-title">Tools</div>
        <button class="more-item" onclick="navigate('assistant')"><span class="more-item-icon">✨</span> AI Assistant<span class="more-item-chevron">${ICONS.chevron}</span></button>
      </div>
      <div class="more-section">
        <div class="more-section-title">Account</div>
        <button class="more-item" onclick="navigate('profile')"><span class="more-item-icon">👤</span> Profile<span class="more-item-chevron">${ICONS.chevron}</span></button>
        <button class="more-item" onclick="navigate('settings')"><span class="more-item-icon">⚙</span> Settings<span class="more-item-chevron">${ICONS.chevron}</span></button>
        <button class="more-item" onclick="navigate('welcome')" style="color:var(--status-danger)"><span class="more-item-icon">↪</span> Sign out</button>
      </div>
    </div>
    ${bottomNav()}`;
}

function renderProjects() {
  return `
    ${appBar("Projects", { back: true })}
    <div class="screen-body">
      ${MOCK_PROJECTS.map(
        (p) => `
        <div class="card card-clickable" style="margin-bottom:8px" onclick="navigate('project-detail','${p.id}')">
          <div class="card-title">${p.name}</div>
          <div class="card-meta">${p.segment} · ${p.trees.toLocaleString()} trees</div>
        </div>`
      ).join("")}
    </div>`;
}

function renderProjectDetail() {
  const p = MOCK_PROJECTS.find((x) => x.id === state.selectedMapPin) || MOCK_PROJECTS[0];
  return `
    ${appBar(p.name, { back: true })}
    <div class="screen-body">
      <div class="stats-row">
        <div class="stat-box"><div class="stat-value">${p.trees.toLocaleString()}</div><div class="stat-label">Trees</div></div>
        <div class="stat-box"><div class="stat-value">3</div><div class="stat-label">Work areas</div></div>
        <div class="stat-box"><div class="stat-value">2</div><div class="stat-label">Alerts</div></div>
      </div>
      <div class="section-header"><span class="section-title">Work areas</span></div>
      <div class="card" style="margin-bottom:8px"><div class="card-title">Chainage 142–148</div><div class="card-meta">1,204 trees · NDVI 0.52</div></div>
      <div class="card" style="margin-bottom:8px"><div class="card-title">Chainage 148–155</div><div class="card-meta">892 trees · NDVI 0.58</div></div>
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="setProject('${p.id}');goBack()">Set as active project</button>
    </div>`;
}

function renderSyncQueue() {
  const pending = MOCK_TREES.filter((t) => t.sync !== "synced");
  return `
    ${appBar("Sync queue", { back: true })}
    <div class="screen-body">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Last sync: 12 min ago</div>
        <div class="card-meta">Wi-Fi · Auto-sync enabled</div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="showToast('Syncing…')">Sync now</button>
      </div>
      ${pending.length ? pending.map((t) => renderTreeListItem(t)).join("") : `<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-title">All synced</div></div>`}
    </div>`;
}

function renderReports() {
  return `
    ${appBar("Reports", { back: true })}
    <div class="screen-body">
      <div class="card card-clickable" style="margin-bottom:8px"><div class="card-title">Plantation compliance report</div><div class="card-meta">NHAI KM-48 · PDF · Mar 2025</div></div>
      <div class="card card-clickable" style="margin-bottom:8px"><div class="card-title">Survival survey summary</div><div class="card-meta">Nagar Van · CSV · Feb 2025</div></div>
      <div class="card card-clickable" style="margin-bottom:8px"><div class="card-title">MRV evidence bundle</div><div class="card-meta">CAMPA Block A · ZIP · Jan 2025</div></div>
      <button class="btn btn-secondary btn-block" style="margin-top:16px" onclick="showToast('Export wizard')">Request new export</button>
    </div>`;
}

function renderCarbon() {
  return `
    ${appBar("Carbon", { back: true })}
    <div class="screen-body">
      <div class="card" style="margin-bottom:16px;text-align:center;padding:24px">
        <div class="metric-large">12,480</div>
        <div class="metric-unit">tCO₂e estimated (portfolio)</div>
        <div class="progress-bar" style="margin-top:16px"><div class="progress-fill" style="width:68%"></div></div>
        <div style="font-size:12px;color:var(--text-secondary)">68% of annual projection</div>
      </div>
      <div class="section-header"><span class="section-title">By project</span></div>
      ${MOCK_PROJECTS.map((p) => `<div class="detail-row"><span class="detail-label">${p.name}</span><span class="detail-value">${Math.round(p.trees * 2.6).toLocaleString()} tCO₂e</span></div>`).join("")}
    </div>`;
}

function renderCredits() {
  return `
    ${appBar("Credit ledger", { back: true })}
    <div class="screen-body">
      <div class="card" style="margin-bottom:16px">
        <div class="metric-large" style="font-size:24px">2,450</div>
        <div class="metric-unit">Credits issued · VM0047</div>
      </div>
      <div class="timeline-item"><div class="timeline-dot"></div><div><div style="font-weight:500">Issuance batch #12</div><div style="font-size:12px;color:var(--text-secondary)">450 credits · 1 Mar 2025</div></div></div>
      <div class="timeline-item"><div class="timeline-dot"></div><div><div style="font-weight:500">Verification complete</div><div style="font-size:12px;color:var(--text-secondary)">Batch #11 · 15 Feb 2025</div></div></div>
    </div>`;
}

function renderAssistant() {
  return `
    ${appBar("AI Assistant", { back: true })}
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
      <div class="chat-messages">
        <div class="chat-bubble assistant">Hello Rajesh. I can help with species ID, compliance questions, and monitoring summaries for your active projects.</div>
        <div class="chat-bubble user">What's the NDVI trend at Chainage 142–148?</div>
        <div class="chat-bubble assistant">NDVI at Chainage 142–148 dropped 0.18 vs the 30-day baseline (now 0.52). Cloud cover was 8% on the last scan. I recommend a field inspection within 48 hours. <button class="btn btn-ghost btn-sm" style="margin-top:8px;padding:0" onclick="navigate('alert-detail','a1')">View alert →</button></div>
      </div>
      <div class="chat-input-bar">
        <input class="chat-input" placeholder="Ask about trees, compliance, monitoring…">
        <button class="btn btn-primary btn-sm" onclick="showToast('Message sent')">Send</button>
      </div>
    </div>`;
}

function renderProfile() {
  return `
    ${appBar("Profile", { back: true })}
    <div class="screen-body">
      <div style="text-align:center;padding:24px 0">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--brand-forest);color:white;font-size:28px;font-weight:600;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">RK</div>
        <div style="font-size:18px;font-weight:600">Rajesh Kumar</div>
        <div style="font-size:14px;color:var(--text-secondary)">Field Supervisor</div>
        <div style="font-size:13px;color:var(--text-tertiary);margin-top:4px">NHAI Greenbelt Programme</div>
      </div>
      <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">field@demo.aranyix.in</span></div>
      <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">+91 98765 43210</span></div>
      <div class="detail-row"><span class="detail-label">Organization</span><span class="detail-value">Demo Forest Dept</span></div>
      <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value">Supervisor</span></div>
    </div>`;
}

function renderSettings() {
  return `
    ${appBar("Settings", { back: true })}
    <div class="screen-body">
      <div class="section-title" style="margin-bottom:12px">Sync & offline</div>
      <div class="settings-item"><span class="settings-label">Auto-sync on Wi-Fi</span><button class="toggle on" onclick="this.classList.toggle('on')"></button></div>
      <div class="settings-item"><span class="settings-label">Last sync</span><span class="settings-value">12 min ago</span></div>
      <div class="section-title" style="margin:24px 0 12px">Preferences</div>
      <div class="settings-item"><span class="settings-label">Language</span><span class="settings-value">English</span></div>
      <div class="settings-item"><span class="settings-label">Biometric unlock</span><button class="toggle" onclick="this.classList.toggle('on')"></button></div>
      <div class="settings-item"><span class="settings-label">Notifications</span><button class="toggle on" onclick="this.classList.toggle('on')"></button></div>
      <div class="section-title" style="margin:24px 0 12px">Prototype</div>
      <div class="settings-item"><span class="settings-label">Simulate offline</span><button class="toggle${state.offline ? " on" : ""}" onclick="toggleOffline()"></button></div>
      <button class="btn btn-danger btn-block" style="margin-top:24px" onclick="openDialog('clear-queue')">Clear failed sync queue</button>
    </div>`;
}

function renderEmpty() {
  return `
    ${appBar("Empty state demo", { back: true })}
    <div class="screen-body">
      <div class="empty-state">
        <div class="empty-icon">🌳</div>
        <div class="empty-title">No trees in this project</div>
        <p style="margin:8px 0 20px">Register your first tree to start building the registry.</p>
        <button class="btn btn-primary" onclick="startRegister()">Register tree</button>
      </div>
    </div>`;
}

function renderLoading() {
  return `
    ${appBar("Loading demo", { back: true })}
    <div class="screen-body">
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton" style="height:48px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:48px"></div>
    </div>`;
}

const SCREEN_RENDERERS = {
  welcome: renderWelcome,
  login: renderLogin,
  signup: renderSignup,
  home: renderHome,
  map: renderMap,
  field: renderField,
  registry: renderRegistry,
  "tree-detail": renderTreeDetail,
  register: renderRegister,
  monitor: renderMonitor,
  alerts: renderAlerts,
  "alert-detail": renderAlertDetail,
  more: renderMore,
  projects: renderProjects,
  "project-detail": renderProjectDetail,
  "sync-queue": renderSyncQueue,
  reports: renderReports,
  carbon: renderCarbon,
  credits: renderCredits,
  assistant: renderAssistant,
  profile: renderProfile,
  settings: renderSettings,
  empty: renderEmpty,
  loading: renderLoading,
};

function render() {
  const container = document.getElementById("screen-container");
  const renderer = SCREEN_RENDERERS[state.screen];
  if (renderer) {
    container.innerHTML = `<div class="screen active" id="current-screen">${renderer()}</div>`;
  }
  renderOverlays();
  updateProtoControls();
}

function renderOverlays() {
  const filterEl = document.getElementById("filter-overlay");
  if (filterEl) {
    filterEl.className = `overlay${state.showFilterSheet ? " open" : ""}`;
    filterEl.innerHTML = state.showFilterSheet ? renderFilterSheet() : "";
  }
  const projectEl = document.getElementById("project-overlay");
  if (projectEl) {
    projectEl.className = `overlay${state.showProjectSheet ? " open" : ""}`;
    projectEl.innerHTML = state.showProjectSheet ? renderProjectSheet() : "";
  }
  const photoEl = document.getElementById("photo-viewer");
  if (photoEl) {
    photoEl.className = `photo-viewer${state.showPhotoViewer ? " open" : ""}`;
    if (state.showPhotoViewer && state.photoViewerUrl) {
      photoEl.innerHTML = `<button class="photo-viewer-close" onclick="closePhotoViewer()">×</button><img src="${state.photoViewerUrl}" alt="">`;
    }
  }
}

function renderFilterSheet() {
  return `<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Filter trees</div>
    <div class="filter-group"><label>Health</label><div class="filter-chips">
      ${["all", "good", "stressed", "at_risk"].map((h) => `<span class="filter-chip${state.treeFilters.health === h ? " selected" : ""}" onclick="setFilter('health','${h}')">${h === "all" ? "All" : h.replace("_", " ")}</span>`).join("")}
    </div></div>
    <div class="filter-group"><label>Sync</label><div class="filter-chips">
      ${["all", "synced", "pending", "failed"].map((s) => `<span class="filter-chip${state.treeFilters.sync === s ? " selected" : ""}" onclick="setFilter('sync','${s}')">${s}</span>`).join("")}
    </div></div>
    <div class="filter-group"><label>Verification</label><div class="filter-chips">
      ${["all", "yes", "no"].map((v) => `<span class="filter-chip${state.treeFilters.verified === v ? " selected" : ""}" onclick="setFilter('verified','${v}')">${v === "all" ? "All" : v === "yes" ? "Verified" : "Unverified"}</span>`).join("")}
    </div></div>
    <button class="btn btn-primary btn-block" onclick="closeFilterSheet()">Apply</button>
  </div>`;
}

function renderProjectSheet() {
  return `<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Active project</div>
    <button class="more-item" onclick="setProject('all')"><span>All projects</span>${state.projectFilter === "all" ? "✓" : ""}</button>
    ${MOCK_PROJECTS.map((p) => `<button class="more-item" onclick="setProject('${p.id}')"><span>${p.name}</span>${state.projectFilter === p.id ? "✓" : ""}</button>`).join("")}
  </div>`;
}

// ── Navigation ────────────────────────────────────────────

function navigate(screen, param) {
  state.history.push({ screen: state.screen, tab: state.tab });
  state.screen = screen;
  if (screen === "alert-detail" && param) {
    state.selectedAlert = MOCK_ALERTS.find((a) => a.id === param);
  }
  if (screen === "project-detail" && param) {
    state.selectedMapPin = param;
  }
  if (!TAB_SCREENS.includes(screen)) state.tab = null;
  render();
}

function navigateTab(tab) {
  state.tab = tab;
  state.screen = tab;
  state.history = [];
  render();
}

function goBack() {
  const prev = state.history.pop();
  if (prev) {
    state.screen = prev.screen;
    state.tab = prev.tab;
  } else if (state.tab) {
    state.screen = state.tab;
  } else {
    state.screen = "welcome";
  }
  render();
}

function enterApp() {
  state.tab = "home";
  state.screen = "home";
  state.history = [];
  render();
}

function openTree(id) {
  state.selectedTree = MOCK_TREES.find((t) => t.id === id);
  navigate("tree-detail");
}

function startRegister() {
  state.registerStep = 1;
  state.registerPhotos = [];
  navigate("register");
}

function setRegisterStep(n) {
  state.registerStep = n;
  render();
}

function addRegisterPhoto(i) {
  const urls = [
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1513836279014-a89f9a76ae07?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=400&h=400&fit=crop",
  ];
  if (state.registerPhotos.length < 3) {
    state.registerPhotos.push(urls[state.registerPhotos.length % urls.length]);
  }
  render();
}

function removeRegisterPhoto(i) {
  state.registerPhotos.splice(i, 1);
  render();
}

function submitRegister(registerNext) {
  if (state.offline) {
    showToast("Saved offline — will sync when connected");
  } else {
    showToast("Tree registered successfully");
  }
  if (registerNext) {
    state.registerStep = 1;
    state.registerPhotos = [];
    render();
  } else {
    state.selectedTree = { ...MOCK_TREES[0], code: "ARX-NH-NEW001", species: "Neem (suggested)", sync: state.offline ? "pending" : "synced" };
    state.screen = "tree-detail";
    state.history = [{ screen: "field", tab: "field" }];
    render();
  }
}

function selectMapPin(id) {
  state.selectedMapPin = id;
  state.mapSheetOpen = true;
  render();
}

function closeMapSheet() {
  state.mapSheetOpen = false;
  state.selectedMapPin = null;
  render();
}

function setTreeSearch(v) {
  state.treeSearch = v;
  render();
}

function setTreeView(v) {
  state.treeView = v;
  render();
}

function setFilter(key, val) {
  state.treeFilters[key] = val;
  render();
}

function openFilterSheet() {
  state.showFilterSheet = true;
  render();
}

function closeFilterSheet() {
  state.showFilterSheet = false;
  render();
}

function openProjectSheet() {
  state.showProjectSheet = true;
  render();
}

function setProject(id) {
  state.projectFilter = id;
  state.showProjectSheet = false;
  render();
}

function openPhotoViewer(url) {
  state.photoViewerUrl = url;
  state.showPhotoViewer = true;
  render();
}

function closePhotoViewer() {
  state.showPhotoViewer = false;
  render();
}

function setAuthTab(tab) {
  state.authTab = tab;
  render();
}

function toggleOffline() {
  state.offline = !state.offline;
  render();
}

function openDialog(id) {
  const el = document.getElementById("dialog");
  if (el) {
    el.classList.add("open");
    document.getElementById("dialog-title").textContent = "Clear failed queue?";
    document.getElementById("dialog-body").textContent = "This will remove 1 failed tree registration from the queue. This cannot be undone.";
  }
}

function closeDialog() {
  document.getElementById("dialog").classList.remove("open");
}

function confirmDialog() {
  closeDialog();
  showToast("Failed queue cleared");
}

function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = "position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999;opacity:0;transition:opacity 0.3s";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  setTimeout(() => (t.style.opacity = "0"), 2500);
}

function jumpTo(screen) {
  if (TAB_SCREENS.includes(screen)) {
    navigateTab(screen);
  } else {
    navigate(screen);
  }
}

function updateProtoControls() {
  document.querySelectorAll(".proto-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === state.screen);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  document.getElementById("filter-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "filter-overlay") closeFilterSheet();
  });
  document.getElementById("project-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "project-overlay") {
      state.showProjectSheet = false;
      render();
    }
  });
});
