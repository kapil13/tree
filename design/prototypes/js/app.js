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
  registerPitPhoto: null,
  registerSessionCount: 0,
  registrationContext: null, // set after program/scheme/project established
  offline: false,
  projectFilter: "all",
  treeSearch: "",
  registryCategory: "all",
  registryPage: 1,
  registryPageSize: 25,
  registrySort: "recent",
  treeFilters: { health: "all", sync: "all", verified: "all" },
  mapSheetOpen: false,
  selectedMapPin: null,
  showFilterSheet: false,
  showProjectSheet: false,
  showPhotoViewer: false,
  photoViewerUrl: null,
  authTab: "email",
  userRole: "supervisor", // supervisor | field_worker | citizen
  drawerOpen: false,
  selectedBioSession: null,
};

const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  field: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  bioacoustic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  back: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevron: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
};

const TAB_SCREENS = ["home", "map", "field", "monitor", "bioacoustic"];

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
  const result = queryRegistry({
    search: state.treeSearch,
    category: state.registryCategory,
    projectId: state.projectFilter,
    page: state.registryPage,
    pageSize: state.registryPageSize,
    sort: state.registrySort,
  });
  return result;
}

function getRegistryQueryOpts() {
  return {
    search: state.treeSearch,
    category: state.registryCategory,
    projectId: state.projectFilter,
    page: state.registryPage,
    pageSize: state.registryPageSize,
    sort: state.registrySort,
  };
}

function projectChip() {
  const ctx = state.registrationContext;
  const name = ctx
    ? ctx.project.name
    : state.projectFilter === "all"
      ? "All projects"
      : MOCK_PROJECTS.find((p) => p.id === state.projectFilter)?.name || "All";
  return `<button class="project-chip" onclick="openProjectSheet()" title="${name}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
    ${name.length > 20 ? name.slice(0, 18) + "…" : name}
  </button>`;
}

function contextStrip(ctx) {
  if (!ctx) return "";
  const chainage = ctx.inherited?.chainageEnabled && ctx.suggestedNext ? ` · ${ctx.suggestedNext.chainageLabel}` : "";
  return `<div class="context-strip">
    <span class="context-strip-project">${ctx.project.name}</span>
    <span class="context-strip-meta">${ctx.workArea}${chainage}</span>
  </div>`;
}

function contextBanner(ctx, opts = {}) {
  if (!ctx) return "";
  const { compact } = opts;
  if (compact) return contextStrip(ctx);
  return `<div class="context-banner">
    <div class="context-path">${ctx.program.name} → ${ctx.scheme.name}</div>
    <div class="context-title">${ctx.project.name}</div>
    <div class="context-meta">${ctx.workArea}${ctx.inherited.chainageEnabled && ctx.suggestedNext ? " · " + ctx.suggestedNext.chainageLabel : ""}</div>
  </div>`;
}

function inheritedSummary(ctx) {
  if (!ctx) return "";
  const i = ctx.inherited;
  const parts = [
    `${i.minPhotos} photos`,
    i.requirePitPhoto ? "pit photo" : null,
    i.spacing || i.spacingM ? `${i.spacing || i.spacingM + "m"} spacing` : null,
    i.complianceMode,
  ].filter(Boolean);
  return `<div class="inherited-summary" onclick="showToast('${i.pitSize} pit · ${i.guardType} guard · ${i.implementingAgency}')">
    <span class="inherited-summary-label">Scheme rules applied</span>
    <span class="inherited-summary-value">${parts.join(" · ")}</span>
  </div>`;
}

function inheritedPanel(ctx) {
  return inheritedSummary(ctx);
}

function getActiveContext() {
  if (state.registrationContext) return state.registrationContext;
  if (state.projectFilter !== "all") {
    const proj = MOCK_PROJECTS.find((p) => p.id === state.projectFilter);
    if (proj) {
      const scheme = MOCK_SCHEMES.find((s) => s.id === proj.schemeId);
      const program = MOCK_PROGRAMS.find((p) => p.id === proj.programId);
      return {
        ...MOCK_REGISTRATION_CONTEXT,
        program,
        scheme,
        project: proj,
        workArea: proj.workAreas[0],
      };
    }
  }
  return MOCK_REGISTRATION_CONTEXT;
}

function establishContext(projectId) {
  const proj = MOCK_PROJECTS.find((p) => p.id === projectId) || MOCK_PROJECTS[0];
  const scheme = MOCK_SCHEMES.find((s) => s.id === proj.schemeId);
  const program = MOCK_PROGRAMS.find((p) => p.id === proj.programId);
  state.registrationContext = {
    program,
    scheme,
    project: proj,
    workArea: proj.workAreas[0],
    workAreaId: "wa1",
    inherited: { ...MOCK_REGISTRATION_CONTEXT.inherited, ...(scheme?.rules || {}) },
    suggestedNext: { ...MOCK_REGISTRATION_CONTEXT.suggestedNext },
    progress: {
      treeCount: proj.trees,
      targetTreeCount: proj.targetTrees,
      progressPct: proj.progressPct,
    },
  };
  state.projectFilter = proj.id;
}

function fieldCaptureBar(label = "Register next tree") {
  return `<div class="field-capture-bar">
    <button class="field-capture-btn" onclick="startRegister()">
      <span class="field-capture-icon">+</span>
      <span>${label}</span>
    </button>
  </div>`;
}

function signalStrip(signals) {
  return `<div class="signal-strip">${signals
    .map(
      (s) => `
    <button class="signal-pill" onclick="${s.action}">
      <span class="signal-value">${s.value}</span>
      <span class="signal-label">${s.label}</span>
    </button>`
    )
    .join("")}</div>`;
}

function hamburgerBtn() {
  return `<button class="app-bar-menu" onclick="openDrawer()" aria-label="Open navigation">☰</button>`;
}

