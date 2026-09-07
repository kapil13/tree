/**
 * Aranyix Web Home — Forest Intelligence Command Center
 * Speak first, explore second.
 */

const state = {
  selectedHotspot: null,
  selectedPriority: null,
  selectedMetric: null,
  mapLayers: { trees: true, alerts: true, stale: true, bio: true },
  sidebarOpen: false,
  filters: {
    project: "all",
    scheme: "all",
    time: "30d",
  },
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

function fmtNum(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtCo2e(kg) {
  const t = kg / 1000;
  return t >= 100 ? `${t.toFixed(0)}` : t.toFixed(1);
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 2800);
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
  if (state.filters.project === "all" && state.filters.scheme === "all") {
    return MOCK_MAP_HOTSPOTS;
  }
  return MOCK_MAP_HOTSPOTS.filter((h) => ids.has(h.projectId));
}

function getFilteredPriorities() {
  const projects = getFilteredProjects();
  const ids = new Set(projects.map((p) => p.id));
  if (state.filters.project === "all" && state.filters.scheme === "all") {
    return MOCK_PRIORITIES;
  }
  return MOCK_PRIORITIES.filter((p) => p.projectId === "all" || ids.has(p.projectId));
}

function getDashboardView() {
  const d = { ...MOCK_DASHBOARD, kpi: { ...MOCK_DASHBOARD.kpi }, forestIntegrity: { ...MOCK_DASHBOARD.forestIntegrity } };
  const projects = getFilteredProjects();
  if (projects.length === 1) {
    const p = projects[0];
    d.forestIntegrity.score = p.integrityScore;
    d.kpi.total_trees = p.trees;
    d.fieldOps = { ...d.fieldOps, open_violations: p.openViolations, survival_due: p.survivalDue };
  } else if (projects.length < MOCK_PROJECTS.length) {
    d.kpi.total_trees = projects.reduce((s, p) => s + p.trees, 0);
    d.fieldOps.open_violations = projects.reduce((s, p) => s + p.openViolations, 0);
    d.fieldOps.survival_due = projects.reduce((s, p) => s + p.survivalDue, 0);
    d.forestIntegrity.score = Math.round(projects.reduce((s, p) => s + p.integrityScore, 0) / projects.length);
  }
  return d;
}

function getFilterContextLabel() {
  const proj = state.filters.project !== "all"
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
    ${g.items
      .map(
        (item) => `
      <button type="button" class="nav-item${item.active ? " active" : ""}" data-nav="${item.id}">
        <span class="icon">${item.icon}</span>${item.label}
      </button>`
      )
      .join("")}`
    )
    .join("");

  nav.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.nav !== "dashboard") {
        showToast(`Prototype: would navigate to /${btn.dataset.nav}`);
      }
      if (window.innerWidth <= 768) {
        state.sidebarOpen = false;
        document.getElementById("sidebar").classList.remove("open");
      }
    });
  });
}

function renderFilters() {
  const projectSel = document.getElementById("filter-project");
  projectSel.innerHTML = `<option value="all">All Projects</option>${MOCK_PROJECTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}`;
  projectSel.value = state.filters.project;

  const schemeSel = document.getElementById("filter-scheme");
  schemeSel.innerHTML = MOCK_SCHEMES.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  schemeSel.value = state.filters.scheme;

  document.getElementById("filter-time").value = state.filters.time;
  document.getElementById("filter-context-label").textContent = getFilterContextLabel();
}

function renderNarrative() {
  const d = getDashboardView();
  document.getElementById("narrative-score").textContent = d.forestIntegrity.score;
  const trendEl = document.getElementById("narrative-trend");
  trendEl.textContent = `${d.forestIntegrity.trend > 0 ? "+" : ""}${d.forestIntegrity.trend} vs last week`;
  trendEl.className = `trend ${d.forestIntegrity.trend < 0 ? "down" : d.forestIntegrity.trend > 0 ? "up" : "flat"}`;
  document.getElementById("operational-status").textContent = d.statusLabel;
  document.getElementById("narrative-headline").innerHTML = d.narrative.headline;
  document.getElementById("narrative-support").innerHTML = d.narrative.support;
  document.getElementById("live-updated").textContent = `Updated ${d.updatedAt}`;
  document.getElementById("alert-badge").textContent = d.unreadAlerts;

  const chips = document.getElementById("brief-chips");
  chips.innerHTML = MOCK_BRIEF_CHIPS
    .map((c) => `<button type="button" class="brief-chip ${c.class}" data-topic="${c.topic}">${c.label}</button>`)
    .join("");

  chips.querySelectorAll(".brief-chip").forEach((chip) => {
    chip.addEventListener("click", () => handleBriefChip(chip.dataset.topic));
  });
}

function renderHealth() {
  const d = getDashboardView();
  const metrics = [
    { id: "trees", label: "Trees registered", value: d.kpi.total_trees.toLocaleString(), hint: `${d.kpi.pct_healthy}% healthy` },
    { id: "co2", label: "CO₂e stored (est.)", value: `${fmtCo2e(d.kpi.total_co2e_kg)} t`, hint: `+${fmtCo2e(d.kpi.annual_sequestration_kg)} t/yr seq.` },
    { id: "violations", label: "Open violations", value: d.fieldOps.open_violations, hint: `${d.compliance.blocking_violations} blocking export` },
    { id: "alerts", label: "Unread alerts", value: d.unreadAlerts, hint: "3 high severity" },
    { id: "integrity", label: "Forest integrity", value: `${d.monitoring.sar_avg_forest_integrity}`, hint: `${d.monitoring.sar_at_risk_work_areas} area at risk`, trend: d.forestIntegrity.trend },
  ];

  const strip = document.getElementById("health-strip");
  strip.innerHTML = metrics
    .map(
      (m) => `
    <div class="health-metric${state.selectedMetric === m.id ? " selected" : ""}" data-metric="${m.id}">
      <div class="label">${m.label}</div>
      <div class="value">${m.value}</div>
      <div class="hint">${m.hint}</div>
      ${m.trend != null ? `<div class="trend ${m.trend < 0 ? "down" : m.trend > 0 ? "up" : "flat"}">${m.trend > 0 ? "+" : ""}${m.trend} pts</div>` : ""}
    </div>`
    )
    .join("");

  strip.querySelectorAll(".health-metric").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedMetric = el.dataset.metric;
      renderHealth();
      showToast(`Metric focus: ${el.querySelector(".label").textContent}`);
    });
  });
}

function renderChanges() {
  const grid = document.getElementById("changes-grid");
  const timeNote = state.filters.time === "today" ? "yesterday" : "last review";
  grid.innerHTML = `
    <div class="change-card">
      <h3>Since ${state.filters.time === "today" ? "yesterday" : "yesterday"}</h3>
      ${MOCK_CHANGES.sinceYesterday.map((c) => changeItemHtml(c)).join("")}
    </div>
    <div class="change-card">
      <h3>Since ${timeNote}</h3>
      ${MOCK_CHANGES.sinceLastReview.map((c) => changeItemHtml(c)).join("")}
    </div>`;
}

function changeItemHtml(c) {
  return `
    <div class="change-item">
      <div class="change-icon ${c.icon}">${c.icon === "up" ? "↑" : c.icon === "down" ? "↓" : c.icon === "info" ? "◎" : "·"}</div>
      <div class="change-text"><strong>${c.text}</strong><span>${c.sub}</span></div>
    </div>`;
}

function renderPriorities() {
  const priorities = getFilteredPriorities();
  if (!state.selectedPriority || !priorities.find((p) => p.id === state.selectedPriority.id)) {
    state.selectedPriority = priorities[0] || null;
  }

  const list = document.getElementById("priority-list");
  list.innerHTML = priorities
    .map(
      (p) => `
    <div class="priority-item${state.selectedPriority?.id === p.id ? " active" : ""}" data-priority="${p.id}">
      <div class="priority-sev ${p.severity}"></div>
      <div class="priority-body">
        <div class="priority-title">${p.title}</div>
        <div class="priority-sub">${p.subtitle}</div>
      </div>
      <span class="priority-action">${p.action} →</span>
    </div>`
    )
    .join("");

  list.querySelectorAll(".priority-item").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedPriority = priorities.find((p) => p.id === el.dataset.priority);
      const hotspot = MOCK_MAP_HOTSPOTS.find((h) =>
        state.selectedPriority?.title.toLowerCase().includes("ndvi") ? h.id === "h1" : false
      );
      if (hotspot) state.selectedHotspot = hotspot;
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
    <h4>${p?.title || h?.name}</h4>
    <p>${p?.detail || h?.detail}</p>
    ${h && h.ndvi != null ? `<p style="margin-top:8px"><strong>Spatial:</strong> NDVI ${h.ndvi} · ${h.delta}</p>` : ""}
    ${h && h.type === "bio" ? `<p style="margin-top:8px"><strong>Biodiversity:</strong> ${h.detail}</p>` : ""}
    <div class="detail-actions">
      ${(p?.links || ["View details", "Open map"]).map((l) => `<button type="button" class="btn btn-secondary" data-action="${l}">${l}</button>`).join("")}
    </div>`;

  el.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => showToast(`Prototype: ${btn.dataset.action}`));
  });
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

  const projects = getFilteredProjects();
  document.getElementById("map-legend").textContent = `${projects.length} project${projects.length !== 1 ? "s" : ""} · ${pins.length} hotspot${pins.length !== 1 ? "s" : ""}`;

  const h = state.selectedHotspot;
  const label = document.getElementById("map-label");
  label.innerHTML = h
    ? `<strong>${h.name}</strong> · ${h.project}${h.ndvi != null ? ` · NDVI ${h.ndvi} (${h.delta})` : ` · ${h.delta}`}`
    : `${getDashboardView().unreadAlerts} alerts across portfolio · select a pin to explore`;
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

