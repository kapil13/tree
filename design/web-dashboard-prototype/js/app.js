/**
 * Aranyix Forest Intelligence OS — connected dashboard prototype
 */

const state = {
  project: "all",
  scheme: "all",
  time: "30d",
  selectedHotspot: null,
  selectedAlert: null,
  selectedChange: null,
  layers: { health: true, ndvi: true, alerts: true, satellite: true, bio: true, field: true },
  loading: true,
};

const COLORS = ["#5c7a6e", "#5a8a94", "#6b7f5e", "#b8956b", "#7a8f7a"];

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
    d.sar.avg_integrity = p.sarIntegrity;
    d.aiInsight = `Focus on ${p.shortName}: NDVI ${p.ndviDelta > 0 ? "+" : ""}${p.ndviDelta}% · integrity ${p.integrityScore}/100.`;
  } else if (projects.length < MOCK_PROJECTS.length) {
    d.kpi.total_trees = projects.reduce((s, p) => s + p.trees, 0);
    d.forestIntegrity.score = Math.round(projects.reduce((s, p) => s + p.integrityScore, 0) / projects.length);
    d.sar.avg_integrity = Math.round(projects.reduce((s, p) => s + p.sarIntegrity, 0) / projects.length);
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

function getRecommendedAction() {
  const alert = state.selectedAlert || getAlerts().find((a) => a.status === "open" && a.severity === "critical") || getAlerts()[0];
  return alert?.action || "Review portfolio";
}

function renderSidebar() {
  $("sidebar-nav").innerHTML = NAV_GROUPS.map((g) => `
    <div class="nav-group-label">${g.label}</div>
    ${g.items.map((i) => `<button type="button" class="nav-item${i.active ? " active" : ""}" data-nav="${i.id}"><span class="icon">${i.icon}</span>${i.label}</button>`).join("")}
  `).join("");
  $("sidebar-nav").querySelectorAll(".nav-item").forEach((b) => {
    b.onclick = () => { if (b.dataset.nav !== "dashboard") showToast(`Navigate: ${b.textContent.trim()}`); };
  });
}

function renderFilters() {
  $("filter-project").innerHTML = `<option value="all">All Projects</option>${MOCK_PROJECTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}`;
  $("filter-project").value = state.project;
  $("filter-scheme").innerHTML = MOCK_SCHEMES.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  $("filter-scheme").value = state.scheme;
  $("filter-time").value = state.time;
  const proj = state.project !== "all" ? MOCK_PROJECTS.find((p) => p.id === state.project) : null;
  $("topbar-context").textContent = proj ? proj.name : "Portfolio overview";
}

function renderStatus() {
  const d = getData();
  const bar = $("status-bar");
  bar.className = `status-bar ${d.statusTone}`;
  $("status-label").textContent = d.statusLabel;
  $("status-summary").textContent = d.statusSummary;
  $("ai-text").textContent = d.aiInsight;
  $("live-updated").textContent = d.updatedAt.replace(" ago", "").replace(" min", "m");
  $("alert-badge").textContent = d.unreadAlerts;
}

function renderChangeStrip() {
  const d = getData();
  $("change-strip").innerHTML = d.change_strip.map((c) =>
    `<button type="button" class="change-chip ${c.trend}${state.selectedChange === c.type ? " sel" : ""}" data-type="${c.type}">${c.label}</button>`
  ).join("");
  $("change-strip").querySelectorAll(".change-chip").forEach((chip) => {
    chip.onclick = () => {
      state.selectedChange = chip.dataset.type;
      if (chip.dataset.type === "ndvi") selectHotspot(MOCK_MAP_HOTSPOTS[0]);
      else if (chip.dataset.type === "alerts") {
        state.selectedAlert = getAlerts()[0];
        renderOps();
      }
      renderChangeStrip();
      highlightCharts();
    };
  });
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
  $("major-risk").textContent = `Major risk: ${d.forestIntegrity.majorRisk}`;
  $("status-pill").textContent = d.statusLabel;
  $("status-pill").className = `status-pill ${d.forestIntegrity.score < 70 ? "crit" : d.forestIntegrity.score < 80 ? "warn" : "ok"}`;

  $("health-dist").innerHTML = `<span class="dist-label">Health</span>${d.health_distribution.map((x) =>
    `<div class="dist-seg" style="width:${x.pct}%;background:${x.color}" title="${x.label} ${x.pct}%"></div>`).join("")}`;
  $("risk-dist").innerHTML = `<span class="dist-label">Risk</span>${d.risk_distribution.map((x) =>
    `<div class="dist-seg" style="width:${x.pct}%;background:${x.color}" title="${x.label} ${x.pct}%"></div>`).join("")}`;

  $("signal-row").innerHTML = `
    <div class="signal-cell"><span class="signal-val down">↓12%</span><span class="signal-lbl">NDVI</span></div>
    <div class="signal-cell"><span class="signal-val warn">${d.kpi.trees_attention}</span><span class="signal-lbl">Trees</span></div>
    <div class="signal-cell"><span class="signal-val warn">${d.monitoring.stale_satellite_work_areas}</span><span class="signal-lbl">Stale sat</span></div>
    <div class="signal-cell"><span class="signal-val">${d.unreadAlerts}</span><span class="signal-lbl">Alerts</span></div>`;

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
    const svg = $("kpi-strip").querySelector(`[data-spark="${k.id}"]`);
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
    if (h.type === "fire" && !state.layers.alerts) return false;
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
    $("map-heatmap").innerHTML = `
      <div class="heat stress" style="left:34%;top:40%;width:18%;height:14%"></div>
      <div class="heat ok" style="left:68%;top:28%;width:14%;height:12%"></div>
      <div class="heat warn" style="left:22%;top:56%;width:12%;height:10%"></div>`;
  }

  const showCorridor = state.selectedHotspot?.projectId === "p1" || state.project === "p1";
  $("map-corridor").style.opacity = showCorridor ? "1" : "0.2";

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
    $("ctx-ndvi").textContent = h.ndvi != null ? `NDVI ${h.ndvi} (${h.delta > 0 ? "+" : ""}${h.delta}%)` : `Signal ${h.delta}%`;
    $("map-tooltip").innerHTML = `<strong>${h.name}</strong> · ${h.type}${h.ndvi != null ? ` · NDVI ${h.ndvi}` : ""}`;
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
  state.selectedAlert = getAlerts().find((a) => a.projectId === state.project || a.projectId === "all");
  refresh();
}

