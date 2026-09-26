/**
 * Aranyix Command Center — visual operational dashboard
 */

const state = {
  project: "all",
  scheme: "all",
  time: "30d",
  selectedHotspot: null,
  selectedAlert: null,
  layers: { health: true, ndvi: true, alerts: true, satellite: true, bio: true, field: true },
  loading: true,
};

function $(id) { return document.getElementById(id); }

function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function getProjects() {
  if (state.project !== "all") return MOCK_PROJECTS.filter((p) => p.id === state.project);
  if (state.scheme !== "all") return MOCK_PROJECTS.filter((p) => p.schemeId === state.scheme);
  return MOCK_PROJECTS;
}

function getData() {
  const d = JSON.parse(JSON.stringify(MOCK_DASHBOARD));
  const projects = getProjects();
  if (projects.length === 1) {
    const p = projects[0];
    d.forestIntegrity.score = p.integrityScore;
    d.forestIntegrity.trend = p.integrityTrend;
    d.kpi.total_trees = p.trees;
  } else if (projects.length < MOCK_PROJECTS.length) {
    d.kpi.total_trees = projects.reduce((s, p) => s + p.trees, 0);
    d.forestIntegrity.score = Math.round(projects.reduce((s, p) => s + p.integrityScore, 0) / projects.length);
  }
  return d;
}

function getHotspots() {
  const ids = new Set(getProjects().map((p) => p.id));
  if (state.project === "all" && state.scheme === "all") return MOCK_MAP_HOTSPOTS;
  return MOCK_MAP_HOTSPOTS.filter((h) => ids.has(h.projectId));
}

function getAlerts() {
  const ids = new Set(getProjects().map((p) => p.id));
  return MOCK_ALERTS.filter((a) => a.projectId === "all" || ids.has(a.projectId));
}

function renderSidebar() {
  $("sidebar-nav").innerHTML = NAV_GROUPS.map((g) => `
    <div class="nav-group-label">${g.label}</div>
    ${g.items.map((i) => `<button type="button" class="nav-item${i.active ? " active" : ""}" data-nav="${i.id}"><span class="icon">${i.icon}</span>${i.label}</button>`).join("")}
  `).join("");
  $("sidebar-nav").querySelectorAll(".nav-item").forEach((b) => {
    b.onclick = () => { if (b.dataset.nav !== "dashboard") showToast(b.textContent.trim()); };
  });
}

function renderFilters() {
  $("filter-project").innerHTML = `<option value="all">All Projects</option>${MOCK_PROJECTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}`;
  $("filter-project").value = state.project;
  $("filter-scheme").innerHTML = MOCK_SCHEMES.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  $("filter-scheme").value = state.scheme;
  $("filter-time").value = state.time;
}

