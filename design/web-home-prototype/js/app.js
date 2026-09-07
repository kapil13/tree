/**
 * Aranyix Web Home — Forest Intelligence Command Center
 * Narrative first: speak, then explore.
 */

const state = {
  selectedHotspot: null,
  selectedPriority: null,
  mapLayers: { trees: true, alerts: true, stale: true, bio: true },
  sidebarOpen: false,
  filters: { project: "all", scheme: "all", time: "30d" },
  loading: true,
  error: false,
  empty: false,
};

const TIME_LABELS = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom range",
};

function fmtCo2e(kg) {
  const t = kg / 1000;
  return t >= 100 ? `${t.toFixed(0)}` : t.toFixed(1);
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function getFilteredProjects() {
  let projects = MOCK_PROJECTS;
  if (state.filters.project !== "all") {
    projects = projects.filter((p) => p.id === state.filters.project);
  } else if (state.filters.scheme !== "all") {
    projects = projects.filter((p) => p.schemeId === state.filters.scheme);
  }
  return projects;
}

function getFilteredHotspots() {
  const projects = getFilteredProjects();
  const ids = new Set(projects.map((p) => p.id));
  if (state.filters.project === "all" && state.filters.scheme === "all") return MOCK_MAP_HOTSPOTS;
  return MOCK_MAP_HOTSPOTS.filter((h) => ids.has(h.projectId));
}

function getFilteredPriorities() {
  const projects = getFilteredProjects();
  const ids = new Set(projects.map((p) => p.id));
  if (state.filters.project === "all" && state.filters.scheme === "all") return MOCK_PRIORITIES;
  return MOCK_PRIORITIES.filter((p) => p.projectId === "all" || ids.has(p.projectId));
}

function getDashboardView() {
  const d = {
    ...MOCK_DASHBOARD,
    kpi: { ...MOCK_DASHBOARD.kpi },
    forestIntegrity: { ...MOCK_DASHBOARD.forestIntegrity },
    narrative: { ...MOCK_DASHBOARD.narrative },
  };
  const projects = getFilteredProjects();
  if (projects.length === 1) {
    const p = projects[0];
    d.forestIntegrity.score = p.integrityScore;
    d.kpi.total_trees = p.trees;
    d.fieldOps = { ...d.fieldOps, open_violations: p.openViolations, survival_due: p.survivalDue };
    d.narrative.executiveSummary = `Focused on ${p.name}: integrity at ${p.integrityScore}/100 with ${p.openViolations} open violations and ${p.survivalDue} survival surveys due.`;
    d.narrative.spatial = `Attention is concentrated in ${p.workAreas.join(" and ")} within ${p.name}.`;
  } else if (projects.length < MOCK_PROJECTS.length) {
    d.kpi.total_trees = projects.reduce((s, p) => s + p.trees, 0);
    d.fieldOps.open_violations = projects.reduce((s, p) => s + p.openViolations, 0);
    d.fieldOps.survival_due = projects.reduce((s, p) => s + p.survivalDue, 0);
    d.forestIntegrity.score = Math.round(projects.reduce((s, p) => s + p.integrityScore, 0) / projects.length);
  }
  return d;
}

function getFilterContextLabel() {
  const proj =
    state.filters.project !== "all"
      ? MOCK_PROJECTS.find((p) => p.id === state.filters.project)?.name
      : state.filters.scheme !== "all"
        ? MOCK_SCHEMES.find((s) => s.id === state.filters.scheme)?.label
        : "All projects";
  return `${proj} · ${TIME_LABELS[state.filters.time]}`;
}

function renderSidebar() {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = NAV_GROUPS
    .map(
      (g) => `
    <div class="nav-group-label">${g.label}</div>
    ${g.items.map((item) => `
      <button type="button" class="nav-item${item.active ? " active" : ""}" data-nav="${item.id}">
        <span class="icon">${item.icon}</span>${item.label}
      </button>`).join("")}`
    )
    .join("");

  nav.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.nav !== "dashboard") showToast(`Open ${btn.textContent.trim()}`);
      if (window.innerWidth <= 768) {
        state.sidebarOpen = false;
        document.getElementById("sidebar").classList.remove("open");
      }
    });
  });
}