function selectHotspot(h) {
  if (!h) return;
  state.selectedHotspot = h;
  state.selectedAlert = getAlerts().find((a) => a.projectId === h.projectId) || getAlerts()[0];
  state.project = h.projectId;
  $("filter-project").value = state.project;
  renderMap();
  renderTrends();
  renderOps();
  renderHealth();
  renderStatus();
  highlightCharts();
  $("btn-action-primary").textContent = getRecommendedAction();
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
      renderTrends();
      highlightCharts();
      $("btn-action-primary").textContent = getRecommendedAction();
      showToast(`${state.selectedAlert.action}: ${state.selectedAlert.title}`);
    };
  });

  $("btn-action-primary").textContent = getRecommendedAction();
}

function renderCommandStrip() {
  const d = getData();
  const items = [
    { icon: "▤", label: "Active projects", val: d.kpi.active_projects, warn: false },
    { icon: "⚑", label: "Open violations", val: d.fieldOps.open_violations, warn: d.fieldOps.open_violations > 0 },
    { icon: "!", label: "Unread alerts", val: d.unreadAlerts, warn: d.unreadAlerts > 0 },
    { icon: "◌", label: "Sites monitored", val: d.kpi.sites_monitored, warn: false },
    { icon: "☐", label: "Survival due", val: d.fieldOps.survival_due, warn: d.fieldOps.survival_due > 0 },
  ];
  $("command-strip").innerHTML = items.map((i) => `
    <button type="button" class="cmd-item${i.warn ? " warn" : ""}">
      <span class="cmd-icon">${i.icon}</span>
      <div><div class="cmd-val">${i.val}</div><div class="cmd-label">${i.label}</div></div>
    </button>`).join("");
  $("command-strip").querySelectorAll(".cmd-item").forEach((b, i) => {
    b.onclick = () => showToast(items[i].label);
  });
}

