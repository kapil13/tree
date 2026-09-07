/**
 * SVG chart utilities — Forest Intelligence dashboard
 */

const Charts = {
  sparkline(svg, series, color, opts = {}) {
    if (!svg) return;
    const w = opts.width || 200;
    const h = opts.height || 56;
    const pad = opts.pad || 4;
    const vals = series.map((d) => d.value ?? d);
    const ymin = opts.min ?? Math.min(...vals) * 0.98;
    const ymax = opts.max ?? Math.max(...vals) * 1.02;
    const step = (w - pad * 2) / Math.max(vals.length - 1, 1);
    const pts = vals.map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (v - ymin) / (ymax - ymin || 1)) * (h - pad * 2);
      return `${x},${y}`;
    });
    const area = `${pad},${h - pad} ${pts.join(" ")} ${pad + (vals.length - 1) * step},${h - pad}`;
    const id = `g-${Math.random().toString(36).slice(2, 8)}`;
    svg.innerHTML = `
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#${id})"/>
      <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((p, i) => {
        const [x, y] = p.split(",");
        return `<circle class="chart-dot" cx="${x}" cy="${y}" r="2.5" fill="#fdfcfa" stroke="${color}" stroke-width="1.5" data-i="${i}" data-v="${vals[i]}"/>`;
      }).join("")}`;
  },

  lineChart(svg, series, color, opts = {}) {
    if (!svg) return;
    const w = opts.width || 320;
    const h = opts.height || 120;
    const pad = { l: 28, r: 8, t: 8, b: 22 };
    const vals = series.map((d) => d.value);
    const ymin = opts.min ?? Math.min(...vals) * 0.95;
    const ymax = opts.max ?? Math.max(...vals) * 1.05;
    const step = (w - pad.l - pad.r) / Math.max(series.length - 1, 1);
    const pts = series.map((d, i) => {
      const x = pad.l + i * step;
      const y = pad.t + (1 - (d.value - ymin) / (ymax - ymin || 1)) * (h - pad.t - pad.b);
      return { x, y, ...d };
    });
    const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${pad.l},${h - pad.b} ${poly} ${pts[pts.length - 1].x},${h - pad.b}`;
    const gid = `lg-${Math.random().toString(36).slice(2, 8)}`;
    svg.innerHTML = `
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="#e4e0d8" stroke-width="1"/>
      <polygon points="${area}" fill="url(#${gid})"/>
      <polyline points="${poly}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="3" fill="#fdfcfa" stroke="${color}" stroke-width="1.5" data-i="${i}" data-v="${p.value}" data-l="${p.label}"/>`).join("")}
      ${pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1).map((p) =>
        `<text x="${p.x}" y="${h - 6}" text-anchor="middle" font-size="8" fill="#8a918c">${p.label}</text>`).join("")}`;
  },

  bars(svg, series, color, opts = {}) {
    if (!svg) return;
    const w = opts.width || 280;
    const h = opts.height || 48;
    const pad = 4;
    const max = Math.max(...series.map((d) => d.value), 1);
    const bw = (w - pad * 2) / series.length - 3;
    svg.innerHTML = series.map((d, i) => {
      const bh = (d.value / max) * (h - pad * 2);
      const x = pad + i * (bw + 3);
      const y = h - pad - bh;
      return `<rect class="chart-bar" x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${color}" opacity="0.8" rx="2" data-v="${d.value}" data-l="${d.label}"/>`;
    }).join("");
  },

  hBars(svg, series, colors) {
    if (!svg) return;
    const w = 280;
    const h = series.length * 22 + 8;
    const max = Math.max(...series.map((d) => d.value), 1);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = series.map((d, i) => {
      const bw = (d.value / max) * (w - 90);
      const y = 6 + i * 22;
      const col = colors?.[i] || "#5c7a6e";
      return `
        <text x="0" y="${y + 12}" font-size="10" fill="#5c645f">${d.name || d.label}</text>
        <rect x="72" y="${y}" width="${bw}" height="14" fill="${col}" opacity="0.85" rx="2"/>
        <text x="${72 + bw + 6}" y="${y + 11}" font-size="10" fill="#2a2f2c" font-weight="600">${d.value}</text>`;
    }).join("");
  },

  donut(svg, segments, opts = {}) {
    if (!svg) return;
    const cx = 60, cy = 60, r = 42, ir = 28;
    let angle = -90;
    const total = segments.reduce((s, d) => s + (d.value || d.pct), 0);
    const paths = segments.map((seg) => {
      const val = seg.value || seg.pct;
      const pct = val / total;
      const a1 = angle;
      const a2 = angle + pct * 360;
      angle = a2;
      const rad = (deg) => (deg * Math.PI) / 180;
      const x1 = cx + r * Math.cos(rad(a1));
      const y1 = cy + r * Math.sin(rad(a1));
      const x2 = cx + r * Math.cos(rad(a2));
      const y2 = cy + r * Math.sin(rad(a2));
      const ix1 = cx + ir * Math.cos(rad(a2));
      const iy1 = cy + ir * Math.sin(rad(a2));
      const ix2 = cx + ir * Math.cos(rad(a1));
      const iy2 = cy + ir * Math.sin(rad(a1));
      const large = pct > 0.5 ? 1 : 0;
      return `<path d="M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${large} 0 ${ix2},${iy2} Z" fill="${seg.color}" data-label="${seg.label}"/>`;
    });
    svg.innerHTML = `${paths.join("")}<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="18" font-weight="700" fill="#2a2f2c">${opts.center || ""}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="9" fill="#8a918c">${opts.sublabel || ""}</text>`;
  },

  carbon(svg, data) {
    if (!svg) return;
    const w = 360;
    const h = 110;
    const pad = { l: 8, r: 8, t: 10, b: 22 };
    const all = [...data.historical, ...data.projected];
    const vals = all.map((d) => d.value);
    const ymin = Math.min(...vals) * 0.95;
    const ymax = data.target * 1.05;
    const step = (w - pad.l - pad.r) / (all.length - 1);
    const histLen = data.historical.length;
    const toPt = (v, i) => {
      const x = pad.l + i * step;
      const y = pad.t + (1 - (v - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);
      return `${x},${y}`;
    };
    const histPts = data.historical.map((d, i) => toPt(d.value, i));
    const projPts = data.projected.map((d, i) => toPt(d.value, histLen - 1 + i));
    const targetY = pad.t + (1 - (data.target - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);
    const statusColor = data.on_track ? "#5c7a6e" : data.status === "at_risk" ? "#b8956b" : "#c4705a";
    svg.innerHTML = `
      <line x1="${pad.l}" y1="${targetY}" x2="${w - pad.r}" y2="${targetY}" stroke="#b8956b" stroke-dasharray="4 3" stroke-width="1"/>
      <text x="${w - pad.r}" y="${targetY - 4}" text-anchor="end" font-size="9" fill="#8a918c">Target ${data.target}t</text>
      <polyline points="${histPts.join(" ")}" fill="none" stroke="${statusColor}" stroke-width="2.2"/>
      <polyline points="${[histPts[histPts.length - 1], ...projPts].join(" ")}" fill="none" stroke="${statusColor}" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.65"/>
      ${data.historical.map((d, i) => {
        const [x, y] = histPts[i].split(",");
        return `<circle class="chart-dot" cx="${x}" cy="${y}" r="3" fill="${statusColor}" data-i="${i}" data-v="${d.value}" data-l="${d.label}"/>`;
      }).join("")}
      <text x="${pad.l}" y="${h - 4}" font-size="8" fill="#8a918c">Historical</text>
      <text x="${pad.l + (histLen - 1) * step - 8}" y="${h - 4}" font-size="8" fill="#8a918c">Now</text>
      <text x="${w - pad.r - 24}" y="${h - 4}" font-size="8" fill="#8a918c">Projected</text>`;
  },

  gaugeArc(score) {
    const r = 48;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ * 0.75;
    return { circ, offset };
  },

  miniGauge(svg, value, max, color) {
    if (!svg) return;
    const r = 28;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(value / max, 1);
    const offset = circ - pct * circ * 0.75;
    svg.innerHTML = `
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="#eae6df" stroke-width="6" stroke-dasharray="${circ * 0.75} ${circ}" transform="rotate(135 36 36)"/>
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${circ * 0.75} ${circ}" stroke-dashoffset="${offset}" transform="rotate(135 36 36)" stroke-linecap="round"/>
      <text x="36" y="38" text-anchor="middle" font-size="14" font-weight="700" fill="#2a2f2c">${Math.round(value)}</text>`;
  },
};
