/**
 * SVG chart utilities for Command Center
 */

const Charts = {
  sparkline(svg, series, color, opts = {}) {
    const w = opts.width || 200;
    const h = opts.height || 56;
    const pad = opts.pad || 4;
    const vals = series.map((d) => d.value ?? d);
    const ymin = opts.min ?? Math.min(...vals) * 0.98;
    const ymax = opts.max ?? Math.max(...vals) * 1.02;
    const step = (w - pad * 2) / (vals.length - 1);
    const pts = vals.map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (v - ymin) / (ymax - ymin || 1)) * (h - pad * 2);
      return `${x},${y}`;
    });
    const area = `${pad},${h - pad} ${pts.join(" ")} ${pad + (vals.length - 1) * step},${h - pad}`;
    const id = `g-${Math.random().toString(36).slice(2, 8)}`;
    svg.innerHTML = `
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#${id})"/>
      <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
      ${pts.map((p, i) => {
        const [x, y] = p.split(",");
        return `<circle class="chart-dot" cx="${x}" cy="${y}" r="2.5" fill="#fdfcfa" stroke="${color}" stroke-width="1.5" data-i="${i}" data-v="${vals[i]}"/>`;
      }).join("")}`;
  },

  bars(svg, series, color) {
    const w = 280;
    const h = 36;
    const pad = 4;
    const max = Math.max(...series.map((d) => d.value));
    const bw = (w - pad * 2) / series.length - 3;
    svg.innerHTML = series
      .map((d, i) => {
        const bh = (d.value / max) * (h - pad * 2);
        const x = pad + i * (bw + 3);
        const y = h - pad - bh;
        return `<rect class="chart-bar" x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${color}" opacity="0.75" rx="2" data-v="${d.value}" data-l="${d.label}"/>`;
      })
      .join("");
  },

  carbon(svg, data) {
    const w = 360;
    const h = 100;
    const pad = { l: 8, r: 8, t: 8, b: 20 };
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

    svg.innerHTML = `
      <line x1="${pad.l}" y1="${targetY}" x2="${w - pad.r}" y2="${targetY}" stroke="#b8956b" stroke-dasharray="4 3" stroke-width="1"/>
      <text x="${w - pad.r}" y="${targetY - 4}" text-anchor="end" font-size="9" fill="#8a918c">Target ${data.target}</text>
      <polyline points="${histPts.join(" ")}" fill="none" stroke="#5c7a6e" stroke-width="2"/>
      <polyline points="${[histPts[histPts.length - 1], ...projPts].join(" ")}" fill="none" stroke="#5c7a6e" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.7"/>
      ${data.historical.map((d, i) => {
        const [x, y] = histPts[i].split(",");
        return `<circle cx="${x}" cy="${y}" r="2.5" fill="#5c7a6e"/>`;
      }).join("")}
      <text x="${pad.l}" y="${h - 4}" font-size="8" fill="#8a918c">Hist</text>
      <text x="${pad.l + (histLen - 1) * step}" y="${h - 4}" font-size="8" fill="#8a918c">Now</text>
      <text x="${w - pad.r - 20}" y="${h - 4}" font-size="8" fill="#8a918c">Proj</text>`;
  },

  gaugeArc(score) {
    const r = 48;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ * 0.75;
    return { circ, offset };
  },
};