function renderStrips() {
  const d = getData();
  $("compliance-strip").innerHTML = `
    <div class="strip-metric"><strong>${d.compliance.avg_readiness_pct}%</strong><span>Readiness</span></div>
    <div class="strip-metric"><strong>${d.compliance.evidence_verified}</strong><span>Verified</span></div>
    <div class="strip-metric"><strong class="warn-text">${d.compliance.evidence_gaps}</strong><span>Gaps</span></div>`;
  $("compliance-flow").innerHTML = `
    <div class="comp-step">Capture <strong>100%</strong></div>
    <div class="comp-step">Evidence <strong>97%</strong></div>
    <div class="comp-step warn">Verify <strong>82%</strong></div>
    <div class="comp-step">MRV <strong>45%</strong></div>
    <div class="comp-step">Report <strong>12%</strong></div>`;
  $("audience-strip").innerHTML = `
    <div><strong>${d.audience.stakeholder_type}</strong> · ${d.audience.reporting_cycle}</div>
    <div class="strip-metrics" style="margin-top:6px">${d.audience.enrolled_programs.map((p) => `<span class="source-chip">${p}</span>`).join("")}</div>`;
  $("gov-strip").innerHTML = `
    <div class="strip-metric"><strong>${d.governmentRollup.district}</strong><span>District</span></div>
    <div class="strip-metric"><strong>${(d.governmentRollup.total_trees_state / 1000).toFixed(0)}k</strong><span>State trees</span></div>
    <div class="strip-metric"><strong>${d.governmentRollup.compliance_pct}%</strong><span>Compliance</span></div>`;
}

function renderTrends() {
  const d = getData();
  const h = state.selectedHotspot;
  const ndvi = h?.ndvi ?? d.ndvi_series.at(-1).value;
  $("ndvi-val").textContent = typeof ndvi === "number" ? ndvi.toFixed(2) : ndvi;
  $("ndvi-val").className = `chart-val ${h?.delta < 0 || d.ndvi_series.at(-1).value < 0.62 ? "down" : ""}`;
  $("canopy-val").textContent = `${d.canopy_series.at(-1).value}%`;
  $("survival-val").textContent = `${d.survival_series.at(-1).value}%`;
  $("sat-val").textContent = `${d.satellite_freshness.at(-1).value}%`;
  $("sat-val").className = `chart-val ${d.satellite_freshness.at(-1).value < 80 ? "warn" : ""}`;
  $("anomaly-val").textContent = d.anomaly_series.at(-1).value;
  $("alert-trend-val").textContent = d.alert_trend.at(-1).value;

  Charts.sparkline($("chart-ndvi"), d.ndvi_series, "#5a8a94", { min: 0.5, max: 0.72 });
  Charts.sparkline($("chart-canopy"), d.canopy_series, "#5c7a6e", { min: 80, max: 90 });
  Charts.sparkline($("chart-survival"), d.survival_series, "#6b7f5e", { min: 85, max: 95 });
  Charts.sparkline($("chart-satellite"), d.satellite_freshness, "#b8956b", { min: 65, max: 95 });
  Charts.sparkline($("chart-anomaly"), d.anomaly_series, "#c4705a", { min: 0, max: 10 });
  Charts.sparkline($("chart-alerts"), d.alert_trend, "#c4705a", { min: 0, max: 8 });

  Charts.lineChart($("chart-ndvi-full"), d.ndvi_series, "#5a8a94", { width: 320, height: 120, min: 0.5, max: 0.75 });

  ["chart-ndvi", "chart-canopy", "chart-survival", "chart-satellite", "chart-anomaly", "chart-alerts", "chart-ndvi-full"].forEach((id, idx) => {
    const series = [d.ndvi_series, d.canopy_series, d.survival_series, d.satellite_freshness, d.anomaly_series, d.alert_trend, d.ndvi_series][idx];
    bindChartHover(id, series);
  });
}

function highlightCharts() {
  document.querySelectorAll(".chart-panel").forEach((p) => p.classList.remove("highlight"));
  const h = state.selectedHotspot;
  if (!h) return;
  if (h.type === "alert" || h.type === "stale" || h.type === "fire") {
    document.querySelector('[data-chart="ndvi"]')?.classList.add("highlight");
    document.querySelector('[data-chart="satellite"]')?.classList.add("highlight");
  }
  if (h.type === "bio") {
    document.querySelector('[aria-label="Biodiversity pulse"]')?.classList.add("highlight");
  }
}

function renderSar() {
  const d = getData();
  $("sar-stats").innerHTML = `
    <div class="sar-stat"><div class="sar-stat-val${d.sar.trend < 0 ? " down" : ""}">${d.sar.avg_integrity}</div><div class="sar-stat-lbl">SAR integrity</div></div>
    <div class="sar-stat"><div class="sar-stat-val down">${d.sar.trend > 0 ? "+" : ""}${d.sar.trend}</div><div class="sar-stat-lbl">Trend</div></div>
    <div class="sar-stat"><div class="sar-stat-val warn">${d.sar.at_risk_areas}</div><div class="sar-stat-lbl">At risk</div></div>
    <div class="sar-stat"><div class="sar-stat-val">${d.sar.last_scan}</div><div class="sar-stat-lbl">Last scan</div></div>`;
  Charts.sparkline($("chart-sar"), d.sar.series, "#5a8a94", { width: 400, height: 80, pad: 8 });
}