function renderHealth() {
  const d = getData();
  $("integrity-score").textContent = d.forestIntegrity.score;
  const arc = $("gauge-arc");
  const { circ, offset } = Charts.gaugeArc(d.forestIntegrity.score);
  arc.style.strokeDasharray = circ;
  arc.style.strokeDashoffset = offset;
  const t = d.forestIntegrity.trend;
  $("integrity-trend").textContent = `${t > 0 ? "+" : ""}${t}`;
  $("integrity-trend").className = `delta ${t < 0 ? "down" : t > 0 ? "up" : ""}`;
  $("status-pill").textContent = d.statusLabel;
  $("status-pill").className = `status-pill ${d.forestIntegrity.score < 70 ? "crit" : d.forestIntegrity.score < 80 ? "warn" : "ok"}`;
  $("live-updated").textContent = d.updatedAt.replace(" ago", "").replace("Updated ", "").replace(" min", "m");
  $("alert-badge").textContent = d.unreadAlerts;

  $("health-dist").innerHTML = `<span class="dist-label">Health</span>${d.health_distribution.map((x) =>
    `<div class="dist-seg" style="width:${x.pct}%;background:${x.color}" title="${x.label} ${x.pct}%"></div>`).join("")}`;
  $("risk-dist").innerHTML = `<span class="dist-label">Risk</span>${d.risk_distribution.map((x) =>
    `<div class="dist-seg" style="width:${x.pct}%;background:${x.color}" title="${x.label} ${x.pct}%"></div>`).join("")}`;

  const sp = d.kpi_sparklines;
  const items = [
    { id: "trees", label: "Trees", val: d.kpi.total_trees.toLocaleString(), delta: `+${d.kpi.trees_delta}`, spark: sp.trees, color: "#5c7a6e" },
    { id: "co2", label: "CO₂e (t)", val: (d.kpi.total_co2e_kg / 1000).toFixed(1), delta: `+${d.kpi.co2e_delta_pct}%`, spark: sp.co2e, color: "#6b7f5e" },
    { id: "attention", label: "Attention", val: d.kpi.trees_attention, delta: `+${d.kpi.trees_attention_delta}`, spark: [10, 12, 14, 15, 16, 18], color: "#c4705a" },
    { id: "violations", label: "Violations", val: d.fieldOps.open_violations, delta: "0", spark: sp.violations, color: "#b8956b" },
  ];
  $("kpi-strip").innerHTML = items.map((k) => `
    <div class="kpi-cell" data-kpi="${k.id}">
      <div class="kpi-top"><span class="kpi-label">${k.label}</span><span class="kpi-delta">${k.delta}</span></div>
      <div class="kpi-val">${k.val}</div>
      <svg class="kpi-spark" viewBox="0 0 80 24" data-spark="${k.id}"></svg>
    </div>`).join("");
  items.forEach((k) => {
    const svg = $(`kpi-strip`).querySelector(`[data-spark="${k.id}"]`);
    if (svg) Charts.sparkline(svg, k.spark, k.color, { width: 80, height: 24, pad: 2 });
  });
}

function renderMap() {
  const projects = getProjects();
  const hotspots = getHotspots().filter((h) => {
    if (h.type === "alert" && !state.layers.alerts) return false;
    if (h.type === "stale" && !state.layers.satellite) return false;
    if (h.type === "field" && !state.layers.field) return false;
    if (h.type === "tree" && !state.layers.health) return false;
    if (h.type === "bio" && !state.layers.bio) return false;
    return true;
  });

  if (!state.selectedHotspot && hotspots.length) state.selectedHotspot = hotspots[0];

  $("map-zones").innerHTML = projects.map((p) => {
    const z = p.mapZone;
    const active = state.selectedHotspot?.projectId === p.id || state.project === p.id;
    return `<button type="button" class="map-zone${active ? " active" : ""}" data-project="${p.id}"
      style="left:${z.left}%;top:${z.top}%;width:${z.width}%;height:${z.height}%"
      title="${p.name} · ${p.integrityScore}/100"><span>${p.shortName}</span></button>`;
  }).join("");

  $("map-pins").innerHTML = hotspots.map((h) => `
    <button type="button" class="pin ${h.type}${state.selectedHotspot?.id === h.id ? " sel" : ""}"
      style="left:${h.left}%;top:${h.top}%" data-id="${h.id}" title="${h.name}"></button>`).join("");

  const heatOn = state.layers.ndvi;
  $("map-heatmap").classList.toggle("on", heatOn);
  if (heatOn) {
    $("map-heatmap").innerHTML = `<div class="heat stress" style="left:34%;top:40%;width:18%;height:14%"></div>
      <div class="heat ok" style="left:68%;top:28%;width:14%;height:12%"></div>
      <div class="heat warn" style="left:22%;top:56%;width:12%;height:10%"></div>`;
  }

  $("map-zones").querySelectorAll(".map-zone").forEach((z) => {
    z.onclick = () => selectProject(z.dataset.project);
  });
  $("map-pins").querySelectorAll(".pin").forEach((p) => {
    p.onclick = (e) => {
      e.stopPropagation();
      selectHotspot(MOCK_MAP_HOTSPOTS.find((h) => h.id === p.dataset.id));
    };
  });

  updateMapContext();
}