function renderFilters() {
  document.getElementById("filter-project").innerHTML =
    `<option value="all">All Projects</option>${MOCK_PROJECTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}`;
  document.getElementById("filter-project").value = state.filters.project;
  document.getElementById("filter-scheme").innerHTML =
    MOCK_SCHEMES.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  document.getElementById("filter-scheme").value = state.filters.scheme;
  document.getElementById("filter-time").value = state.filters.time;
  document.getElementById("filter-context-label").textContent = getFilterContextLabel();
}

function renderBrief() {
  const d = getDashboardView();
  document.getElementById("narrative-score").textContent = d.forestIntegrity.score;
  const trendEl = document.getElementById("narrative-trend");
  const t = d.forestIntegrity.trend;
  trendEl.textContent = `${t > 0 ? "+" : ""}${t} this week`;
  trendEl.className = `trend ${t < 0 ? "down" : t > 0 ? "up" : "flat"}`;
  document.getElementById("operational-status").textContent = d.statusLabel;
  document.getElementById("executive-summary").textContent = d.narrative.executiveSummary;
  document.getElementById("why-matters-short").textContent = d.narrative.whyMatters;
  document.getElementById("next-step-short").textContent = d.narrative.nextStep;
  document.getElementById("interpreted-intel").textContent = d.narrative.interpreted;
  document.getElementById("spatial-narrative").textContent = d.narrative.spatial;
  document.getElementById("live-updated").textContent = `Updated ${d.updatedAt}`;
  document.getElementById("alert-badge").textContent = d.unreadAlerts;

  const chips = document.getElementById("brief-chips");
  chips.innerHTML = MOCK_BRIEF_CHIPS
    .map((c) => `<button type="button" class="brief-chip ${c.class}" data-topic="${c.topic}">${c.label}</button>`)
    .join("");
  chips.querySelectorAll(".brief-chip").forEach((chip) => {
    chip.addEventListener("click", () => handleBriefChip(chip.dataset.topic));
  });

  document.getElementById("btn-primary-action").onclick = () => {
    state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.id === "h1");
    state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr1");
    renderMap();
    renderPriorities();
    document.getElementById("zone-spatial").scrollIntoView({ behavior: "smooth" });
    showToast("Schedule field inspection at Chainage 142–148");
  };
}

function renderReviewStrip() {
  const strip = document.getElementById("review-strip");
  strip.innerHTML = `
    <h2 class="review-strip-label">Since last review</h2>
    <div class="review-items">
      ${MOCK_CHANGES.sinceLastReview.map((c) => `
        <span class="review-item ${c.tone}">${c.text}</span>`).join("")}
    </div>`;
}

function renderPriorities() {
  const priorities = getFilteredPriorities();
  if (!state.selectedPriority || !priorities.find((p) => p.id === state.selectedPriority.id)) {
    state.selectedPriority = priorities[0] || null;
  }

  document.getElementById("priority-list").innerHTML = priorities
    .map(
      (p) => `
    <div class="priority-item${state.selectedPriority?.id === p.id ? " active" : ""}" data-priority="${p.id}">
      <div class="priority-sev ${p.severity}"></div>
      <div class="priority-body">
        <div class="priority-title">${p.title}</div>
        <div class="priority-sub">${p.subtitle}</div>
      </div>
    </div>`
    )
    .join("");

  document.querySelectorAll("#priority-list .priority-item").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedPriority = priorities.find((p) => p.id === el.dataset.priority);
      if (state.selectedPriority?.title.toLowerCase().includes("ndvi")) {
        state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.id === "h1");
      }
      renderPriorities();
      renderMap();
      renderDetail();
    });
  });

  renderDetail();
}