function renderWhy() {
  const d = getDashboardView();
  document.getElementById("why-narrative").innerHTML = d.narrative.why;
  document.getElementById("bio-story").innerHTML = d.narrative.bioStory;

  document.getElementById("intel-satellite").innerHTML = `
    <div class="intel-label">Satellite</div>
    <div class="intel-value">${d.monitoring.stale_satellite_work_areas} stale</div>
    <div class="intel-line">${d.monitoring.sar_aligned_work_areas} aligned · ${d.monitoring.sar_at_risk_work_areas} at risk · ${d.monitoring.sar_divergent_work_areas} divergent</div>`;

  document.getElementById("intel-bio").innerHTML = `
    <div class="intel-label">Bioacoustic & biodiversity</div>
    <div class="intel-value">${d.bioacoustic.total_species_detected} species</div>
    <div class="intel-line">Health ${d.bioacoustic.avg_health_score}/100 · Shannon ${d.bioacoustic.avg_shannon_index} · ${d.bioacoustic.threatened_species_count} threatened</div>`;

  document.getElementById("intel-carbon").innerHTML = `
    <div class="intel-label">Carbon</div>
    <div class="intel-value">${fmtCo2e(d.kpi.total_co2e_kg)} tCO₂e</div>
    <div class="intel-line">${d.kpi.lifetime_credits_tco2e.toLocaleString()} credits issued · portfolio trajectory ↑</div>`;

  document.getElementById("intel-compliance").innerHTML = `
    <div class="intel-label">Compliance & MRV</div>
    <div class="intel-value">${d.compliance.avg_readiness_pct}% ready</div>
    <div class="intel-line">${d.compliance.evidence_gaps} evidence gaps · ${d.compliance.blocking_violations} blocking</div>
    <div class="compliance-bar"><div class="compliance-fill" style="width:${d.compliance.avg_readiness_pct}%"></div></div>`;

  const atRisk = d.monitoring.sar_at_risk_work_areas > 0;
  document.getElementById("intel-satellite").classList.toggle("highlight", atRisk);

  document.querySelectorAll(".intel-card").forEach((card) => {
    card.onclick = () => showToast(`Prototype: open ${card.dataset.intel} module`);
  });
}

