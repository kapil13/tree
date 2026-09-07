/**
 * Chart engine — full-size analytical visualizations
 */

const Charts = {
  seriesChart(svg, series, opts = {}) {
    if (!svg) return;
    const w = opts.width || 400;
    const h = opts.height || 120;
    const pad = { l: 36, r: 12, t: 14, b: 28 };
    const color = opts.color || "#5a8a94";
    const vals = series.map((d) => d.value);
    const ymin = opts.min ?? Math.min(...vals) * (opts.min != null ? 1 : 0.95);
    const ymax = opts.max ?? Math.max(...vals) * (opts.max != null ? 1 : 1.05);
    const baseline = opts.baseline;
    const target = opts.target;
    const step = (w - pad.l - pad.r) / Math.max(series.length - 1, 1);

    const pt = (v, i) => {
      const x = pad.l + i * step;
      const y = pad.t + (1 - (v - ymin) / (ymax - ymin || 1)) * (h - pad.t - pad.b);
      return { x, y };
    };

    const pts = series.map((d, i) => ({ ...pt(d.value, i), ...d }));
    const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${pad.l},${h - pad.b} ${poly} ${pts[pts.length - 1].x},${h - pad.b}`;
    const gid = `g${Math.random().toString(36).slice(2, 7)}`;
    const anomalyIdx = opts.anomalyIndex;

    let extras = "";
    if (baseline != null) {
      const by = pad.t + (1 - (baseline - ymin) / (ymax - ymin || 1)) * (h - pad.t - pad.b);
      extras += `<line x1="${pad.l}" y1="${by}" x2="${w - pad.r}" y2="${by}" stroke="#b8956b" stroke-dasharray="4 3" stroke-width="1" opacity=".7"/>`;
    }
    if (target != null) {
      const ty = pad.t + (1 - (target - ymin) / (ymax - ymin || 1)) * (h - pad.t - pad.b);
      extras += `<line x1="${pad.l}" y1="${ty}" x2="${w - pad.r}" y2="${ty}" stroke="#5c7a6e" stroke-dasharray="4 3" stroke-width="1" opacity=".5"/>`;
    }

    svg.innerHTML = `
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity=".2"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${extras}
      <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="rgba(42,47,44,.08)" stroke-width="1"/>
      <polygon points="${area}" fill="url(#${gid})"/>
      <polyline points="${poly}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((p, i) => {
        const isAnomaly = anomalyIdx === i || (anomalyIdx == null && i === pts.length - 1 && opts.highlightLast);
        const r = isAnomaly ? 5 : 3.5;
        const fill = isAnomaly ? "#c4705a" : "#fdfcfa";
        const stroke = isAnomaly ? "#c4705a" : color;
        return `<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" data-i="${i}" data-v="${p.value}" data-l="${p.label}"/>`;
      }).join("")}
      ${pts.filter((_, i) => i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2)).map((p) =>
        `<text x="${p.x}" y="${h - 8}" text-anchor="middle" font-size="9" fill="#8a918c">${p.label}</text>`).join("")}`;
  },

  carbonChart(svg, data) {
    if (!svg) return;
    const w = 360, h = 80;
    const pad = { l: 8, r: 8, t: 8, b: 18 };
    const all = [...data.historical, ...data.projected];
    const vals = all.map((d) => d.value);
    const ymin = Math.min(...vals) * 0.95;
    const ymax = data.target * 1.05;
    const step = (w - pad.l - pad.r) / (all.length - 1);
    const histLen = data.historical.length;
    const color = data.on_track ? "#5c7a6e" : "#c4705a";

    const pt = (v, i) => {
      const x = pad.l + i * step;
      const y = pad.t + (1 - (v - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);
      return `${x},${y}`;
    };

    const histPts = data.historical.map((d, i) => pt(d.value, i));
    const projPts = data.projected.map((d, i) => pt(d.value, histLen - 1 + i));
    const targetY = pad.t + (1 - (data.target - ymin) / (ymax - ymin)) * (h - pad.t - pad.b);

    svg.innerHTML = `
      <line x1="${pad.l}" y1="${targetY}" x2="${w - pad.r}" y2="${targetY}" stroke="#b8956b" stroke-dasharray="3 2" stroke-width="1"/>
      <polyline points="${histPts.join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>
      <polyline points="${[histPts[histLen - 1], ...projPts].join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3" opacity=".65"/>`;
  },

  bars(svg, series, color) {
    if (!svg) return;
    const w = 280, h = 60, pad = 8;
    const max = Math.max(...series.map((d) => d.value), 1);
    const bw = (w - pad * 2) / series.length - 4;
    svg.innerHTML = series.map((d, i) => {
      const bh = (d.value / max) * (h - pad * 2);
      const x = pad + i * (bw + 4);
      const y = h - pad - bh;
      return `<rect class="chart-bar" x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${color}" opacity=".8" rx="2" data-v="${d.value}" data-l="${d.label}"/>`;
    }).join("");
  },
};
