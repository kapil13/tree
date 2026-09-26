# Aranyix Command Center — Visual Reconception

**HTML prototype only.** Do not implement in production until: `APPROVED — IMPLEMENT WEB`

This is a **complete visual reconception** of the Aranyix Dashboard — not a card-based rearrangement of the existing UI. The production executive dashboard remains the **source of truth for business content**; this prototype reimagines **how** that intelligence is experienced.

## Preview

```bash
cd design/web-dashboard-prototype
python3 -m http.server 8765
# http://localhost:8765/index.html
```

---

## Visual concept

Aranyix is a **Forest Intelligence Platform**. The Command Center is an operational control room where **map + data + signals + trends + alerts + actions** are visually connected — alive and interactive before the user clicks anything.

It deliberately avoids feeling like:
- Power BI / ERP / CRM dashboards
- ESG reporting portals
- KPI card grids
- Generic SaaS admin panels

### Design principle: 75% visual · 20% labels · 5% explanation

No paragraphs. No repeated subtitles. Communication through **number · trend · label · chart · map · status · action**.

---

## Dashboard hierarchy

```
┌ HEADER ─ filters · live status · notifications ─────────────────┐
├ PORTFOLIO STATE          │  LIVE FOREST MAP (dominant canvas)   │
│  76 ↓3                   │  projects · NDVI · alerts · bio      │
│  cascade: NDVI→trees→    │  layers · heat · density · corridor  │
│  alerts→action           │                                      │
├ SIGNAL RIBBON ─ NDVI · Satellite · Survival · Alerts · Bio ─────┤
├ SAR + THREAT inline strips ─────────────────────────────────────┤
├ ANALYTICAL TRENDS (6 charts)  │  PRIORITY / ACTION stack       │
├ CARBON │ BIODIVERSITY │ MRV PIPELINE │ LIVE ACTIVITY ────────────┤
└ PROJECT / PROGRAMME PERFORMANCE ──────────────────────────────────┘
```

| Zone | Role |
|------|------|
| **Portfolio state** | Integrity score, primary signal, visual cascade, key counts |
| **Map stage** | Primary visual canvas — 70%+ of hero viewport |
| **Signal ribbon** | Live cross-portfolio signals (not cards) |
| **Trends canvas** | Full-size analytical charts with baseline/target/anomaly |
| **Priority stack** | Visual severity blocks — not a conventional alert list |
| **Operations band** | Carbon · Bio · MRV · Activity in one flowing band |
| **Project performance** | Comparative integrity + NDVI by project |

---

## Map strategy

The map is the **heart** of the dashboard — not a card, not a widget.

**Layers:** Health · NDVI · Alerts · Satellite · Bio · Field

**Visual elements:**
- Project zone boundaries with stress highlighting
- Tree density texture overlay
- NDVI heat zones (stress / ok / warn)
- Alert pins with pulse animation on critical items
- Stress corridor overlay (KM-48)
- Compact layer toggles + contextual legend

**Selection flow:**
```
Select KM-48 hotspot
  → NDVI chart highlights decline + anomaly marker
  → 18 affected trees in cascade
  → 6 alerts in state metrics
  → priority block selects KM-48 CRITICAL
  → "Inspect KM-48" becomes primary action
  → map corridor + zone activate
```

---

## Chart strategy

**No decorative sparklines.** Each chart block includes:

- Trend line with area fill
- Baseline reference (where applicable)
- Target line (carbon)
- Anomaly highlighting (last point / selected context)
- Current value + metadata row
- Hover tooltips with exact values

| Chart | Business question |
|-------|-------------------|
| NDVI | Is canopy vigor declining? Where? |
| Forest Integrity | Is SAR composite holding? |
| Carbon | Is sequestration on track vs target? |
| Survival | Are plantings surviving? |
| Satellite Freshness | Is MRV coverage adequate? |
| Bioacoustic | Is ecosystem activity healthy? |

Charts cross-highlight with map selection. Clicking a chart focuses the relevant map zone.

---

## Priority intelligence

Not a list. **Visual severity blocks:**

```
CRITICAL ━━━━━━━━━━━━━━
KM-48
NDVI ↓12% · 18 trees · 6 alerts
48h

HIGH ━━━━━━━━━━━━━━━━━
Fire Watch · 3 sites

MEDIUM ━━━━━━━━━━━━━━━
Satellite refresh · 5 sites
```

Each block exposes: **severity · location · signals · SLA · action**

---

## Interaction model

One connected system — not isolated widgets.

| Trigger | Response |
|---------|----------|
| Project filter | Map zones · charts · KPIs · priorities · project rows |
| Map pin/zone | Charts highlight · cascade updates · priority selects · action updates |
| Priority block | Map focuses · charts · action button |
| Signal ribbon cell | Cross-links to relevant map/chart |
| Chart click | Map highlight · alert context |
| Time range (30D/7D/90D) | All trend series refresh |

---

## Information prioritization

1. **Instant read** — Integrity 76 ↓3 + primary signal + map
2. **Live signals** — Ribbon strip (8 metrics, zero cards)
3. **Analysis** — 6 full charts + priority stack
4. **Outcome** — Carbon trajectory · Bio · MRV · Activity
5. **Comparison** — Project performance rows

---

## Color system

| Token | Use |
|-------|-----|
| `#f8f6f2` ivory | App background |
| `#fdfcfa` surface | Panels, map legend |
| `#5c7a6e` eucalyptus | Healthy · integrity |
| `#5a8a94` spatial teal | Map · satellite · NDVI |
| `#b8956b` amber | Warning |
| `#c4705a` terracotta | Critical · decline |
| `#2d4a3e` forest deep | Primary action · nav rail |

Green is **not** dominant. Color communicates state.

---

## Web / mobile parity

- **Desktop:** Map-dominant hero · side state column · trends + priority split
- **Tablet:** Map stacks above state · trends 2-column · priority below
- **Mobile:** Map first (360px min) · state row wraps · single-column trends · priority + action sticky

Mobile should preserve the **map-first, signal-driven** hierarchy — not shrink cards.

---

## Production capabilities retained

All real Aranyix modules represented with production terminology:

Projects · Trees · Map · Field Operations · Portfolio Health · Satellite · SAR · Biodiversity · Bioacoustic · Alerts · Evidence · MRV · Carbon · Compliance · Threat Watch · Reports · AI signal · Government rollup concepts · Species · Quick actions (via rail + primary action)

No invented business logic — representative mock data shaped like production API responses.

---

## Files

```
design/web-dashboard-prototype/
├── index.html              # Map-centric command center structure
├── css/
│   ├── design-system.css   # Tokens
│   └── command-center.css  # Layout (NOT card-grid)
├── js/
│   ├── mock-data.js        # Production-shaped data
│   ├── charts.js           # Full-size chart engine
│   └── app.js              # Connected intelligence
└── README.md
```

## Acceptance test

Within 10 seconds, a Program Manager sees:

1. **Portfolio health** — 76 ↓3
2. **Primary issue** — KM-48 NDVI ↓12%
3. **Where** — map corridor highlighted
4. **Severity** — CRITICAL · 48h
5. **Cascade** — NDVI → 18 trees → 6 alerts → FIELD INSPECTION
6. **Action** — Inspect KM-48

…without reading paragraphs or scrolling through card stacks.

**Feeling:** "I can see the entire forest situation here."

**Not:** "I need to read this dashboard."
