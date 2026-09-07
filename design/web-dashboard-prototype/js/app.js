/**
 * Aranyix Command Center — connected intelligence system
 */

const state = {
  project: "all",
  scheme: "all",
  time: "30d",
  selectedHotspot: null,
  selectedPriority: null,
  layers: { health: true, ndvi: true, alerts: true, satellite: true, bio: true, field: true },
};

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2000);
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
    d.kpi.trees_attention = p.id === "p1" ? 18 : p.id === "p3" ? 12 : 4;
    d.primarySignal = `${p.shortName} · NDVI ${p.ndviDelta > 0 ? "+" : ""}${p.ndviDelta}%`;
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

function getPriorities() {
  const ids = new Set(getProjects().map((p) => p.id));
  return MOCK_PRIORITIES.filter((p) => p.projectId === "all" || ids.has(p.projectId));
}

function renderRail() {
  const icons = [
    { id: "dashboard", icon: "◫", active: true },
    { id: "projects", icon: "▤" },
    { id: "map", icon: "⊞" },
    { id: "satellite", icon: "◌" },
    { id: "alerts", icon: "!" },
    { id: "reports", icon: "≡" },
  ];
  $("rail").innerHTML = `
    <div class="rail-logo">🌿</div>
    ${icons.map((i) => `<button type="button" class="rail-btn${i.active ? " active" : ""}" data-nav="${i.id}" title="${i.id}">${i.icon}</button>`).join("")}
    <div class="rail-spacer"></div>
    <button type="button" class="rail-btn" data-nav="settings" title="Settings">⚙</button>`;
  $("rail").querySelectorAll(".rail-btn[data-nav]").forEach((b) => {
    if (b.dataset.nav !== "dashboard") b.onclick = () => toast(b.title);
  });
}

function renderFilters() {
  $("filter-project").innerHTML = `<option value="all">All Projects</option>${MOCK_PROJECTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}`;
  $("filter-project").value = state.project;
  $("filter-scheme").innerHTML = MOCK_SCHEMES.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  $("filter-scheme").value = state.scheme;
  $("filter-time").value = state.time;
}

function renderState() {
  const d = getData();
  const h = state.selectedHotspot;
  const proj = h ? MOCK_PROJECTS.find((p) => p.id === h.projectId) : null;

  $("integrity-score").textContent = d.forestIntegrity.score;
  const t = d.forestIntegrity.trend;
  $("integrity-delta").textContent = `${t < 0 ? "↓" : t > 0 ? "↑" : "·"}${Math.abs(t)}`;
  $("integrity-delta").className = `delta ${t < 0 ? "down" : t > 0 ? "up" : ""}`;

  const signal = proj ? `${proj.shortName} · NDVI ${proj.ndviDelta > 0 ? "+" : ""}${proj.ndviDelta}%` : (d.primarySignal || "KM-48 · NDVI ↓12%");
  $("primary-signal-text").textContent = signal;

  const trees = h ? (h.projectId === "p1" ? 18 : 4) : d.kpi.trees_attention;
  const alerts = h ? (h.projectId === "p1" ? 6 : 2) : d.unreadAlerts;
  const ndviDrop = h?.delta ?? -12;

  $("cascade").innerHTML = [
    { text: `NDVI ${ndviDrop > 0 ? "+" : ""}${ndviDrop}%`, active: true },
    { text: `${trees} trees`, active: false },
    { text: `${alerts} alerts`, active: false },
    { text: "FIELD INSPECTION", active: false },
  ].map((c, i) => `
    ${i > 0 ? '<div class="cascade-item"><span class="arrow">↓</span></div>' : ""}
    <div class="cascade-item${c.active ? " active" : ""}"><span class="signal">${c.text}</span></div>`).join("");

  $("metric-trees").textContent = d.kpi.total_trees.toLocaleString();
  $("metric-attention").textContent = trees;
  $("metric-alerts").textContent = alerts;
  $("metric-compliance").textContent = `${d.compliance.avg_readiness_pct}%`;
  $("alert-badge").textContent = d.unreadAlerts;
  $("live-updated").textContent = d.updatedAt.replace(" ago", "").replace(" min", "m");
}