function updateMapContext() {
  const h = state.selectedHotspot;
  const d = getData();
  if (h) {
    $("ctx-project").textContent = MOCK_PROJECTS.find((p) => p.id === h.projectId)?.shortName || h.name;
    $("ctx-ndvi").textContent = h.ndvi != null ? `NDVI ${h.ndvi} (${h.delta > 0 ? "+" : ""}${h.delta}%)` : `Bio ${h.delta}%`;
    $("map-tooltip").innerHTML = `<strong>${h.name}</strong> · ${h.type}${h.ndvi != null ? ` · ${h.ndvi}` : ""}`;
    $("map-tooltip").classList.add("show");
  } else {
    $("ctx-project").textContent = state.project !== "all" ? MOCK_PROJECTS.find((p) => p.id === state.project)?.name : "All projects";
    $("ctx-ndvi").textContent = `NDVI avg ${(d.ndvi_series.at(-1)?.value ?? 0).toFixed(2)}`;
    $("map-tooltip").classList.remove("show");
  }
  $("ctx-alerts").textContent = `${getAlerts().filter((a) => a.status !== "completed").length} alerts`;
}

function selectProject(id) {
  state.project = state.project === id && id !== "all" ? "all" : id;
  state.scheme = "all";
  $("filter-project").value = state.project;
  state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.projectId === state.project) || getHotspots()[0];
  refresh();
}

function selectHotspot(h) {
  state.selectedHotspot = h;
  state.selectedAlert = getAlerts().find((a) => a.projectId === h.projectId || a.location.includes(h.name.split(" ")[0]));
  renderMap();
  renderTrends();
  renderOps();
  highlightCharts();
}

function renderOps() {
  const alerts = getAlerts();
  $("alert-queue").innerHTML = alerts.map((a) => `
    <button type="button" class="alert-row ${a.severity}${a.status === "completed" ? " done" : ""}${a.status === "overdue" ? " overdue" : ""}${state.selectedAlert?.id === a.id ? " sel" : ""}"
      data-id="${a.id}">
      <span class="sev-bar"></span>
      <span class="alert-title">${a.title}</span>
      <span class="alert-loc">${a.location}</span>
      <span class="alert-trend ${a.trend}">${a.trend === "up" ? "↑" : a.trend === "down" ? "↓" : "·"}</span>
      <span class="alert-due">${a.due}</span>
    </button>`).join("");

  $("alert-queue").querySelectorAll(".alert-row").forEach((r) => {
    r.onclick = () => {
      state.selectedAlert = alerts.find((a) => a.id === r.dataset.id);
      const h = MOCK_MAP_HOTSPOTS.find((x) => x.projectId === state.selectedAlert.projectId);
      if (h) state.selectedHotspot = h;
      renderMap();
      renderOps();
      showToast(`${state.selectedAlert.action}: ${state.selectedAlert.title}`);
    };
  });

  const d = getData();
  $("delta-chips").innerHTML = [
    { t: "down", l: `Integrity ${d.forestIntegrity.trend}` },
    { t: "down", l: "NDVI −12%" },
    { t: "warn", l: "5 stale" },
    { t: "up", l: "+43.5t C" },
  ].map((c) => `<span class="dchip ${c.t}">${c.l}</span>`).join("");
}

