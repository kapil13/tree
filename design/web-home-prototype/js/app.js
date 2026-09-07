/**
 * Aranyix Web Home — Living Intelligence Dashboard interactions
 */

const state = {
  selectedHotspot: MOCK_MAP_HOTSPOTS[0],
  selectedPriority: MOCK_PRIORITIES[0],
  selectedMetric: null,
  mapLayers: { trees: true, alerts: true, stale: true },
  sidebarOpen: false,
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
      if (window.innerWidth <= 768) state.sidebarOpen = false;
      renderSidebar();
    });
  });
}

function renderNarrative() {
  const d = MOCK_DASHBOARD;
  document.getElementById("narrative-score").textContent = d.forestIntegrity.score;
  document.getElementById("narrative-trend").textContent = `${d.forestIntegrity.trend} vs last week`;
  document.getElementById("narrative-trend").className = `trend ${d.forestIntegrity.trend < 0 ? "down" : "up"}`;
  document.getElementById("narrative-headline").innerHTML = d.narrative.headline;
  document.getElementById("narrative-support").innerHTML = d.narrative.support;
  document.getElementById("live-updated").textContent = `Updated ${d.updatedAt}`;
  document.getElementById("alert-badge").textContent = d.unreadAlerts;
}

function renderMetrics() {
  const d = MOCK_DASHBOARD;
  const metrics = [
    {
      id: "trees",
      label: "Trees registered",
      value: d.kpi.total_trees.toLocaleString(),
      hint: `${d.kpi.pct_healthy}% healthy`,
    },
    {
      id: "co2",
      label: "CO₂e stored (est.)",
      value: `${fmtCo2e(d.kpi.total_co2e_kg)} t`,
      hint: `+${fmtCo2e(d.kpi.annual_sequestration_kg)} t/yr seq.`,
    },
    {
      id: "violations",
      label: "Open violations",
      value: d.fieldOps.open_violations,
      hint: `${d.compliance.blocking_violations} blocking export`,
    },
    {
      id: "alerts",
      label: "Unread alerts",
      value: d.unreadAlerts,
      hint: "3 high severity",
    },
    {
      id: "integrity",
      label: "Forest integrity",
      value: `${d.monitoring.sar_avg_forest_integrity}`,
      hint: `${d.monitoring.sar_at_risk_work_areas} area at risk`,
      trend: d.forestIntegrity.trend,
    },
  ];

  const strip = document.getElementById("status-strip");
  strip.innerHTML = metrics
    .map(
      (m) => `
    <div class="status-metric${state.selectedMetric === m.id ? " selected" : ""}" data-metric="${m.id}">
      <div class="label">${m.label}</div>
      <div class="value">${m.value}</div>
      <div class="hint">${m.hint}</div>
      ${m.trend != null ? `<div class="trend ${m.trend < 0 ? "down" : "up"}">${m.trend > 0 ? "+" : ""}${m.trend} pts</div>` : ""}
    </div>`
    )
    .join("");

  strip.querySelectorAll(".status-metric").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedMetric = el.dataset.metric;
      renderMetrics();
      showToast(`Metric focus: ${el.querySelector(".label").textContent}`);
    });
  });
}