function renderMap() {
  const projects = getProjects();
  const hotspots = getHotspots().filter(filterByLayer);
  if (!state.selectedHotspot && hotspots.length) state.selectedHotspot = hotspots.find((h) => h.type === "alert") || hotspots[0];

  $("map-zones").innerHTML = projects.map((p) => {
    const z = p.mapZone;
    const active = state.selectedHotspot?.projectId === p.id || state.project === p.id;
    const stressed = p.ndviDelta < -5;
    return `<button type="button" class="map-zone${active ? " active" : ""}${stressed ? " stressed" : ""}" data-project="${p.id}"
      style="left:${z.left}%;top:${z.top}%;width:${z.width}%;height:${z.height}%"><span>${p.shortName}</span></button>`;
  }).join("");

  $("map-pins").innerHTML = hotspots.map((h) => `
    <button type="button" class="map-pin ${h.type}${state.selectedHotspot?.id === h.id ? " sel" : ""}"
      style="left:${h.left}%;top:${h.top}%" data-id="${h.id}"></button>`).join("");

  $("map-heats").innerHTML = state.layers.ndvi ? `
    <div class="map-heat stress" style="left:32%;top:38%;width:22%;height:18%"></div>
    <div class="map-heat ok" style="left:66%;top:26%;width:16%;height:14%"></div>
    <div class="map-heat warn" style="left:20%;top:54%;width:14%;height:12%"></div>` : "";

  $("map-density").style.opacity = state.layers.health ? "0.15" : "0.05";
  const showCorridor = state.selectedHotspot?.projectId === "p1" || state.project === "p1";
  $("map-corridor").style.cssText = showCorridor
    ? "left:30%;top:36%;width:26%;height:20%;opacity:1"
    : "opacity:0";

  $("map-zones").querySelectorAll(".map-zone").forEach((z) => {
    z.onclick = () => selectProject(z.dataset.project);
  });
  $("map-pins").querySelectorAll(".map-pin").forEach((p) => {
    p.onclick = (e) => { e.stopPropagation(); selectHotspot(MOCK_MAP_HOTSPOTS.find((h) => h.id === p.dataset.id)); };
  });

  updateLegend();
}

function filterByLayer(h) {
  const map = { alert: "alerts", fire: "alerts", stale: "satellite", tree: "health", bio: "bio", field: "field" };
  return state.layers[map[h.type] || "health"];
}

function updateLegend() {
  const h = state.selectedHotspot;
  if (h) {
    const proj = MOCK_PROJECTS.find((p) => p.id === h.projectId);
    $("legend-title").textContent = h.name;
    $("legend-meta").textContent = `${proj?.shortName || ""} · ${h.type}${h.ndvi != null ? ` · NDVI ${h.ndvi}` : ""} · ${h.delta}%`;
  } else {
    $("legend-title").textContent = state.project !== "all" ? MOCK_PROJECTS.find((p) => p.id === state.project)?.name : "Portfolio overview";
    $("legend-meta").textContent = "Select a zone to focus intelligence";
  }
}

function renderSignals() {
  const d = getData();
  const h = state.selectedHotspot;
  const signals = [
    { id: "ndvi", val: h?.ndvi?.toFixed(2) ?? d.ndvi_series.at(-1).value.toFixed(2), lbl: "NDVI", cls: "down", highlight: h?.type === "alert" },
    { id: "sat", val: `${d.satellite_freshness.at(-1).value}%`, lbl: "Satellite", cls: "warn" },
    { id: "surv", val: `${d.survival_series.at(-1).value}%`, lbl: "Survival", cls: "down" },
    { id: "alert", val: `+${d.alert_trend.at(-1).value - d.alert_trend.at(-2).value}`, lbl: "Alerts", cls: "down" },
    { id: "bio", val: `${d.bioacoustic.chorus_activity_pct}%`, lbl: "Bio chorus", cls: d.bioacoustic.chorus_delta < 0 ? "down" : "up" },
    { id: "carbon", val: `+${d.kpi.co2e_delta_pct}%`, lbl: "Carbon", cls: "up" },
    { id: "integrity", val: d.forestIntegrity.score, lbl: "Integrity", cls: d.forestIntegrity.trend < 0 ? "down" : "" },
    { id: "mrv", val: `${d.compliance.avg_readiness_pct}%`, lbl: "MRV ready", cls: "" },
  ];
  $("signal-ribbon").innerHTML = signals.map((s) => `
    <button type="button" class="signal-cell${s.highlight ? " highlight" : ""}" data-signal="${s.id}">
      <span class="sig-val ${s.cls}">${s.val}</span>
      <span class="sig-lbl">${s.lbl}</span>
    </button>`).join("");
  $("signal-ribbon").querySelectorAll(".signal-cell").forEach((c) => {
    c.onclick = () => {
      if (c.dataset.signal === "ndvi" || c.dataset.signal === "alert") selectHotspot(MOCK_MAP_HOTSPOTS[0]);
      else if (c.dataset.signal === "bio") selectHotspot(MOCK_MAP_HOTSPOTS.find((h) => h.type === "bio"));
    };
  });
}