function appBar(title, opts = {}) {
  const { back, menu, actions = "", transparent } = opts;
  const leading = back
    ? `<button class="app-bar-back" onclick="goBack()">${ICONS.back}</button>`
    : menu
      ? hamburgerBtn()
      : "";
  return `<header class="app-bar${transparent ? " transparent" : ""}">
    ${leading}
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
    { id: "bioacoustic", label: "Bio", icon: ICONS.bioacoustic },
  ];
  const activeTab = state.tab;
  return `<nav class="bottom-nav">
    ${tabs
      .map(
        (t) => `
      <button class="nav-item${activeTab === t.id ? " active" : ""}" onclick="navigateTab('${t.id}')">
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
  const d = MOCK_DASHBOARD;
  const fi = d.forestIntegrity;
  const ctx = getActiveContext();
  const statusClass = d.operationalStatus === "critical" ? "critical" : d.operationalStatus === "attention" ? "attention" : "healthy";
  const topPriority = d.priorities[0];
  const activeProject = MOCK_PROJECTS.find((p) => p.id === (ctx.project?.id || state.projectFilter)) || MOCK_PROJECTS[0];
  return `
    ${offlineBanner()}
    ${appBar("Command center", {
      menu: true,
      actions: `${projectChip()}<button class="app-bar-action" onclick="navigate('alerts')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span class="badge">${d.kpis.unreadAlerts}</span></button>`,
    })}
    <div class="screen-body has-capture-bar">
      ${contextStrip(ctx)}

      <div class="status-banner ${statusClass} clickable" onclick="navigate('dashboard-integrity')">
        <span style="font-size:18px">${statusClass === "healthy" ? "✓" : "⚠"}</span>
        <div style="flex:1">
          <div class="status-banner-title">${d.statusLabel}</div>
          <div class="status-banner-detail">${d.briefLines[0]}</div>
        </div>
        <span class="integrity-score compact">${fi.score}</span>
      </div>

      ${topPriority ? `
      <div class="next-up-hero" onclick="handlePriority('${topPriority.id}')">
        <div class="next-up-label">Next up</div>
        <div class="next-up-title">${topPriority.title}</div>
        <div class="next-up-sub">${topPriority.subtitle}</div>
        <span class="next-up-action">${topPriority.action} →</span>
      </div>` : ""}

      ${signalStrip([
        { value: d.kpis.unreadAlerts, label: "Alerts", action: "navigate('alerts')" },
        { value: d.kpis.needsAttention, label: "Attention", action: "openRegistryCategory('attention')" },
        { value: d.kpis.evidenceGaps, label: "Evidence", action: "navigate('evidence')" },
        { value: MOCK_BIOACOUSTIC.speciesDetected, label: "Species", action: "navigateTab('bioacoustic')" },
      ])}

      <div class="section-header"><span class="section-title">Queue</span><button class="section-link" onclick="navigateTab('field')">Field →</button></div>
      ${d.priorities.slice(1, 4).map((p) => `
        <div class="priority-card slim" onclick="handlePriority('${p.id}')">
          <div class="priority-icon ${p.severity}">${p.type === "alert" ? "!" : p.type === "trees" ? "🌳" : p.type === "sync" ? "↻" : "📋"}</div>
          <div class="priority-body">
            <div class="priority-title">${p.title}</div>
            <div class="priority-sub">${p.subtitle}</div>
          </div>
          <span class="priority-action">${p.action}</span>
        </div>`).join("")}

      <div class="section-header"><span class="section-title">Spatial</span><button class="section-link" onclick="navigateTab('map')">Map</button></div>
      <div class="map-preview connected" onclick="navigateTab('map')">
        <div class="map-preview-grid"></div>
        <div style="position:absolute;top:30%;left:25%;width:10px;height:10px;background:var(--status-danger);border-radius:50%;border:2px solid white"></div>
        <div style="position:absolute;top:50%;left:45%;width:10px;height:10px;background:var(--brand-canopy);border-radius:50%;border:2px solid white"></div>
        <div class="map-preview-label">${d.kpis.unreadAlerts} alerts · NDVI stress Ch. 142–148 · tap to inspect</div>
      </div>

      <div class="connected-project" onclick="navigate('project-detail','${activeProject.id}')">
        <div>
          <div class="connected-project-name">${activeProject.name}</div>
          <div class="connected-project-meta">${activeProject.trees.toLocaleString()} trees · integrity ${activeProject.integrityScore} · ${activeProject.progressPct}% planted</div>
        </div>
        <span class="badge-status ${activeProject.integrityScore >= 75 ? "badge-ok" : "badge-warn"}">${activeProject.openViolations ? activeProject.openViolations + " open" : "On track"}</span>
      </div>

      ${MOCK_BIOACOUSTIC.alert ? `
      <div class="intel-line" onclick="navigateTab('bioacoustic')">
        <span>🎙 Bioacoustic</span>
        <span class="intel-line-text">${MOCK_BIOACOUSTIC.alert.title}</span>
        <span>→</span>
      </div>` : ""}

      <div class="section-header"><span class="section-title">Live feed</span></div>
      ${d.recentActivity.slice(0, 3).map((a) => `
        <div class="activity-item compact" onclick="handleActivity('${a.id}')">
          <div class="activity-dot"></div>
          <div style="flex:1">
            <div class="activity-title">${a.title} · ${a.detail}</div>
            <div class="activity-time">${a.time}</div>
          </div>
          ${ICONS.chevron}
        </div>`).join("")}
    </div>
    ${fieldCaptureBar("Register tree in context")}
    ${bottomNav()}`;
}

function renderDashboardIntegrity() {
  const fi = MOCK_DASHBOARD.forestIntegrity;
  return `
    ${offlineBanner()}
    ${appBar("Forest integrity", { back: true })}
    <div class="screen-body">
      <div style="text-align:center;padding:16px 0">
        <div class="integrity-score" style="font-size:48px">${fi.score}</div>
        <div style="font-size:14px;color:var(--text-secondary)">/100 · ${fi.grade} · <span class="integrity-trend down">${fi.trend} vs last week</span></div>
      </div>
      <div class="section-header"><span class="section-title">Contributing factors</span></div>
      ${fi.factors.map((f) => `
        <div class="factor-row">
          <span style="font-size:13px;flex:1">${f.label}</span>
          <div class="factor-bar"><div class="factor-fill ${f.impact === "negative" ? "negative" : ""}" style="width:${f.value}%"></div></div>
          <span style="font-size:13px;font-weight:600;width:32px;text-align:right">${f.value}</span>
        </div>`).join("")}
      <div class="section-header"><span class="section-title">Affected projects</span></div>
      ${fi.affectedProjects.map((pid) => {
        const p = MOCK_PROJECTS.find((x) => x.id === pid);
        return `<div class="card card-clickable" style="margin-bottom:8px" onclick="navigate('project-detail','${pid}')"><div class="card-title">${p.name}</div><div class="card-meta">Integrity ${p.integrityScore} · ${p.openViolations} violations</div></div>`;
      }).join("")}
      <div class="section-header"><span class="section-title">Recommended actions</span></div>
      ${fi.recommendedActions.map((a) => `<div class="action-card" onclick="navigate('alerts')"><div class="action-text"><div class="action-title">${a}</div></div>${ICONS.chevron}</div>`).join("")}
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="navigateTab('monitor')">View monitoring</button>
    </div>`;
}

function renderDashboardAttention() {
  const result = queryRegistry({ category: "attention", page: 1, pageSize: 15 });
  return `
    ${offlineBanner()}
    ${appBar("Trees needing attention", { back: true })}
    <div class="screen-body">
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">${result.total} trees across active projects</p>
      ${result.trees.map((t) => renderCompactRow(t)).join("")}
      <button class="btn btn-secondary btn-block" style="margin-top:16px" onclick="openRegistryCategory('attention')">View all in registry</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="navigateTab('map')">View on map</button>
    </div>`;
}

function renderRegisterContext() {
  const selProgram = state._selProgram || "government_nhai";
  const selScheme = state._selScheme || "nhai_highway";
  const selProject = state._selProject || "p1";
  const scheme = MOCK_SCHEMES.find((s) => s.id === selScheme);
  const project = MOCK_PROJECTS.find((p) => p.id === selProject);
  return `
    ${offlineBanner()}
    ${appBar("Set work context", { back: true })}
    <div class="screen-body">
      <p class="lead-copy">Pick where you're working. Rules and defaults load automatically — you won't re-enter them per tree.</p>
      <div class="context-picker">
        <div class="context-picker-label">Program</div>
        <div class="context-picker-row">
          ${MOCK_PROGRAMS.map((p) => `<button class="context-pill${selProgram === p.id ? " active" : ""}" onclick="selectProgram('${p.id}')">${p.name.replace("Government ", "")}</button>`).join("")}
        </div>
        <div class="context-picker-label">Scheme</div>
        <div class="context-picker-row">
          ${MOCK_SCHEMES.filter((s) => s.programId === selProgram).map((s) => `<button class="context-pill${selScheme === s.id ? " active" : ""}" onclick="selectScheme('${s.id}')">${s.name.replace("NHAI ", "").replace(" Compensatory Afforestation", "")}</button>`).join("")}
        </div>
        <div class="context-picker-label">Project</div>
        ${MOCK_PROJECTS.filter((p) => p.schemeId === selScheme).map((p) => `
          <div class="scheme-card${selProject === p.id ? " selected" : ""}" onclick="selectProjectForContext('${p.id}')">
            <div class="scheme-card-title">${p.name}</div>
            <div class="scheme-card-meta">${p.workAreas[0]} · ${p.trees.toLocaleString()} trees</div>
          </div>`).join("")}
      </div>
      ${scheme && project ? `<div class="context-ready">Ready: ${scheme.rules.minPhotos} photos${scheme.rules.requirePitPhoto ? " + pit" : ""} · ${scheme.complianceMode} compliance</div>` : ""}
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="confirmContext()">Start capturing trees</button>
    </div>`;
}

function renderRegisterSuccess() {
  const ctx = getActiveContext();
  const code = "ARX-NH-" + String(4822 + state.registerSessionCount).padStart(6, "0");
  return `
    ${offlineBanner()}
    <div class="screen-body">
      <div class="success-hero">
        <div class="success-icon">✓</div>
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">Captured</h2>
        <div style="font-family:var(--font-mono);font-size:14px;color:var(--text-secondary)">${code} · Neem · ${ctx.suggestedNext.chainageLabel}</div>
        ${state.offline ? `<div class="compliance-result compliance-warn" style="margin-top:16px">Queued offline — syncs when connected</div>` : `<div class="compliance-result compliance-pass" style="margin-top:16px">Synced · compliance passed</div>`}
      </div>
      ${contextStrip(ctx)}
      <button class="btn btn-primary btn-block" onclick="registerAnother()">Register another</button>
      <p style="text-align:center;font-size:12px;color:var(--text-tertiary);margin:8px 0">Same project context · GPS advances automatically</p>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" style="flex:1" onclick="openTree('t1')">View tree</button>
        <button class="btn btn-secondary" style="flex:1" onclick="navigateTab('map')">On map</button>
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="navigateTab('home')">Command center</button>
    </div>`;
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
        ${hamburgerBtn()}
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
  const ctx = getActiveContext();
  const nearby = queryRegistry({ category: "all", projectId: ctx.project.id, page: 1, pageSize: 3, sort: "proximity" }).trees;
  const nextTask = MOCK_FIELD_TASKS[0];
  return `
    ${offlineBanner()}
    ${appBar("Field", { menu: true, actions: `${projectChip()}<button class="app-bar-action" onclick="navigateTab('map')" title="Map">🗺</button>` })}
    <div class="screen-body has-capture-bar">
      ${contextStrip(ctx)}
      <div class="next-up-hero field" onclick="handleFieldTask('${nextTask.id}')">
        <div class="next-up-label">Nearest action · ${nextTask.context.split("·").pop().trim()}</div>
        <div class="next-up-title">${nextTask.title}</div>
        <div class="next-up-sub">Tap to inspect on map or resolve in field</div>
        <span class="next-up-action">Go →</span>
      </div>
      <div class="section-header"><span class="section-title">Today's queue</span><button class="section-link" onclick="navigate('sync-queue')">Sync</button></div>
      ${MOCK_FIELD_TASKS.slice(1).map((task) => `
        <div class="priority-card slim" onclick="handleFieldTask('${task.id}')">
          <div class="priority-icon ${task.priority === "critical" ? "critical" : task.priority === "high" ? "high" : "medium"}">${task.type === "alert" ? "!" : task.type === "survey" ? "📋" : task.type === "evidence" ? "📷" : task.type === "bioacoustic" ? "🎙" : "✓"}</div>
          <div class="priority-body">
            <div class="priority-title">${task.title}</div>
            <div class="priority-sub">${task.context}</div>
          </div>
          ${ICONS.chevron}
        </div>`).join("")}
      <div class="section-header"><span class="section-title">Nearby trees</span><button class="section-link" onclick="navigate('registry')">${REGISTRY_STATS.total.toLocaleString()}</button></div>
      ${nearby.map((t) => renderCompactRow(t, { showDistance: true })).join("")}
      <div class="sync-inline" onclick="navigate('sync-queue')">
        <span>↻ 1 pending · 1 failed</span>
        <span class="sync-inline-action">Retry</span>
      </div>
    </div>
    ${fieldCaptureBar("Capture tree here")}
    ${bottomNav()}`;
}

function renderCompactRow(t, opts = {}) {
  const { showDistance } = opts;
  const speciesShort = t.species.split("(")[0].trim();
  return `<div class="registry-row" onclick="openTree('${t.id}')">
    ${t.photo
      ? `<img class="registry-thumb" src="${t.photo}" alt="" loading="lazy">`
      : `<div class="registry-thumb registry-thumb-empty">🌳</div>`}
    <div class="registry-main">
      <div class="registry-top">
        <span class="registry-code">${t.code}</span>
        ${showDistance ? `<span class="registry-distance">${t.distanceM || "—"}m</span>` : `<span class="registry-distance">${t.lastMonitored || "—"}</span>`}
      </div>
      <div class="registry-species">${speciesShort}</div>
      <div class="registry-meta">${t.project.split(" ")[0]} · ${t.workArea}</div>
      <div class="registry-status">
        ${healthBadge(t.health)}
        ${!t.verified ? '<span class="badge-status badge-warn">Unverified</span>' : ""}
        ${t.needsAttention ? '<span class="badge-status badge-danger">Attention</span>' : ""}
        ${t.sync !== "synced" ? `<span class="badge-status ${t.sync === "pending" ? "badge-warn" : "badge-danger"}">${t.sync}</span>` : ""}
      </div>
    </div>
    ${ICONS.chevron}
  </div>`;
}

function renderRegistryOverview() {
  const cats = [
    { id: "all", label: "All", count: REGISTRY_STATS.total },
    { id: "attention", label: "Attention", count: REGISTRY_STATS.needsAttention },
    { id: "missing_evidence", label: "Missing evidence", count: REGISTRY_STATS.missingEvidence },
    { id: "stale_monitoring", label: "Stale scan", count: REGISTRY_STATS.notRecentlyMonitored },
    { id: "unverified", label: "Unverified", count: REGISTRY_STATS.unverified },
    { id: "healthy", label: "Healthy", count: REGISTRY_STATS.healthy },
  ];
  return `
    <div class="registry-overview">
      <div class="registry-total">${REGISTRY_STATS.total.toLocaleString()} <span>trees</span></div>
      <div class="registry-categories">
        ${cats.map((c) => `
          <button class="registry-cat${state.registryCategory === c.id ? " active" : ""}" onclick="setRegistryCategory('${c.id}')">
            <span class="registry-cat-count">${c.count}</span>
            <span class="registry-cat-label">${c.label}</span>
          </button>`).join("")}
      </div>
    </div>`;
}

function renderRegistry() {
  const result = getFilteredTrees();
  const { trees, total, page, pages } = result;
  return `
    ${offlineBanner()}
    ${appBar("Tree registry", { back: true, actions: projectChip() })}
    <div class="screen-body no-pad-bottom">
      <div style="padding:0 16px">
        <div class="registry-toolbar" style="margin-top:8px">
          <input class="search-input" placeholder="Search ID, species, area…" value="${state.treeSearch}" oninput="setTreeSearch(this.value)">
          <button class="filter-btn" onclick="openFilterSheet()" title="More filters">☰</button>
          <select class="registry-sort" onchange="setRegistrySort(this.value)">
            <option value="recent" ${state.registrySort === "recent" ? "selected" : ""}>Recent</option>
            <option value="code" ${state.registrySort === "code" ? "selected" : ""}>Tree ID</option>
            <option value="proximity" ${state.registrySort === "proximity" ? "selected" : ""}>Nearest</option>
            <option value="health" ${state.registrySort === "health" ? "selected" : ""}>Health</option>
          </select>
        </div>
      </div>
      ${renderRegistryOverview()}
      <div class="registry-results-bar">
        <span><strong>${total.toLocaleString()}</strong> trees match</span>
        <span>Page ${page} of ${pages}</span>
      </div>
      <div class="registry-list">
        ${trees.length === 0
          ? `<div class="empty-state"><div class="empty-icon">🌳</div><div class="empty-title">No trees match</div><p>Try a different filter or search term</p></div>`
          : trees.map((t) => renderCompactRow(t)).join("")}
      </div>
      <div class="registry-pagination">
        <button class="btn btn-secondary btn-sm" onclick="setRegistryPage(${page - 1})" ${page <= 1 ? "disabled" : ""}>← Prev</button>
        <span class="registry-page-info">${(page - 1) * state.registryPageSize + 1}–${Math.min(page * state.registryPageSize, total)} of ${total.toLocaleString()}</span>
        <button class="btn btn-secondary btn-sm" onclick="setRegistryPage(${page + 1})" ${page >= pages ? "disabled" : ""}>Next →</button>
      </div>
    </div>
    <button class="fab" onclick="startRegister()">+</button>`;
}

function renderTreeDetail() {
  const t = state.selectedTree || MOCK_TREES[0];
  const speciesShort = t.species.split("(")[0].trim();
  return `
    ${offlineBanner()}
    <div class="screen-body no-pad" style="flex:1;overflow-y:auto">
      <div class="tree-hero">
        ${t.photo ? `<img src="${t.photo}" alt="" onclick="openPhotoViewer('${t.photo}')">` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:64px;background:var(--bg-subtle)">🌳</div>`}
        <button class="app-bar-back" style="position:absolute;top:48px;left:8px;background:rgba(0,0,0,0.4);color:white;border-radius:50%" onclick="goBack()">${ICONS.back}</button>
        <div class="tree-hero-overlay">
          <div class="tree-hero-code">${t.code}</div>
          <div class="tree-hero-species">${speciesShort}</div>
        </div>
      </div>
      <div style="padding:16px">
        <div class="state-summary">
          <div class="state-summary-main">
            ${healthBadge(t.health)}
            ${t.verified ? '<span class="badge-status badge-ok">Verified</span>' : '<span class="badge-status badge-warn">Unverified</span>'}
            <span class="badge-status ${t.sync === "synced" ? "badge-ok" : t.sync === "pending" ? "badge-warn" : "badge-danger"}">${t.sync}</span>
          </div>
          <p class="state-summary-text">${t.attentionReason || "Canopy stable · NDVI 0.52 · last scan 2d ago"}${t.needsAttention ? " · needs field check" : ""}</p>
        </div>

        <div class="action-rail">
          <button class="action-rail-btn primary" onclick="navigateTab('map')">Map</button>
          <button class="action-rail-btn" onclick="showToast('Field inspection started')">Inspect</button>
          <button class="action-rail-btn" onclick="navigate('evidence')">Evidence</button>
          <button class="action-rail-btn" onclick="navigateTab('monitor')">Monitor</button>
        </div>

        <div class="location-chip" onclick="navigateTab('map')">
          <span>📍 ${t.workArea}</span>
          <span class="location-chip-coords">${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}</span>
          <span>→</span>
        </div>

        <div class="detail-section compact">
          <div class="section-title" style="margin-bottom:8px">Timeline</div>
          <div class="timeline-item compact"><div class="timeline-dot"></div><div><div style="font-weight:500">Registered · 12 Mar</div><div style="font-size:12px;color:var(--text-secondary)">Field capture · ${t.project}</div></div></div>
          <div class="timeline-item compact"><div class="timeline-dot"></div><div><div style="font-weight:500">Verified · 15 Mar</div><div style="font-size:12px;color:var(--text-secondary)">Supervisor review</div></div></div>
          ${t.needsAttention ? `<div class="timeline-item compact"><div class="timeline-dot warn"></div><div><div style="font-weight:500">NDVI alert · 2h ago</div><div style="font-size:12px;color:var(--text-secondary)">Linked to active alert</div></div></div>` : ""}
        </div>
      </div>
    </div>`;
}

function renderRegister() {
  const ctx = getActiveContext();
  const step = state.registerStep;
  const i = ctx.inherited;
  const stepLabels = i.requirePitPhoto
    ? ["GPS & placement", "Pit + plant photos", "Species & submit"]
    : ["GPS & placement", "Plant photos", "Species & submit"];
  const totalSteps = 3;
  let body = "";

  if (step === 1) {
    body = `
      ${contextStrip(ctx)}
      ${inheritedSummary(ctx)}
      <div class="gps-card capture-first">
        <div class="gps-status">
          <span style="color:var(--status-ok)">●</span>
          <strong>GPS locked</strong>
          <span class="gps-accuracy">±4.2 m</span>
        </div>
        <div class="mini-map"><div class="mini-map-pin"></div></div>
        <div class="gps-placement">
          <span>${ctx.workArea}</span>
          ${i.chainageEnabled ? `<span class="gps-chainage">${ctx.suggestedNext.chainageLabel}</span>` : ""}
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;padding:0" onclick="showToast('Adjust pin on map')">Nudge pin</button>
      </div>
      <div class="compliance-result compliance-pass">Inside work area · spacing OK</div>
      <button class="btn btn-primary btn-block" onclick="setRegisterStep(2)">Open camera</button>`;
  } else if (step === 2) {
    const minPhotos = i.minPhotos || 3;
    const pitSlot = i.requirePitPhoto
      ? `<div class="photo-slot${state.registerPitPhoto ? " filled" : ""}" onclick="addPitPhoto()" style="position:relative">
          ${state.registerPitPhoto ? `<img src="${state.registerPitPhoto}" alt="">` : `<span style="font-size:20px">🕳</span><span>Pit photo</span><span style="font-size:10px">Required</span>`}
        </div>`
      : "";
    const plantSlots = Array.from({ length: 3 }, (_, idx) => {
      const photo = state.registerPhotos[idx];
      if (photo)
        return `<div class="photo-slot filled" style="position:relative"><img src="${photo}" alt=""><span style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.5);color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer" onclick="removeRegisterPhoto(${idx})">×</span></div>`;
      return `<div class="photo-slot" onclick="addRegisterPhoto(${idx})"><span style="font-size:24px">📷</span><span>Plant ${idx + 1}</span></div>`;
    }).join("");
    body = `
      ${contextStrip(ctx)}
      <p class="capture-hint">${i.requirePitPhoto ? "Pit photo required · " : ""}${minPhotos} plant photos · species inferred after capture</p>
      <div class="photo-capture-grid" style="position:relative">${pitSlot}${plantSlots}</div>
      <button class="btn btn-primary btn-block" onclick="setRegisterStep(3)" ${state.registerPhotos.length < 1 || (i.requirePitPhoto && !state.registerPitPhoto) ? "disabled style='opacity:0.5'" : ""}>Confirm photos</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="setRegisterStep(1)">Back</button>`;
  } else {
    body = `
      ${state.registerSessionCount > 0 ? `<div class="register-session">${state.registerSessionCount + 1} trees this session · context locked</div>` : ""}
      ${contextStrip(ctx)}
      <div class="capture-review">
        ${state.registerPitPhoto ? `<img src="${state.registerPitPhoto}" alt="pit">` : ""}
        ${state.registerPhotos.map((p) => `<img src="${p}" alt="">`).join("")}
      </div>
      <div class="species-chips">
        <span class="species-chip active" onclick="showToast('Neem selected')">Neem · 94% AI</span>
        <span class="species-chip" onclick="showToast('Khejri suggested')">Khejri · 72%</span>
        <span class="species-chip" onclick="showToast('Search species')">Other…</span>
      </div>
      ${i.chainageEnabled ? `<div class="road-side-toggle"><button class="road-side active">Right</button><button class="road-side">Left</button></div>` : ""}
      ${state.offline ? `<div class="compliance-result compliance-warn">Offline — queued for sync</div>` : `<div class="compliance-result compliance-pass">${ctx.workArea}${i.chainageEnabled ? " · " + ctx.suggestedNext.chainageLabel : ""} · ready</div>`}
      <button class="btn btn-primary btn-block" onclick="submitRegister()">${state.offline ? "Save offline" : "Capture tree"}</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="setRegisterStep(2)">Retake photos</button>`;
  }

  return `
    ${offlineBanner()}
    ${appBar("Capture tree", { back: true })}
    <div class="capture-progress"><div class="capture-progress-fill" style="width:${(step / totalSteps) * 100}%"></div></div>
    <div class="screen-body">
      <div class="capture-step-label">${stepLabels[step - 1]}</div>
      ${body}
    </div>`;
}