function renderTrends() {
  const d = getData();
  const h = state.selectedHotspot;
  const ndvi = h?.ndvi ?? d.ndvi_series.at(-1).value;
  $("ndvi-val").textContent = ndvi.toFixed ? ndvi.toFixed(2) : ndvi;
  $("ndvi-val").className = `chart-val ${h?.delta < 0 || d.ndvi_series.at(-1).value < 0.62 ? "down" : ""}`;
  $("canopy-val").textContent = `${d.canopy_series.at(-1).value}%`;
  $("survival-val").textContent = `${d.survival_series.at(-1).value}%`;
  $("sat-val").textContent = `${d.satellite_freshness.at(-1).value}%`;
  $("sat-val").className = `chart-val ${d.satellite_freshness.at(-1).value < 80 ? "warn" : ""}`;
  $("anomaly-val").textContent = d.anomaly_series.at(-1).value;

  Charts.sparkline($("chart-ndvi"), d.ndvi_series, "#5a8a94", { min: 0.5, max: 0.72 });
  Charts.sparkline($("chart-canopy"), d.canopy_series, "#5c7a6e", { min: 80, max: 90 });
  Charts.sparkline($("chart-survival"), d.survival_series, "#6b7f5e", { min: 85, max: 95 });
  Charts.sparkline($("chart-satellite"), d.satellite_freshness, "#b8956b", { min: 65, max: 95 });
  Charts.sparkline($("chart-anomaly"), d.anomaly_series, "#c4705a", { min: 0, max: 10 });

  bindChartHover("chart-ndvi", d.ndvi_series);
  bindChartHover("chart-canopy", d.canopy_series);
}

function highlightCharts() {
  document.querySelectorAll(".chart-panel").forEach((p) => p.classList.remove("highlight"));
  if (state.selectedHotspot?.type === "alert" || state.selectedHotspot?.type === "stale") {
    document.querySelector('[data-chart="ndvi"]')?.classList.add("highlight");
    document.querySelector('[data-chart="satellite"]')?.classList.add("highlight");
  }
  if (state.selectedHotspot?.type === "bio") {
    document.querySelector(".analytics-grid .panel")?.classList.add("highlight");
  }
}

function renderBioCarbonMrv() {
  const d = getData();
  $("bio-species").textContent = `${d.bioacoustic.total_species_detected} sp.`;
  $("bio-shannon").textContent = d.bioacoustic.avg_shannon_index;
  $("bio-chorus").textContent = `${d.bioacoustic.chorus_activity_pct}%`;
  $("bio-threat").textContent = d.bioacoustic.threatened_species_count;
  Charts.sparkline($("chart-bio"), d.bio_activity_series, "#5a8a94", { width: 280, height: 48 });
  Charts.bars($("chart-bio-obs"), d.bio_observations, "#5c7a6e");

  $("carbon-current").textContent = d.carbon_trajectory.historical.at(-1).value;
  $("carbon-target").textContent = d.carbon_trajectory.target;
  $("carbon-track").textContent = d.carbon_trajectory.on_track ? "On track" : "Off track";
  $("carbon-track").className = `track-pill ${d.carbon_trajectory.on_track ? "on" : "off"}`;
  Charts.carbon($("chart-carbon"), d.carbon_trajectory);

  $("mrv-ready").textContent = `${d.compliance.avg_readiness_pct}%`;
  $("mrv-verified").textContent = d.compliance.evidence_verified;
  $("mrv-gaps").textContent = d.compliance.evidence_gaps;
  $("mrv-pending").textContent = d.compliance.evidence_pending;
  $("mrv-pipeline").innerHTML = d.mrv_pipeline.map((s, i) => `
    <button type="button" class="mrv-stage ${s.status}" data-stage="${s.stage}" style="flex:${s.pct}">
      <span class="mrv-name">${s.stage}</span>
      <span class="mrv-pct">${s.pct}%</span>
      ${s.gaps ? `<span class="mrv-gap">${s.gaps} gap</span>` : ""}
    </button>${i < d.mrv_pipeline.length - 1 ? '<span class="mrv-arrow">›</span>' : ""}`).join("");
  $("mrv-pipeline").querySelectorAll(".mrv-stage").forEach((s) => {
    s.onclick = () => showToast(`MRV: ${s.dataset.stage}`);
  });
}

function renderActivity() {
  $("activity-timeline").innerHTML = MOCK_ACTIVITY.map((a) => `
    <div class="tl-item ${a.type}" style="--offset:${a.offset}%">
      <span class="tl-dot"></span>
      <span class="tl-label">${a.label}</span>
      <span class="tl-meta">${a.meta}</span>
      <span class="tl-time">${a.time}</span>
    </div>`).join("");
}