function renderSarThreat() {
  const d = getData();
  $("sar-inline").innerHTML = `
    <span class="label">SAR</span>
    <span class="sar-val${d.sar.trend < 0 ? " down" : ""}">${d.sar.avg_integrity}</span>
    <span>integrity</span>
    <span class="label">Trend</span><span class="sar-val down">${d.sar.trend}</span>
    <span class="label">At risk</span><span class="sar-val">${d.sar.at_risk_areas} area</span>
    <span class="label">Last scan</span><span>${d.sar.last_scan}</span>`;
  $("threat-inline").innerHTML = `
    <div class="threat-item"><span class="tval crit">${d.threatWatch.fire_detections}</span><span class="tlbl">Fire</span></div>
    <div class="threat-item"><span class="tval">${d.threatWatch.pest_risk}</span><span class="tlbl">Pest</span></div>
    <div class="threat-item"><span class="tval">${d.threatWatch.weather_alerts}</span><span class="tlbl">Weather</span></div>
    <div class="threat-item"><span class="tval">${d.threatWatch.locust_watch ? "Active" : "Clear"}</span><span class="tlbl">Locust</span></div>`;
}

function renderCharts() {
  const d = getData();
  const h = state.selectedHotspot;

  $("ndvi-val").textContent = (h?.ndvi ?? d.ndvi_series.at(-1).value).toFixed(2);
  $("ndvi-val").className = `value ${(h?.delta ?? -12) < 0 ? "down" : ""}`;
  $("ndvi-baseline").textContent = `baseline ${d.ndvi_series[0].value.toFixed(2)}`;
  $("ndvi-anomaly").textContent = h ? `Anomaly: ${h.name}` : "Anomaly: Ch. 142–148";

  Charts.seriesChart($("chart-ndvi"), d.ndvi_series, {
    color: "#5a8a94", min: 0.5, max: 0.72, baseline: 0.68, highlightLast: !!h,
  });

  const integritySeries = d.sar.series.map((s, i) => ({ ...s, label: d.ndvi_series[i]?.label || s.label }));
  $("integrity-val").textContent = d.forestIntegrity.score;
  Charts.seriesChart($("chart-integrity"), integritySeries, { color: "#5c7a6e", min: 70, max: 90 });

  $("carbon-val").textContent = d.carbon_trajectory.historical.at(-1).value;
  Charts.seriesChart($("chart-carbon-inline"), d.carbon_trajectory.historical, {
    color: "#6b7f5e", min: 220, max: 320, target: d.carbon_trajectory.target,
  });

  $("survival-val").textContent = `${d.survival_series.at(-1).value}%`;
  Charts.seriesChart($("chart-survival"), d.survival_series, { color: "#5c7a6e", min: 85, max: 95 });

  $("sat-val").textContent = `${d.satellite_freshness.at(-1).value}%`;
  $("sat-val").className = `value ${d.satellite_freshness.at(-1).value < 80 ? "warn" : ""}`;
  Charts.seriesChart($("chart-satellite"), d.satellite_freshness, { color: "#b8956b", min: 65, max: 95 });

  $("bio-val").textContent = `${d.bioacoustic.chorus_activity_pct}%`;
  $("bio-meta").textContent = `${d.bioacoustic.total_species_detected} species · ${d.bioacoustic.threatened_species_count} threatened`;
  Charts.seriesChart($("chart-bio"), d.bio_activity_series, { color: "#7a8f7a", min: 75, max: 100 });

  bindTips();
  highlightCharts();
}