function renderVitals() {
  const d = getData();
  const vitals = [
    { label: "Healthy", sub: "Canopy status", val: d.kpi.pct_healthy, color: "#5c7a6e" },
    { label: "Verified", sub: "Satellite MRV", val: d.kpi.pct_satellite_verified, color: "#5a8a94" },
    { label: "Ecosystem", sub: "Bioacoustic", val: d.bioacoustic.avg_health_score, color: "#6b7f5e" },
  ];
  $("vitals-row").innerHTML = vitals.map((v, i) => `
    <div class="vital-gauge"><svg id="vital-${i}" viewBox="0 0 72 72"></svg>
      <div class="vital-label">${v.label}</div><div class="vital-sub">${v.sub}</div></div>`).join("");
  vitals.forEach((v, i) => Charts.miniGauge($(`vital-${i}`), v.val, 100, v.color));

  const total = d.health_distribution.reduce((s, x) => s + x.value, 0);
  $("health-total").textContent = `${total.toLocaleString()} trees`;
  Charts.donut($("chart-donut"), d.health_distribution, { center: `${d.kpi.pct_healthy}%`, sublabel: "healthy" });
  $("health-legend").innerHTML = d.health_distribution.map((x) => `
    <div class="health-row"><span>${x.label}</span><span>${x.value.toLocaleString()} · ${x.pct}%</span></div>
    <div class="health-bar"><div class="health-fill" style="width:${x.pct}%;background:${x.color}"></div></div>`).join("");
}

function renderCarbonMrv() {
  const d = getData();
  $("carbon-current").textContent = d.carbon_trajectory.historical.at(-1).value;
  $("carbon-target").textContent = d.carbon_trajectory.target;
  const track = d.carbon_trajectory.on_track ? "on" : d.carbon_trajectory.status === "at_risk" ? "at_risk" : "off";
  $("carbon-track").textContent = track === "on" ? "On track" : track === "at_risk" ? "At risk" : "Off track";
  $("carbon-track").className = `track-pill ${track}`;
  Charts.carbon($("chart-carbon"), d.carbon_trajectory);

  $("mrv-ready").textContent = `${d.compliance.avg_readiness_pct}%`;
  $("mrv-verified").textContent = d.compliance.evidence_verified;
  $("mrv-gaps").textContent = d.compliance.evidence_gaps;
  $("mrv-pending").textContent = d.compliance.evidence_pending;
  $("mrv-blocked").textContent = d.mrv_pipeline.find((s) => s.blocked)?.blocked || 1;
  $("mrv-pipeline").innerHTML = d.mrv_pipeline.map((s, i) => `
    <button type="button" class="mrv-stage ${s.status}${s.blocked ? " blocked" : ""}" data-stage="${s.stage}" style="flex:${Math.max(s.pct, 12)}">
      <span class="mrv-name">${s.stage}</span>
      <span class="mrv-pct">${s.pct}%</span>
      ${s.gaps ? `<span class="mrv-gap">${s.gaps} gap</span>` : ""}
    </button>${i < d.mrv_pipeline.length - 1 ? '<span class="mrv-arrow">›</span>' : ""}`).join("");
  $("mrv-pipeline").querySelectorAll(".mrv-stage").forEach((s) => {
    s.onclick = () => showToast(`MRV: ${s.dataset.stage}`);
  });
}