function renderProjectStrip() {
  $("project-strip").innerHTML = getProjects().map((p) => `
    <button type="button" class="proj-chip${state.project === p.id ? " sel" : ""}" data-project="${p.id}">
      <span class="proj-name">${p.shortName}</span>
      <span class="proj-score">${p.integrityScore}</span>
      <span class="proj-trend ${p.integrityTrend < 0 ? "down" : "up"}">${p.integrityTrend > 0 ? "+" : ""}${p.integrityTrend}</span>
      <span class="proj-ndvi ${p.ndviDelta < 0 ? "down" : ""}">NDVI ${p.ndviDelta > 0 ? "+" : ""}${p.ndviDelta}%</span>
    </button>`).join("");
  $("project-strip").querySelectorAll(".proj-chip").forEach((c) => {
    c.onclick = () => selectProject(c.dataset.project === state.project ? "all" : c.dataset.project);
  });
}

function bindChartHover(svgId, series) {
  const svg = $(svgId);
  if (!svg) return;
  const tip = $("chart-tooltip");
  svg.querySelectorAll(".chart-dot").forEach((dot) => {
    dot.addEventListener("mouseenter", () => {
      const i = +dot.dataset.i;
      tip.textContent = `${series[i].label}: ${series[i].value}`;
      tip.hidden = false;
      const rect = dot.getBoundingClientRect();
      tip.style.left = `${rect.left}px`;
      tip.style.top = `${rect.top - 28}px`;
    });
    dot.addEventListener("mouseleave", () => { tip.hidden = true; });
  });
}

function bindLayers() {
  $("map-layers").querySelectorAll(".layer").forEach((l) => {
    l.onclick = () => {
      state.layers[l.dataset.layer] = !state.layers[l.dataset.layer];
      l.classList.toggle("on", state.layers[l.dataset.layer]);
      renderMap();
    };
  });
}

function refresh() {
  renderFilters();
  renderHealth();
  renderMap();
  renderOps();
  renderTrends();
  renderBioCarbonMrv();
  renderActivity();
  renderProjectStrip();
}

function bindGlobal() {
  $("menu-toggle").onclick = () => $("sidebar").classList.toggle("open");
  $("filter-project").onchange = (e) => { state.project = e.target.value; if (e.target.value !== "all") state.scheme = "all"; refresh(); };
  $("filter-scheme").onchange = (e) => { state.scheme = e.target.value; if (e.target.value !== "all") state.project = "all"; refresh(); };
  $("filter-time").onchange = (e) => { state.time = e.target.value; refresh(); };
  $("btn-alerts").onclick = () => showToast("Alerts");
  $("btn-retry").onclick = () => { $("main-content").classList.remove("is-error"); refresh(); };
  $("btn-action-primary").onclick = () => selectHotspot(MOCK_MAP_HOTSPOTS[0]);
  document.querySelectorAll("[data-route]").forEach((b) => b.onclick = () => showToast(`Open ${b.dataset.route}`));
}

function init() {
  const demo = new URLSearchParams(location.search).get("state");
  $("user-name") && ($("avatar").textContent = MOCK_USER.full_name.split(" ").map((n) => n[0]).join(""));
  renderSidebar();
  bindLayers();
  bindGlobal();

  setTimeout(() => {
    $("loading-overlay").classList.add("hidden");
    state.loading = false;
    if (demo === "error") $("main-content").classList.add("is-error");
    else if (demo === "empty") $("main-content").classList.add("is-empty");
    else {
      state.selectedHotspot = MOCK_MAP_HOTSPOTS[0];
      state.selectedAlert = MOCK_ALERTS[0];
      refresh();
    }
  }, 500);

  setInterval(() => {
    if (!state.loading) $("live-updated").textContent = `${Math.floor(Math.random() * 4) + 1}m`;
  }, 40000);
}

document.addEventListener("DOMContentLoaded", init);