function renderRecommendations() {
  const list = document.getElementById("recommend-list");
  list.innerHTML = MOCK_RECOMMENDATIONS
    .map(
      (r) => `
    <div class="recommend-item priority-${r.priority}" data-rec="${r.id}">
      <div class="recommend-rank">${r.priority}</div>
      <div class="recommend-body">
        <h4>${r.title}</h4>
        <p>${r.detail}</p>
        <div class="recommend-meta">Module: ${r.module} · ${r.due}</div>
      </div>
      <span class="recommend-action">Take action →</span>
    </div>`
    )
    .join("");

  list.querySelectorAll(".recommend-item").forEach((el) => {
    el.addEventListener("click", () => {
      const rec = MOCK_RECOMMENDATIONS.find((r) => r.id === el.dataset.rec);
      showToast(`Prototype: ${rec.title}`);
      if (rec.module === "field-ops") {
        state.selectedPriority = getFilteredPriorities()[0];
        document.getElementById("zone-spatial").scrollIntoView({ behavior: "smooth" });
        renderPriorities();
        renderMap();
      }
    });
  });
}

function renderEvidence() {
  const d = getDashboardView();
  document.getElementById("evidence-body").innerHTML = `
    <div class="evidence-pipeline">
      <span class="evidence-step done">Capture</span>
      <span class="evidence-arrow">→</span>
      <span class="evidence-step done">Evidence</span>
      <span class="evidence-arrow">→</span>
      <span class="evidence-step pending">Verify</span>
      <span class="evidence-arrow">→</span>
      <span class="evidence-step">MRV</span>
      <span class="evidence-arrow">→</span>
      <span class="evidence-step">Report</span>
    </div>
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.55">
      <strong>${d.compliance.evidence_verified} verified</strong> · ${d.compliance.evidence_pending} pending ·
      <strong style="color:var(--status-warn)">${d.compliance.evidence_gaps} gaps</strong> blocking next scheme KPI export.
      Pit photo missing on 3 CAMPA Block A trees.
    </p>
    <div class="detail-actions">
      <button type="button" class="btn btn-primary" data-action="resolve">Resolve gaps</button>
      <button type="button" class="btn btn-secondary" data-action="brsr">BRSR Principle 6</button>
    </div>`;

  document.getElementById("evidence-body").querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => showToast(`Prototype: ${btn.dataset.action}`));
  });
}