function renderSatelliteBio() {
  const d = getData();
  const fences = d.fences.filter((f) => state.project === "all" || f.projectId === state.project);
  $("fence-list").innerHTML = fences.map((f) => `
    <div class="fence-row${state.selectedHotspot?.projectId === f.projectId ? " sel" : ""}" data-fence="${f.id}">
      <div><strong>${f.name}</strong><div style="font-size:10px;color:var(--text-tertiary)">${f.area_ha} ha · scan ${f.last_scan} ago</div></div>
      <span class="ndvi-badge${f.ndvi < 0.58 ? " low" : ""}">${f.ndvi.toFixed(2)}</span>
    </div>`).join("");
  $("fence-list").querySelectorAll(".fence-row").forEach((r) => {
    r.onclick = () => {
      const f = fences.find((x) => x.id === r.dataset.fence);
      const h = MOCK_MAP_HOTSPOTS.find((x) => x.projectId === f.projectId);
      if (h) selectHotspot(h);
    };
  });

  $("bio-grid").innerHTML = `
    <div class="bio-stat"><span class="bio-num">${d.bioacoustic.total_recordings}</span><span class="bio-lbl">Recordings</span></div>
    <div class="bio-stat"><span class="bio-num">${d.bioacoustic.avg_shannon_index}</span><span class="bio-lbl">Shannon</span></div>
    <div class="bio-stat"><span class="bio-num">${d.bioacoustic.chorus_activity_pct}%</span><span class="bio-lbl">Chorus</span></div>
    <div class="bio-stat warn"><span class="bio-num">${d.bioacoustic.threatened_species_count}</span><span class="bio-lbl">Threatened</span></div>`;
  Charts.sparkline($("chart-bio"), d.bio_activity_series, "#5a8a94", { width: 280, height: 48 });
  Charts.hBars($("chart-taxon"), d.taxon_breakdown, COLORS);
}

function renderThreat() {
  const d = getData();
  $("threat-grid").innerHTML = `
    <div class="threat-cell crit"><div class="threat-val">${d.threatWatch.fire_detections}</div><div class="threat-lbl">Fire detections</div></div>
    <div class="threat-cell warn"><div class="threat-val">${d.threatWatch.pest_risk}</div><div class="threat-lbl">Pest risk</div></div>
    <div class="threat-cell"><div class="threat-val">${d.threatWatch.locust_watch ? "Yes" : "No"}</div><div class="threat-lbl">Locust watch</div></div>
    <div class="threat-cell warn"><div class="threat-val">${d.threatWatch.weather_alerts}</div><div class="threat-lbl">Weather alerts</div></div>`;
}

function renderOperations() {
  const d = getData();
  const ops = d.operations.filter((o) => state.project === "all" || o.projectId === state.project || o.projectId === "all");
  $("ops-sub").textContent = `${ops.filter((o) => o.status !== "pending").length} items need execution`;
  $("ops-list").innerHTML = ops.map((o) => `
    <div class="ops-row" data-op="${o.id}">
      <span>${o.label}</span>
      <span class="ops-status ${o.status}">${o.due}</span>
    </div>`).join("");
  $("ops-list").querySelectorAll(".ops-row").forEach((r) => {
    r.onclick = () => showToast(`Open: ${ops.find((o) => o.id === r.dataset.op).label}`);
  });
}

function renderSpecies() {
  const d = getData();
  const max = d.species_distribution[0]?.value || 1;
  $("species-list").innerHTML = d.species_distribution.map((s, i) => `
    <div class="species-row">
      <div class="species-head"><span>${s.label}</span><span>${s.value.toLocaleString()}</span></div>
      <div class="species-bar"><div class="species-fill" style="width:${(s.value / max) * 100}%;background:${COLORS[i % COLORS.length]}"></div></div>
    </div>`).join("");
}

function renderActions() {
  const d = getData();
  const sorted = [...QUICK_ACTIONS].sort((a, b) => a.priority - b.priority);
  const hasCritical = d.fieldOps.open_violations > 0 || d.unreadAlerts > 3;
  $("actions-grid").innerHTML = sorted.map((a) => `
    <button type="button" class="action-row${hasCritical && (a.id === "compliance" || a.id === "health") ? " priority" : ""}" data-action="${a.id}">
      <span class="action-icon">${a.icon}</span>
      <div><div class="action-label">${a.label}</div><div class="action-sub">${a.sub}</div></div>
    </button>`).join("");
  $("actions-grid").querySelectorAll(".action-row").forEach((b) => {
    b.onclick = () => showToast(QUICK_ACTIONS.find((a) => a.id === b.dataset.action).label);
  });
  $("reports-mini").innerHTML = `
    <h4>Recent reports</h4>
    ${d.recent_reports.map((r) => `<div class="report-row"><span>${r.kind}</span><span class="report-status">${r.status}</span></div>`).join("")}`;
}