function renderDetail() {
  const p = state.selectedPriority;
  const h = state.selectedHotspot;
  const el = document.getElementById("context-detail");
  if (!p && !h) {
    el.innerHTML = "";
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const sev = p?.severity || h?.severity || "ok";
  el.className = `detail-card ${sev === "critical" ? "danger" : sev === "high" || sev === "medium" ? "warn" : ""}`;
  el.innerHTML = `
    <h3>${p?.title || h?.name}</h3>
    <p>${p?.detail || h?.detail}</p>`;
}

function renderMapZones() {
  const container = document.getElementById("map-zones");
  if (!container) return;
  const zones = [
    { projectId: "p1", left: 22, top: 38, width: 42, height: 22, label: "KM-48" },
    { projectId: "p2", left: 62, top: 24, width: 28, height: 20, label: "CAMPA" },
    { projectId: "p3", left: 18, top: 52, width: 22, height: 18, label: "Nagar Van" },
  ];
  const visible = new Set(getFilteredProjects().map((p) => p.id));
  container.innerHTML = zones
    .filter((z) => visible.has(z.projectId))
    .map(
      (z) => `
    <div class="map-project-zone${state.selectedHotspot?.projectId === z.projectId ? " active" : ""}"
         style="left:${z.left}%;top:${z.top}%;width:${z.width}%;height:${z.height}%"
         title="${z.label}"></div>`
    )
    .join("");
}

function renderMap() {
  const map = document.getElementById("spatial-map");
  const pins = getFilteredHotspots().filter((h) => {
    if (h.type === "alert" && !state.mapLayers.alerts) return false;
    if (h.type === "stale" && !state.mapLayers.stale) return false;
    if (h.type === "tree" && !state.mapLayers.trees) return false;
    if (h.type === "bio" && !state.mapLayers.bio) return false;
    return true;
  });

  if (!state.selectedHotspot && pins.length) state.selectedHotspot = pins[0];

  map.querySelectorAll(".map-pin").forEach((n) => n.remove());
  renderMapZones();

  pins.forEach((h) => {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = `map-pin ${h.type}${state.selectedHotspot?.id === h.id ? " selected" : ""}`;
    pin.style.left = `${h.left}%`;
    pin.style.top = `${h.top}%`;
    pin.title = h.name;
    pin.setAttribute("aria-label", h.name);
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      state.selectedHotspot = h;
      const linked = getFilteredPriorities().find((p) =>
        h.type === "alert" ? p.title.toLowerCase().includes("ndvi") : p.projectId === h.projectId || p.projectId === "all"
      );
      if (linked) state.selectedPriority = linked;
      renderMap();
      renderPriorities();
      renderDetail();
    });
    map.appendChild(pin);
  });

  const h = state.selectedHotspot;
  document.getElementById("map-label").innerHTML = h
    ? `<strong>${h.name}</strong> · ${h.project}${h.ndvi != null ? ` · NDVI ${h.ndvi} (${h.delta})` : ` · ${h.delta}`}`
    : "Select a location on the map to see detail";
}

function renderMapLayers() {
  document.querySelectorAll(".layer-chip").forEach((chip) => {
    const layer = chip.dataset.layer;
    chip.classList.toggle("on", state.mapLayers[layer]);
    chip.onclick = () => {
      state.mapLayers[layer] = !state.mapLayers[layer];
      renderMapLayers();
      renderMap();
    };
  });
}

function renderRecommendations() {
  document.getElementById("recommend-list").innerHTML = MOCK_RECOMMENDATIONS
    .map(
      (r, i) => `
    <div class="recommend-item${i === 0 ? " priority-1" : ""}" data-rec="${r.id}">
      <div class="recommend-rank">${r.priority}</div>
      <div class="recommend-body">
        <h4>${r.title}</h4>
        <p>${r.detail}</p>
        <div class="recommend-meta">${r.due}</div>
      </div>
    </div>`
    )
    .join("");

  document.querySelectorAll(".recommend-item").forEach((el) => {
    el.addEventListener("click", () => {
      const rec = MOCK_RECOMMENDATIONS.find((r) => r.id === el.dataset.rec);
      showToast(rec.title);
      if (rec.priority === 1) {
        state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.id === "h1");
        state.selectedPriority = getFilteredPriorities()[0];
        document.getElementById("zone-spatial").scrollIntoView({ behavior: "smooth" });
        renderMap();
        renderPriorities();
      }
    });
  });
}