function renderMonitor() {
  return `
    ${offlineBanner()}
    ${appBar("Monitor", { menu: true, actions: `${projectChip()}<button class="app-bar-action" onclick="navigate('alerts')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg><span class="badge">2</span></button>` })}
    <div class="screen-body">
      <div class="section-header"><span class="section-title">Needs decision</span><button class="section-link" onclick="navigateTab('field')">Field</button></div>
      ${MOCK_ALERTS.slice(0, 2)
        .map(
          (a) => `
        <div class="monitor-card clickable" onclick="navigate('alert-detail','${a.id}')">
          <div class="severity-stripe severity-${a.severity}"></div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:15px">${a.title}</div>
            <div style="font-size:13px;color:var(--text-secondary)">${a.context}</div>
            <div class="monitor-action-hint">${a.action} →</div>
          </div>
        </div>`
        )
        .join("")}
      <div class="section-header"><span class="section-title">Site pulse</span><button class="section-link" onclick="navigateTab('map')">Map</button></div>
      ${MOCK_MONITOR.map((m) => {
        const ndviPct = Math.round(m.ndvi * 100);
        const cls = m.ndvi >= 0.55 ? "ndvi-high" : m.ndvi >= 0.45 ? "ndvi-mid" : "ndvi-low";
        return `
        <div class="monitor-site-row" onclick="navigateTab('map')">
          <div style="flex:1">
            <div class="card-title">${m.site}</div>
            <div class="card-meta">NDVI ${m.ndvi.toFixed(2)} ${m.trend === "down" ? "↓" : m.trend === "up" ? "↑" : "→"}${m.stale ? " · stale scan" : ""}</div>
            <div class="ndvi-bar"><div class="ndvi-fill ${cls}" style="width:${ndviPct}%"></div></div>
          </div>
          <span class="badge-status ${m.action === "No action" ? "badge-ok" : "badge-warn"}">${m.action === "No action" ? "OK" : "Act"}</span>
        </div>`;
      }).join("")}
      <div class="intel-line" onclick="navigateTab('bioacoustic')">
        <span>🎙 Ecology</span>
        <span class="intel-line-text">${MOCK_BIOACOUSTIC.speciesDetected} species · Shannon ${MOCK_BIOACOUSTIC.shannonIndex}</span>
        <span>→</span>
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

function renderGlobalDrawer() {
  const items = [
    { section: "Workspace", links: [
      { icon: "📁", label: "Projects", action: "projects" },
      { icon: "🌳", label: "Tree registry", action: "registry", badge: REGISTRY_STATS.total.toLocaleString() },
      { icon: "📍", label: "Field operations", action: "sync-queue" },
    ]},
    { section: "Monitoring & ecology", links: [
      { icon: "📊", label: "Monitoring", action: "tab:monitor" },
      { icon: "🎙", label: "Bioacoustic", action: "tab:bioacoustic", badge: MOCK_BIOACOUSTIC.speciesDetected + " spp" },
      { icon: "🦋", label: "Biodiversity", action: "biodiversity" },
      { icon: "🔔", label: "Alerts", action: "alerts", badge: "4", alert: true },
    ]},
    { section: "Compliance & MRV", links: [
      { icon: "📋", label: "Evidence", action: "evidence" },
      { icon: "📄", label: "Reports", action: "reports" },
      { icon: "✓", label: "MRV", action: "evidence" },
    ]},
    { section: "Carbon & credits", links: [
      { icon: "🌿", label: "Carbon", action: "carbon" },
      { icon: "💳", label: "Credits", action: "credits" },
    ]},
    { section: "Tools", links: [
      { icon: "✨", label: "AI Assistant", action: "assistant" },
    ]},
    { section: "Account", links: [
      { icon: "👤", label: "Profile", action: "profile" },
      { icon: "⚙", label: "Settings", action: "settings" },
    ]},
  ];
  return `
    <div class="drawer-header">
      <div class="drawer-user">
        <div class="drawer-avatar">RK</div>
        <div>
          <div class="drawer-user-name">Rajesh Kumar</div>
          <div class="drawer-user-role">Field Supervisor</div>
        </div>
      </div>
      <button class="drawer-close" onclick="closeDrawer()">×</button>
    </div>
    <div class="drawer-body">
      ${items.map((sec) => `
        <div class="drawer-section-title">${sec.section}</div>
        ${sec.links.map((l) => `
          <button class="drawer-item" onclick="drawerNav('${l.action}')">
            <span class="drawer-item-icon">${l.icon}</span>
            <span>${l.label}</span>
            ${l.badge ? `<span class="drawer-item-badge${l.alert ? " alert" : ""}">${l.badge}</span>` : ""}
          </button>`).join("")}
      `).join("")}
      <button class="drawer-item" style="color:var(--status-danger)" onclick="drawerNav('welcome')">
        <span class="drawer-item-icon">↪</span><span>Sign out</span>
      </button>
    </div>
    <div class="drawer-footer">Aranyix · Forest intelligence platform</div>`;
}

function renderBioacoustic() {
  const b = MOCK_BIOACOUSTIC;
  return `
    ${offlineBanner()}
    ${appBar("Bioacoustic", { menu: true, actions: `${projectChip()}<button class="app-bar-action" onclick="navigate('bioacoustic-capture')" title="Record">🎙</button>` })}
    <div class="screen-body no-pad">
      <div class="bio-hero">
        <div style="font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:0.04em">Ecosystem acoustic health</div>
        <div class="bio-hero-score">${b.healthScore}<span style="font-size:16px;font-weight:400">/100</span></div>
        <div style="font-size:13px;opacity:0.9">${b.ecosystemLabel} · Shannon ${b.shannonIndex}</div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:12px">
          <span>${b.speciesDetected} species</span>
          <span>${b.recordingsTotal} recordings</span>
          <span>${b.trend}</span>
        </div>
      </div>
      <div style="padding:0 16px">
        ${b.alert ? `
        <div class="priority-card" style="margin-bottom:16px" onclick="navigateTab('map')">
          <div class="priority-icon medium">🎙</div>
          <div class="priority-body">
            <div class="priority-title">${b.alert.title}</div>
            <div class="priority-sub">${b.alert.context}</div>
          </div>
          <span class="priority-action">Map →</span>
        </div>` : ""}
        <div class="section-header"><span class="section-title">Top species (30d)</span><button class="section-link" onclick="navigate('biodiversity')">Biodiversity →</button></div>
        ${b.topSpecies.map((s) => `
          <div class="bio-species-row" onclick="showToast('${s.name} — ${Math.round(s.confidence * 100)}% confidence')">
            <div style="flex:1">
              <div style="font-weight:600;font-size:14px">${s.name}</div>
              <div style="font-size:12px;color:var(--text-secondary)">${s.scientific}</div>
            </div>
            <span class="badge-status badge-ok">${s.count} detections</span>
          </div>`).join("")}
        <div class="section-header"><span class="section-title">Recent sessions</span><button class="section-link" onclick="navigate('bioacoustic-capture')">New recording</button></div>
        ${b.sessions.map((s) => `
          <div class="registry-row" onclick="openBioSession('${s.id}')">
            <div class="registry-thumb" style="display:flex;align-items:center;justify-content:center;background:#e8f0eb">🎙</div>
            <div class="registry-main">
              <div class="registry-species">${s.site}</div>
              <div class="registry-meta">${s.duration} · ${s.species} species · ${s.time}</div>
              <span class="badge-status ${s.status === "analyzed" ? "badge-ok" : "badge-warn"}">${s.status}</span>
            </div>
            ${ICONS.chevron}
          </div>`).join("")}
        <div class="section-header"><span class="section-title">Connected intelligence</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm" onclick="navigateTab('monitor')">Monitoring</button>
          <button class="btn btn-secondary btn-sm" onclick="navigate('evidence')">Evidence</button>
          <button class="btn btn-secondary btn-sm" onclick="navigateTab('map')">Map layers</button>
        </div>
      </div>
    </div>
    ${bottomNav()}`;
}

function renderBioacousticCapture() {
  const ctx = getActiveContext();
  return `
    ${offlineBanner()}
    ${appBar("Record bioacoustic", { back: true })}
    <div class="screen-body" style="text-align:center">
      ${contextBanner(ctx, { compact: true })}
      <p style="font-size:14px;color:var(--text-secondary);margin:16px 0">Place device near plot centre. Min 10 min for survey-grade analysis.</p>
      <div class="bio-waveform">${[40,65,30,80,55,70,45,90,35,60,75,50,85,40,70].map((h) => `<span style="height:${h}%"></span>`).join("")}</div>
      <button class="record-pulse" onclick="showToast('Recording…')">⏺</button>
      <div style="font-size:13px;color:var(--text-secondary)">Tap to start · GPS locked ±4.2m</div>
      <div class="card" style="margin-top:24px;text-align:left">
        <div class="card-title">Session context (inherited)</div>
        <div class="card-meta">${ctx.project.name} · ${ctx.workArea}</div>
        <div class="detail-row"><span class="detail-label">Scheme</span><span class="detail-value">${ctx.scheme.name}</span></div>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="navigateTab('bioacoustic')">Save & analyze</button>
    </div>`;
}

function renderBioacousticDetail() {
  const s = state.selectedBioSession || MOCK_BIOACOUSTIC.sessions[0];
  return `
    ${appBar("Session detail", { back: true })}
    <div class="screen-body">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">${s.site}</div>
        <div class="card-meta">${s.duration} · ${s.time} · ${s.status}</div>
      </div>
      <div class="bio-waveform" style="height:64px">${[30,50,70,40,90,60,80,45,75,55,85,65,50,70,40].map((h) => `<span style="height:${h}%"></span>`).join("")}</div>
      <div class="section-header"><span class="section-title">Detected species</span></div>
      ${MOCK_BIOACOUSTIC.topSpecies.slice(0, 3).map((sp) => `
        <div class="detail-row"><span class="detail-label">${sp.name}</span><span class="detail-value">${Math.round(sp.confidence * 100)}%</span></div>`).join("")}
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="navigate('biodiversity')">View biodiversity fusion</button>
      <button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="navigate('evidence')">Add to evidence bundle</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="navigateTab('map')">View on map</button>
    </div>`;
}

function renderBiodiversity() {
  const b = MOCK_BIODIVERSITY;
  return `
    ${appBar("Biodiversity", { back: true })}
    <div class="screen-body">
      <div class="stats-row">
        <div class="stat-box"><div class="stat-value">${b.taxaRichness}</div><div class="stat-label">Taxa</div></div>
        <div class="stat-box"><div class="stat-value">${b.shannon}</div><div class="stat-label">Shannon</div></div>
        <div class="stat-box"><div class="stat-value">${b.fusionScore}</div><div class="stat-label">Fusion score</div></div>
      </div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Fused from bioacoustic (${b.bioacousticRecordings} recordings) + satellite ecosystem (${b.satelliteEcosystem}/100)</p>
      <div class="section-header"><span class="section-title">Hotspots by work area</span></div>
      ${b.hotspots.map((h) => `
        <div class="card card-clickable" style="margin-bottom:8px" onclick="navigateTab('map')">
          <div style="display:flex;justify-content:space-between">
            <div class="card-title">${h.area}</div>
            <span class="badge-status ${h.score >= 75 ? "badge-ok" : "badge-warn"}">${h.score}</span>
          </div>
          <div class="card-meta">Trend ${h.trend === "up" ? "↑" : h.trend === "down" ? "↓" : "→"}</div>
        </div>`).join("")}
      <button class="btn btn-secondary btn-block" style="margin-top:16px" onclick="navigateTab('bioacoustic')">Bioacoustic detail</button>
    </div>`;
}

function renderEvidence() {
  return `
    ${appBar("Evidence & MRV", { back: true })}
    <div class="screen-body">
      <div class="section-title" style="margin-bottom:8px">Evidence pipeline</div>
      <div class="evidence-pipeline">
        <div class="evidence-step done">Capture</div><span class="evidence-step-arrow">→</span>
        <div class="evidence-step done">Evidence</div><span class="evidence-step-arrow">→</span>
        <div class="evidence-step pending">Verify</div><span class="evidence-step-arrow">→</span>
        <div class="evidence-step">MRV</div><span class="evidence-step-arrow">→</span>
        <div class="evidence-step">Report</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-value">${MOCK_EVIDENCE.verified}</div><div class="stat-label">Verified</div></div>
        <div class="stat-box"><div class="stat-value">${MOCK_EVIDENCE.pending}</div><div class="stat-label">Pending</div></div>
        <div class="stat-box"><div class="stat-value">${MOCK_EVIDENCE.complete}</div><div class="stat-label">Complete</div></div>
      </div>
      <div class="section-header"><span class="section-title">Gaps needing attention</span></div>
      ${MOCK_EVIDENCE.gaps.map((g) => `
        <div class="priority-card" onclick="navigate('reports')">
          <div class="priority-icon medium">📋</div>
          <div class="priority-body">
            <div class="priority-title">${g.item}</div>
            <div class="priority-sub">${g.project}</div>
          </div>
          <span class="badge-status badge-warn">${g.status}</span>
        </div>`).join("")}
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="navigate('reports')">Reports & exports</button>
    </div>`;
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
      ${pending.length ? pending.map((t) => renderCompactRow(t)).join("") : `<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-title">All synced</div></div>`}
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
  "dashboard-integrity": renderDashboardIntegrity,
  "dashboard-attention": renderDashboardAttention,
  map: renderMap,
  field: renderField,
  registry: renderRegistry,
  "tree-detail": renderTreeDetail,
  "register-context": renderRegisterContext,
  register: renderRegister,
  "register-success": renderRegisterSuccess,
  monitor: renderMonitor,
  alerts: renderAlerts,
  "alert-detail": renderAlertDetail,
  projects: renderProjects,
  "project-detail": renderProjectDetail,
  "sync-queue": renderSyncQueue,
  reports: renderReports,
  carbon: renderCarbon,
  credits: renderCredits,
  assistant: renderAssistant,
  profile: renderProfile,
  settings: renderSettings,
  bioacoustic: renderBioacoustic,
  "bioacoustic-capture": renderBioacousticCapture,
  "bioacoustic-detail": renderBioacousticDetail,
  biodiversity: renderBiodiversity,
  evidence: renderEvidence,
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
  const backdrop = document.getElementById("drawer-backdrop");
  const drawer = document.getElementById("global-drawer");
  if (backdrop) backdrop.classList.toggle("open", state.drawerOpen);
  if (drawer) {
    drawer.classList.toggle("open", state.drawerOpen);
    drawer.innerHTML = state.drawerOpen ? renderGlobalDrawer() : "";
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
  if (TAB_SCREENS.includes(screen)) {
    state.tab = screen;
  } else {
    state.tab = null;
  }
  render();
}

function navigateTab(tab) {
  state.drawerOpen = false;
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
  establishContext("p1");
  render();
}

function openTree(id) {
  state.selectedTree = getTreeById(id);
  navigate("tree-detail");
}

function startRegister() {
  if (!state.registrationContext) {
    state._selProgram = "government_nhai";
    state._selScheme = "nhai_highway";
    state._selProject = "p1";
    navigate("register-context");
    return;
  }
  state.registerStep = 1;
  state.registerPhotos = [];
  state.registerPitPhoto = null;
  navigate("register");
}

function selectProgram(id) {
  state._selProgram = id;
  const schemes = MOCK_SCHEMES.filter((s) => s.programId === id);
  state._selScheme = schemes[0]?.id || "";
  render();
}

function selectScheme(id) {
  state._selScheme = id;
  const projects = MOCK_PROJECTS.filter((p) => p.schemeId === id);
  state._selProject = projects[0]?.id || "";
  render();
}

function selectProjectForContext(id) {
  state._selProject = id;
  render();
}

function confirmContext() {
  establishContext(state._selProject || "p1");
  state.registerStep = 1;
  state.registerPhotos = [];
  state.registerPitPhoto = null;
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

function addPitPhoto() {
  state.registerPitPhoto =
    "https://images.unsplash.com/photo-1502082553048-f009c37126b9?w=400&h=400&fit=crop";
  render();
}

function removeRegisterPhoto(i) {
  state.registerPhotos.splice(i, 1);
  render();
}

function submitRegister() {
  state.registerSessionCount++;
  const ctx = getActiveContext();
  if (ctx.suggestedNext) {
    ctx.suggestedNext.chainageKm += 0.05;
    const km = ctx.suggestedNext.chainageKm;
    ctx.suggestedNext.chainageLabel = `KM ${Math.floor(km)}+${Math.round((km % 1) * 1000).toString().padStart(3, "0")}`;
  }
  state.screen = "register-success";
  state.history.push({ screen: "register", tab: state.tab });
  render();
}

function registerAnother() {
  state.registerStep = 1;
  state.registerPhotos = [];
  state.registerPitPhoto = null;
  state.screen = "register";
  render();
}

function handlePriority(id) {
  const p = MOCK_DASHBOARD.priorities.find((x) => x.id === id);
  if (!p) return;
  if (p.target === "alert-detail") navigate("alert-detail", p.targetId);
  else if (p.target === "dashboard-attention") navigate("dashboard-attention");
  else if (p.target === "sync-queue") navigate("sync-queue");
  else navigate(p.target);
}

function handleActivity(id) {
  const a = MOCK_DASHBOARD.recentActivity.find((x) => x.id === id);
  if (!a) return;
  if (a.target === "tree-detail") openTree(a.targetId);
  else if (a.target === "alert-detail") navigate("alert-detail", a.targetId);
  else navigate(a.target);
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
  state.registryPage = 1;
  render();
}

function setRegistryCategory(cat) {
  state.registryCategory = cat;
  state.registryPage = 1;
  if (state.screen !== "registry") navigate("registry");
  else render();
}

function openRegistryCategory(cat) {
  state.registryCategory = cat;
  state.registryPage = 1;
  navigate("registry");
}

function setRegistryPage(p) {
  const result = queryRegistry(getRegistryQueryOpts());
  if (p < 1 || p > result.pages) return;
  state.registryPage = p;
  render();
}

function setRegistrySort(sort) {
  state.registrySort = sort;
  state.registryPage = 1;
  render();
}

function handleFieldTask(id) {
  const task = MOCK_FIELD_TASKS.find((t) => t.id === id);
  if (!task) return;
  if (task.type === "register") {
    startRegister();
    return;
  }
  if (task.type === "bioacoustic") {
    navigate("bioacoustic-capture");
    return;
  }
  if (task.type === "alert") navigate("alert-detail", "a1");
  else if (task.type === "survey") openRegistryCategory("attention");
  else if (task.type === "evidence") navigate("evidence");
  else openRegistryCategory("unverified");
}

function openDrawer() {
  state.drawerOpen = true;
  render();
}

function closeDrawer() {
  if (!state.drawerOpen) return;
  state.drawerOpen = false;
  render();
}

function drawerNav(action) {
  closeDrawer();
  if (action.startsWith("tab:")) navigateTab(action.slice(4));
  else navigate(action);
}

function openBioSession(id) {
  state.selectedBioSession = MOCK_BIOACOUSTIC.sessions.find((s) => s.id === id) || MOCK_BIOACOUSTIC.sessions[0];
  navigate("bioacoustic-detail");
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
  if (screen === "drawer") {
    if (!state.tab) {
      state.tab = "home";
      state.screen = "home";
    }
    openDrawer();
    return;
  }
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.drawerOpen) closeDrawer();
});