function renderCharts() {
  const d = getDashboardView();
  const carbonColor = "#6b7f5e";
  const ndviColor = "#b8956b";
  drawAreaChart("chart-carbon", d.carbon_growth, carbonColor);
  drawAreaChart("chart-ndvi", d.ndvi_series, ndviColor, 0, 1);

  const gauges = document.getElementById("gauge-row");
  gauges.innerHTML = d.health_distribution
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
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${area}" fill="url(#grad-${svgId})" class="chart-area"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chart-line"/>
    ${series.map((p, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (1 - (p.value - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#fdfcfa" stroke="${color}" stroke-width="2"><title>${p.label}: ${p.value}</title></circle>`;
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
    <div class="priority-item" data-alert="${a.id}">
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
    <div class="activity-item" data-activity="${a.id}">
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
  const projects = getFilteredProjects();
  document.getElementById("project-breakdown").innerHTML = projects
    .map(
      (p) => `
    <div class="priority-item">
      <div class="priority-body">
        <div class="priority-title">${p.name}</div>
        <div class="priority-sub">${p.trees.toLocaleString()} trees · integrity ${p.integrityScore} · ${p.progressPct}% target</div>
      </div>
      <span class="priority-action">${p.openViolations ? p.openViolations + " open" : "On track"}</span>
    </div>`
    )
    .join("");
}

function handleBriefChip(topic) {
  if (topic === "ndvi") {
    state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.id === "h1");
    state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr1") || getFilteredPriorities()[0];
  } else if (topic === "trees") {
    state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr2") || getFilteredPriorities()[0];
  } else if (topic === "satellite") {
    state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr3") || getFilteredPriorities()[0];
  } else if (topic === "bio") {
    state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.id === "h5");
    state.selectedPriority = getFilteredPriorities().find((p) => p.id === "pr4") || getFilteredPriorities()[0];
  } else if (topic === "fire") {
    showToast("Prototype: Fire watch — 3 VIIRS detections within 25 km");
  }
  renderMap();
  renderPriorities();
  document.getElementById("zone-spatial").scrollIntoView({ behavior: "smooth" });
}

function applyFilters() {
  renderFilters();
  renderNarrative();
  renderHealth();
  renderChanges();
  renderPriorities();
  renderMap();
  renderWhy();
  renderRecommendations();
  renderEvidence();
  renderCharts();
  renderProjects();
  showToast(`Context updated: ${getFilterContextLabel()}`);
}

function renderAll() {
  renderFilters();
  renderNarrative();
  renderHealth();
  renderChanges();
  renderPriorities();
  renderMap();
  renderWhy();
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
  state.error = false;
  state.empty = false;
  if (mode === "error") {
    content.classList.add("is-error");
    state.error = true;
  } else if (mode === "empty") {
    content.classList.add("is-empty");
    state.empty = true;
  }
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
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
    if (e.target.value === "custom") showToast("Prototype: custom date range picker");
    applyFilters();
  });

  document.getElementById("btn-alerts").addEventListener("click", () => showToast("Prototype: /alerts"));
  document.getElementById("btn-retry").addEventListener("click", () => {
    setAppState("ok");
    renderAll();
    showToast("Command center reloaded");
  });

  document.querySelectorAll("[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => showToast(`Prototype: ${btn.dataset.route}`));
  });

  document.getElementById("spatial-map").addEventListener("click", (e) => {
    if (e.target.closest(".map-pin") || e.target.closest(".layer-chip")) return;
    showToast("Prototype: full map view with tree/alert/bio layers");
  });

  setInterval(() => {
    if (state.loading || state.error) return;
    const mins = Math.floor(Math.random() * 4) + 1;
    document.getElementById("live-updated").textContent = `Updated ${mins} min ago`;
  }, 45000);
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const demoState = params.get("state");

  document.getElementById("user-name").textContent = MOCK_USER.full_name;
  document.getElementById("user-org").textContent = MOCK_USER.organization_name;
  document.getElementById("avatar").textContent = MOCK_USER.full_name.split(" ").map((n) => n[0]).join("");

  renderSidebar();
  renderMapLayers();
  bindGlobal();

  setTimeout(() => {
    hideLoading();
    if (demoState === "error") {
      setAppState("error");
    } else if (demoState === "empty") {
      setAppState("empty");
    } else {
      state.selectedHotspot = MOCK_MAP_HOTSPOTS[0];
      state.selectedPriority = MOCK_PRIORITIES[0];
      renderAll();
    }
  }, 700);
}

document.addEventListener("DOMContentLoaded", init);