function renderEvidence() {
  const d = getDashboardView();
  document.getElementById("evidence-body").innerHTML = `
    <div class="evidence-pipeline">
      <span class="evidence-step done">Capture</span><span class="evidence-arrow">→</span>
      <span class="evidence-step done">Evidence</span><span class="evidence-arrow">→</span>
      <span class="evidence-step pending">Verify</span><span class="evidence-arrow">→</span>
      <span class="evidence-step">MRV</span><span class="evidence-arrow">→</span>
      <span class="evidence-step">Report</span>
    </div>
    <p class="evidence-summary">
      ${d.compliance.evidence_verified} verified · ${d.compliance.evidence_pending} pending ·
      <strong class="warn-text">${d.compliance.evidence_gaps} gaps</strong> before next scheme export.
      Pit photos missing on 3 CAMPA Block A trees.
    </p>
    <div class="compliance-bar"><div class="compliance-fill" style="width:${d.compliance.avg_readiness_pct}%"></div></div>
    <p class="evidence-readiness">${d.compliance.avg_readiness_pct}% compliance readiness</p>`;
}

function renderCharts() {
  const d = getDashboardView();
  drawAreaChart("chart-carbon", d.carbon_growth, "#6b7f5e");
  drawAreaChart("chart-ndvi", d.ndvi_series, "#b8956b", 0, 1);
  document.getElementById("ndvi-legend").textContent = "12% below 30-day baseline";
  document.getElementById("gauge-row").innerHTML = d.health_distribution
    .slice(0, 3)
    .map(
      (h) => `
    <div class="gauge">
      <div class="gauge-ring" style="--pct:${h.pct}">
        <div class="gauge-ring-inner">${h.pct}%</div>
      </div>
      <div class="gauge-label">${h.label}</div>
    </div>`
    )
    .join("");
}

function drawAreaChart(svgId, series, color, minY, maxY) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const w = 400;
  const h = 140;
  const pad = { t: 12, r: 12, b: 24, l: 36 };
  const vals = series.map((p) => p.value);
  const ymin = minY ?? Math.min(...vals) * 0.95;
  const ymax = maxY ?? Math.max(...vals) * 1.05;
  const xStep = (w - pad.l - pad.r) / (series.length - 1);
  const points = series.map((p, i) => {
    const x = pad.l + i * xStep;
    const y = pad.t + (1 - (p.value - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);
    return `${x},${y}`;
  });
  const area = `${pad.l},${h - pad.b} ${points.join(" ")} ${pad.l + (series.length - 1) * xStep},${h - pad.b}`;
  svg.innerHTML = `
    <defs>
      <linearGradient id="grad-${svgId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${area}" fill="url(#grad-${svgId})"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    ${series.map((p, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (1 - (p.value - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);
      return `<circle cx="${x}" cy="${y}" r="3" fill="#fdfcfa" stroke="${color}" stroke-width="2"/>`;
    }).join("")}
    ${series.map((p, i) => {
      const x = pad.l + i * xStep;
      return `<text x="${x}" y="${h - 6}" text-anchor="middle" font-size="10" fill="#8a918c">${p.label}</text>`;
    }).join("")}`;
}

function renderAlerts() {
  document.getElementById("alert-list").innerHTML = MOCK_ALERTS
    .map(
      (a) => `
    <div class="priority-item">
      <div class="priority-sev ${a.severity === "high" ? "critical" : "medium"}"></div>
      <div class="priority-body">
        <div class="priority-title">${a.title}</div>
        <div class="priority-sub">${a.message}</div>
      </div>
      <span class="activity-time">${a.created_at}</span>
    </div>`
    )
    .join("");
}