function highlightCharts() {
  document.querySelectorAll(".chart-block").forEach((b) => b.classList.remove("highlight"));
  const h = state.selectedHotspot;
  if (!h) return;
  if (["alert", "stale", "fire"].includes(h.type)) {
    document.querySelector('[data-chart="ndvi"]')?.classList.add("highlight");
    document.querySelector('[data-chart="satellite"]')?.classList.add("highlight");
  }
  if (h.type === "bio") document.querySelector('[data-chart="bio"]')?.classList.add("highlight");
}

function renderPriority() {
  const priorities = getPriorities();
  $("priority-stack").innerHTML = priorities.map((p) => `
    <div class="priority-block ${p.severity}${state.selectedPriority?.id === p.id ? " sel" : ""}" data-id="${p.id}">
      <div class="priority-sev">${p.severity}</div>
      <div class="priority-body">
        <div class="priority-name">${p.name}</div>
        <div class="priority-signals">${p.signals.map((s) => `<span class="priority-sig${s.includes("↓") ? " down" : ""}">${s}</span>`).join("")}</div>
        <div class="priority-sla${p.sla === "Overdue" ? " overdue" : ""}">${p.sla}</div>
      </div>
    </div>`).join("");

  $("priority-stack").querySelectorAll(".priority-block").forEach((b) => {
    b.onclick = () => {
      state.selectedPriority = priorities.find((p) => p.id === b.dataset.id);
      const h = MOCK_MAP_HOTSPOTS.find((x) => x.projectId === state.selectedPriority.projectId || state.selectedPriority.projectId === "all");
      if (h) state.selectedHotspot = h;
      $("btn-action").textContent = state.selectedPriority.action;
      refresh();
    };
  });

  if (!state.selectedPriority) state.selectedPriority = priorities[0];
  $("btn-action").textContent = state.selectedPriority?.action || "Inspect KM-48";
}

function renderOpsBand() {
  const d = getData();
  $("carbon-big").textContent = d.carbon_trajectory.historical.at(-1).value;
  $("carbon-target").textContent = d.carbon_trajectory.target;
  $("carbon-track").textContent = d.carbon_trajectory.on_track ? "ON TRACK" : "OFF TRACK";
  $("carbon-track").className = `carbon-track ${d.carbon_trajectory.on_track ? "on" : "off"}`;
  Charts.carbonChart($("chart-carbon-full"), d.carbon_trajectory);

  $("bio-species").textContent = d.bioacoustic.total_species_detected;
  $("bio-obs").textContent = `+${d.bioacoustic.new_observations} observations`;
  $("bio-threat").textContent = `${d.bioacoustic.threatened_species_count} threatened`;
  $("bio-chorus").textContent = `Chorus ${d.bioacoustic.chorus_activity_pct}%`;
  Charts.bars($("chart-bio-bar"), d.taxon_breakdown, "#5c7a6e");

  $("mrv-flow").innerHTML = d.mrv_pipeline.map((s, i) => `
    <div class="mrv-step ${s.status}${s.blocked ? " blocked" : ""}"><span class="pct">${s.pct}%</span><span class="name">${s.stage}</span></div>
    ${i < d.mrv_pipeline.length - 1 ? '<span class="mrv-arrow">→</span>' : ""}`).join("");
  $("mrv-bar").innerHTML = d.mrv_pipeline.map((s) =>
    `<div class="mrv-bar-seg ${s.status}" style="width:${s.pct / d.mrv_pipeline.reduce((a, x) => a + x.pct, 0) * 100}%"></div>`).join("");
  $("mrv-gaps").textContent = `${d.compliance.evidence_gaps} gaps`;
  $("mrv-blocked").textContent = `${d.mrv_pipeline.find((s) => s.blocked)?.blocked || 1} blocker`;

  $("activity-stream").innerHTML = MOCK_ACTIVITY.map((a) => `
    <div class="act-item">
      <span class="act-dot ${a.type}"></span>
      <div><div class="act-label">${a.label}</div><div class="act-meta">${a.meta}</div></div>
      <span class="act-time">${a.time}</span>
    </div>`).join("");
}