function renderSpatialTrees() {
  const d = getData();
  const projects = getProjects();
  $("spatial-mini").innerHTML = projects.map((p) => {
    const z = p.mapZone;
    return `<div class="map-zone${state.project === p.id ? " active" : ""}" data-project="${p.id}"
      style="left:${z.left}%;top:${z.top}%;width:${z.width}%;height:${z.height}%"><span>${p.shortName}</span></div>`;
  }).join("");
  $("spatial-mini").querySelectorAll(".map-zone").forEach((z) => {
    z.onclick = () => selectProject(z.dataset.project);
  });

  $("tree-list").innerHTML = d.recent_trees.map((t) => `
    <div class="tree-row" data-tree="${t.id}">
      <div><strong>${t.code}</strong><div style="font-size:10px;color:var(--text-tertiary)">${t.species} · ${t.time} ago</div></div>
      <span class="health-badge ${t.health}">${t.health}</span>
    </div>`).join("");
  $("tree-list").querySelectorAll(".tree-row").forEach((r) => {
    r.onclick = () => showToast(`Tree: ${d.recent_trees.find((t) => t.id === r.dataset.tree).code}`);
  });
}

function renderActivity() {
  $("activity-timeline").innerHTML = MOCK_ACTIVITY.map((a) => `
    <div class="tl-item ${a.type}">
      <span class="tl-dot"></span>
      <div><div class="tl-label">${a.label}</div><div class="tl-meta">${a.meta}</div></div>
      <span class="tl-time">${a.time}</span>
    </div>`).join("");
}

function renderSources() {
  const d = getData();
  $("sources-row").innerHTML = d.dataSources.map((s) => `
    <span class="source-chip${s.status === "warn" ? " warn" : ""}"><span class="dot"></span>${s.name} · ${s.freshness}</span>`).join("");
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
  svg.querySelectorAll(".chart-dot, .chart-bar").forEach((dot) => {
    dot.addEventListener("mouseenter", () => {
      const i = +dot.dataset.i;
      const val = dot.dataset.v || series[i]?.value;
      const label = dot.dataset.l || series[i]?.label;
      tip.textContent = label ? `${label}: ${val}` : `${val}`;
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

function bindChartPanels() {
  document.querySelectorAll(".chart-panel").forEach((p) => {
    p.onclick = () => {
      const chart = p.dataset.chart;
      if (chart === "ndvi" || chart === "satellite") selectHotspot(MOCK_MAP_HOTSPOTS[0]);
      else if (chart === "anomaly" || chart === "alerts") {
        state.selectedAlert = getAlerts()[0];
        renderOps();
      }
      highlightCharts();
    };
  });
}

function refresh() {
  renderFilters();
  renderStatus();
  renderChangeStrip();
  renderHealth();
  renderMap();
  renderOps();
  renderCommandStrip();
  renderStrips();
  renderTrends();
  renderSar();
  renderVitals();
  renderCarbonMrv();
  renderSatelliteBio();
  renderThreat();
  renderOperations();
  renderSpecies();
  renderActions();
  renderSpatialTrees();
  renderActivity();
  renderSources();
  renderProjectStrip();
  highlightCharts();
}

function bindGlobal() {
  $("menu-toggle").onclick = () => $("sidebar").classList.toggle("open");
  $("filter-project").onchange = (e) => { state.project = e.target.value; if (e.target.value !== "all") state.scheme = "all"; refresh(); };
  $("filter-scheme").onchange = (e) => { state.scheme = e.target.value; if (e.target.value !== "all") state.project = "all"; refresh(); };
  $("filter-time").onchange = (e) => { state.time = e.target.value; refresh(); };
  $("btn-alerts").onclick = () => showToast("Alerts inbox");
  $("status-action").onclick = () => { state.selectedAlert = getAlerts()[0]; renderOps(); document.querySelector(".ops-panel")?.scrollIntoView({ behavior: "smooth" }); };
  $("btn-retry").onclick = () => { $("main-content").classList.remove("is-error"); refresh(); };
  $("btn-action-primary").onclick = () => {
    const h = state.selectedHotspot || MOCK_MAP_HOTSPOTS[0];
    selectHotspot(h);
    showToast(getRecommendedAction());
  };
  document.querySelectorAll("[data-route]").forEach((b) => b.onclick = () => showToast(`Open ${b.dataset.route}`));
}

function init() {
  const demo = new URLSearchParams(location.search).get("state");
  $("user-name").textContent = MOCK_USER.full_name;
  $("user-org").textContent = MOCK_USER.organization_name;
  $("avatar").textContent = MOCK_USER.full_name.split(" ").map((n) => n[0]).join("");
  renderSidebar();
  bindLayers();
  bindGlobal();
  bindChartPanels();

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
  }, 480);

  setInterval(() => {
    if (!state.loading) $("live-updated").textContent = `${Math.floor(Math.random() * 4) + 1}m`;
  }, 45000);
}

document.addEventListener("DOMContentLoaded", init);