function renderActivity() {
  document.getElementById("activity-feed").innerHTML = MOCK_ACTIVITY
    .map(
      (a) => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div>
        <div><strong>${a.title}</strong> · ${a.detail}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>`
    )
    .join("");
}

function renderProjects() {
  document.getElementById("project-breakdown").innerHTML = getFilteredProjects()
    .map(
      (p) => `
    <div class="priority-item">
      <div class="priority-body">
        <div class="priority-title">${p.name}</div>
        <div class="priority-sub">${p.trees.toLocaleString()} trees · integrity ${p.integrityScore} · ${p.progressPct}% of target</div>
      </div>
      <span class="priority-action">${p.openViolations ? p.openViolations + " open" : "On track"}</span>
    </div>`
    )
    .join("");
}

function handleBriefChip(topic) {
  const map = {
    ndvi: () => {
      state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.id === "h1");
      state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr1");
    },
    trees: () => { state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr2"); },
    satellite: () => { state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr3"); },
    bio: () => {
      state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.id === "h5");
      state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr4");
    },
    fire: () => showToast("Fire watch: 3 VIIRS detections within 25 km of KM-48"),
  };
  map[topic]?.();
  renderMap();
  renderPriorities();
  document.getElementById("zone-spatial").scrollIntoView({ behavior: "smooth" });
}

function applyFilters() {
  renderFilters();
  renderBrief();
  renderReviewStrip();
  renderPriorities();
  renderMap();
  renderRecommendations();
  renderEvidence();
  renderCharts();
  renderProjects();
}

function renderAll() {
  renderFilters();
  renderBrief();
  renderReviewStrip();
  renderPriorities();
  renderMap();
  renderRecommendations();
  renderEvidence();
  renderCharts();
  renderAlerts();
  renderActivity();
  renderProjects();
}

function setAppState(mode) {
  const content = document.getElementById("main-content");
  content.classList.remove("is-error", "is-empty");
  state.error = state.empty = false;
  if (mode === "error") { content.classList.add("is-error"); state.error = true; }
  else if (mode === "empty") { content.classList.add("is-empty"); state.empty = true; }
}

function hideLoading() {
  document.getElementById("loading-overlay").classList.add("hidden");
  state.loading = false;
}

function bindGlobal() {
  document.getElementById("menu-toggle").addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    document.getElementById("sidebar").classList.toggle("open", state.sidebarOpen);
  });

  document.getElementById("filter-project").addEventListener("change", (e) => {
    state.filters.project = e.target.value;
    if (e.target.value !== "all") state.filters.scheme = "all";
    applyFilters();
  });
  document.getElementById("filter-scheme").addEventListener("change", (e) => {
    state.filters.scheme = e.target.value;
    if (e.target.value !== "all") state.filters.project = "all";
    applyFilters();
  });
  document.getElementById("filter-time").addEventListener("change", (e) => {
    state.filters.time = e.target.value;
    applyFilters();
  });

  document.getElementById("btn-alerts").addEventListener("click", () => showToast("Open alerts"));
  document.getElementById("btn-retry").addEventListener("click", () => {
    setAppState("ok");
    renderAll();
  });
  document.querySelectorAll("[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => showToast(`Open ${btn.dataset.route}`));
  });

  setInterval(() => {
    if (state.loading || state.error) return;
    document.getElementById("live-updated").textContent = `Updated ${Math.floor(Math.random() * 4) + 1} min ago`;
  }, 45000);
}

function init() {
  const demoState = new URLSearchParams(window.location.search).get("state");
  document.getElementById("user-name").textContent = MOCK_USER.full_name;
  document.getElementById("user-org").textContent = MOCK_USER.organization_name;
  document.getElementById("avatar").textContent = MOCK_USER.full_name.split(" ").map((n) => n[0]).join("");

  renderSidebar();
  renderMapLayers();
  bindGlobal();

  setTimeout(() => {
    hideLoading();
    if (demoState === "error") setAppState("error");
    else if (demoState === "empty") setAppState("empty");
    else {
      state.selectedHotspot = MOCK_MAP_HOTSPOTS[0];
      state.selectedPriority = MOCK_PRIORITIES[0];
      renderAll();
    }
  }, 600);
}

document.addEventListener("DOMContentLoaded", init);