function renderProjects() {
  const max = Math.max(...getProjects().map((p) => p.integrityScore));
  $("proj-perf").innerHTML = getProjects().map((p) => `
    <div class="proj-row${state.project === p.id ? " sel" : ""}" data-project="${p.id}">
      <span class="name">${p.shortName}</span>
      <div class="proj-bar"><div class="proj-fill" style="width:${(p.integrityScore / max) * 100}%;background:${p.integrityScore < 70 ? "var(--crit)" : p.integrityScore < 80 ? "var(--warn)" : "var(--ok)"}"></div></div>
      <span class="proj-score">${p.integrityScore}</span>
      <span class="proj-ndvi${p.ndviDelta < 0 ? " down" : ""}">${p.ndviDelta > 0 ? "+" : ""}${p.ndviDelta}%</span>
    </div>`).join("");
  $("proj-perf").querySelectorAll(".proj-row").forEach((r) => {
    r.onclick = () => selectProject(r.dataset.project);
  });
}

function selectProject(id) {
  state.project = state.project === id && id !== "all" ? "all" : id;
  state.scheme = "all";
  state.selectedHotspot = MOCK_MAP_HOTSPOTS.find((h) => h.projectId === state.project) || getHotspots()[0];
  state.selectedPriority = getPriorities().find((p) => p.projectId === state.project || p.projectId === "all");
  refresh();
}

function selectHotspot(h) {
  if (!h) return;
  state.selectedHotspot = h;
  state.project = h.projectId;
  state.selectedPriority = getPriorities().find((p) => p.projectId === h.projectId) || getPriorities()[0];
  refresh();
  toast(`Focus: ${h.name}`);
}

function bindTips() {
  const tip = $("chart-tip");
  document.querySelectorAll(".chart-dot, .chart-bar").forEach((dot) => {
    dot.onmouseenter = () => {
      tip.textContent = `${dot.dataset.l || ""}: ${dot.dataset.v}`;
      tip.hidden = false;
      const r = dot.getBoundingClientRect();
      tip.style.left = `${r.left}px`;
      tip.style.top = `${r.top - 24}px`;
    };
    dot.onmouseleave = () => { tip.hidden = true; };
  });
}

function bindLayers() {
  $("map-layers").querySelectorAll(".layer-btn").forEach((l) => {
    l.onclick = () => {
      state.layers[l.dataset.layer] = !state.layers[l.dataset.layer];
      l.classList.toggle("on", state.layers[l.dataset.layer]);
      renderMap();
    };
  });
}

function bindCharts() {
  document.querySelectorAll(".chart-block").forEach((b) => {
    b.onclick = () => {
      const c = b.dataset.chart;
      if (c === "ndvi" || c === "satellite") selectHotspot(MOCK_MAP_HOTSPOTS[0]);
      else if (c === "bio") selectHotspot(MOCK_MAP_HOTSPOTS.find((h) => h.type === "bio"));
      highlightCharts();
    };
  });
}

function refresh() {
  renderFilters();
  renderState();
  renderMap();
  renderSignals();
  renderSarThreat();
  renderCharts();
  renderPriority();
  renderOpsBand();
  renderProjects();
}

function init() {
  $("avatar").textContent = MOCK_USER.full_name.split(" ").map((n) => n[0]).join("");
  renderRail();
  bindLayers();
  bindCharts();

  $("filter-project").onchange = (e) => { state.project = e.target.value; if (e.target.value !== "all") state.scheme = "all"; refresh(); };
  $("filter-scheme").onchange = (e) => { state.scheme = e.target.value; if (e.target.value !== "all") state.project = "all"; refresh(); };
  $("filter-time").onchange = (e) => { state.time = e.target.value; refresh(); };
  $("btn-alerts").onclick = () => toast("6 unread alerts");
  $("btn-action").onclick = () => { selectHotspot(state.selectedHotspot || MOCK_MAP_HOTSPOTS[0]); toast($("btn-action").textContent); };

  setTimeout(() => {
    $("loading").classList.add("hidden");
    state.selectedHotspot = MOCK_MAP_HOTSPOTS[0];
    state.selectedPriority = MOCK_PRIORITIES[0];
    refresh();
  }, 600);
}

document.addEventListener("DOMContentLoaded", init);