function renderPriorities() {
  const list = document.getElementById("priority-list");
  list.innerHTML = MOCK_PRIORITIES
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
      state.selectedPriority = MOCK_PRIORITIES.find((p) => p.id === el.dataset.priority);
      const hotspot = MOCK_MAP_HOTSPOTS.find((h) =>
        state.selectedPriority.title.toLowerCase().includes("ndvi")
          ? h.id === "h1"
          : false
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
    <h4>${p?.title || h?.name} — ${h?.project || ""}</h4>
    <p>${p?.detail || h?.detail}</p>
    ${h ? `<p style="margin-top:8px"><strong>Spatial:</strong> NDVI ${h.ndvi} · ${h.delta} · pin selected on map</p>` : ""}
    <div class="detail-actions">
      ${(p?.links || ["View details", "Open map"]).map((l) => `<button type="button" class="btn btn-secondary" data-action="${l}">${l}</button>`).join("")}
    </div>`;

  el.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => showToast(`Prototype: ${btn.dataset.action}`));
  });
}

function renderMap() {
  const map = document.getElementById("spatial-map");
  const pins = MOCK_MAP_HOTSPOTS.filter((h) => {
    if (h.type === "alert" && !state.mapLayers.alerts) return false;
    if (h.type === "stale" && !state.mapLayers.stale) return false;
    if (h.type === "tree" && !state.mapLayers.trees) return false;
    return true;
  });

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
      state.selectedPriority = MOCK_PRIORITIES.find((p) => p.title.toLowerCase().includes("ndvi")) || MOCK_PRIORITIES[0];
      renderMap();
      renderPriorities();
    });
    map.appendChild(pin);
  });

  const label = document.getElementById("map-label");
  const h = state.selectedHotspot;
  label.innerHTML = h
    ? `<strong>${h.name}</strong> · ${h.project} · NDVI ${h.ndvi} (${h.delta}) — click pins to explore risk hotspots`
    : `${MOCK_DASHBOARD.unreadAlerts} alerts · NDVI stress at Ch. 142–148 · click pins to explore`;
}

function renderMapLayers() {
  document.querySelectorAll(".layer-chip").forEach((chip) => {
    const layer = chip.dataset.layer;
    chip.classList.toggle("on", state.mapLayers[layer]);
    chip.addEventListener("click", () => {
      state.mapLayers[layer] = !state.mapLayers[layer];
      renderMapLayers();
      renderMap();
    });
  });
}

function renderIntel() {
  const d = MOCK_DASHBOARD;
  document.getElementById("intel-satellite").innerHTML = `
    <div class="intel-icon">🛰</div>
    <div class="intel-label">Satellite</div>
    <div class="intel-value">${d.monitoring.stale_satellite_work_areas} stale</div>
    <div class="intel-line">${d.monitoring.sar_aligned_work_areas} aligned · ${d.monitoring.sar_at_risk_work_areas} at risk · ${d.monitoring.sar_divergent_work_areas} divergent</div>`;

  document.getElementById("intel-bio").innerHTML = `
    <div class="intel-icon">🎙</div>
    <div class="intel-label">Bioacoustic</div>
    <div class="intel-value">${d.bioacoustic.total_species_detected} species</div>
    <div class="intel-line">Health ${d.bioacoustic.avg_health_score}/100 · Shannon ${d.bioacoustic.avg_shannon_index} · ${d.bioacoustic.threatened_species_count} threatened</div>`;

  document.getElementById("intel-carbon").innerHTML = `
    <div class="intel-icon">🌿</div>
    <div class="intel-label">Carbon</div>
    <div class="intel-value">${fmtCo2e(d.kpi.total_co2e_kg)} tCO₂e</div>
    <div class="intel-line">${d.kpi.lifetime_credits_tco2e.toLocaleString()} credits issued · est. portfolio trajectory ↑</div>`;

  document.getElementById("intel-compliance").innerHTML = `
    <div class="intel-icon">🛡</div>
    <div class="intel-label">Compliance & MRV</div>
    <div class="intel-value">${d.compliance.avg_readiness_pct}% ready</div>
    <div class="intel-line">${d.compliance.evidence_gaps} evidence gaps · ${d.compliance.blocking_violations} blocking · ${d.compliance.safeguard_gap_count} safeguard gaps</div>
    <div class="compliance-bar"><div class="compliance-fill" style="width:${d.compliance.avg_readiness_pct}%"></div></div>`;

  document.querySelectorAll(".intel-card").forEach((card) => {
    card.addEventListener("click", () => showToast(`Prototype: open ${card.dataset.intel} module`));
  });
}

function renderCharts() {
  drawAreaChart("chart-carbon", MOCK_DASHBOARD.carbon_growth, "#15803d");
  drawAreaChart("chart-ndvi", MOCK_DASHBOARD.ndvi_series, "#ca8a04", 0, 1);

  const gauges = document.getElementById("gauge-row");
  const d = MOCK_DASHBOARD;
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
        <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${area}" fill="url(#grad-${svgId})"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${series.map((p, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (1 - (p.value - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"><title>${p.label}: ${p.value}</title></circle>`;
    }).join("")}
    ${series.map((p, i) => {
      const x = pad.l + i * xStep;
      return `<text x="${x}" y="${h - 6}" text-anchor="middle" font-size="10" fill="#8a938c">${p.label}</text>`;
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
  document.getElementById("project-breakdown").innerHTML = MOCK_PROJECTS
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

function bindGlobal() {
  document.getElementById("menu-toggle").addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    document.getElementById("sidebar").classList.toggle("open", state.sidebarOpen);
  });

  document.querySelectorAll(".narrative-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const topic = chip.dataset.topic;
      if (topic === "ndvi") {
        state.selectedHotspot = MOCK_MAP_HOTSPOTS[0];
        state.selectedPriority = MOCK_PRIORITIES[0];
      } else if (topic === "trees") {
        state.selectedPriority = MOCK_PRIORITIES[1];
      } else if (topic === "satellite") {
        state.selectedPriority = MOCK_PRIORITIES[2];
      }
      renderMap();
      renderPriorities();
      document.getElementById("spatial-section").scrollIntoView({ behavior: "smooth" });
    });
  });

  document.getElementById("spatial-map").addEventListener("click", () => {
    showToast("Prototype: full map view with tree/alert layers");
  });

  // Simulate live pulse
  setInterval(() => {
    const mins = Math.floor(Math.random() * 4) + 1;
    document.getElementById("live-updated").textContent = `Updated ${mins} min ago`;
  }, 45000);
}

function init() {
  document.getElementById("user-name").textContent = MOCK_USER.full_name;
  document.getElementById("user-org").textContent = MOCK_USER.organization_name;
  document.getElementById("avatar").textContent = MOCK_USER.full_name
    .split(" ")
    .map((n) => n[0])
    .join("");

  renderSidebar();
  renderNarrative();
  renderMetrics();
  renderPriorities();
  renderMap();
  renderMapLayers();
  renderIntel();
  renderCharts();
  renderAlerts();
  renderActivity();
  renderProjects();
  bindGlobal();
}

document.addEventListener("DOMContentLoaded", init);
