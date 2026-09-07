# Aranyix Web Dashboard — Forest Intelligence OS Prototype

Senior product design prototype for the Aranyix **Dashboard / Command Center**. This is an HTML-only redesign that preserves the informational richness of the production executive dashboard while recomposing it into a connected, visualization-first Forest Intelligence operating system.

**Do not implement in production until approved with:** `APPROVED — IMPLEMENT WEB`

## Preview locally

```bash
cd design/web-dashboard-prototype
python3 -m http.server 8765
# Open http://localhost:8765/index.html
```

Demo states: `?state=error` · `?state=empty`

## Deploy to aranyix.tech (optional)

```bash
mkdir -p frontend/public/design/web-dashboard-prototype
cp -r design/web-dashboard-prototype/* frontend/public/design/web-dashboard-prototype/
cd infrastructure/hostinger
FORCE_FRONTEND_REBUILD=1 ./deploy.sh
```

URL: `https://aranyix.tech/design/web-dashboard-prototype/index.html`

---

## Dashboard hierarchy

The layout follows the **Command Center model** — seven conceptual layers composed visually, not as seven equal card rows:

| Layer | Prototype section | Purpose |
|-------|-------------------|---------|
| 1. Portfolio state | Status bar + Forest integrity gauge + signal row | What is the overall health? |
| 2. What changed | Change strip (deltas, arrows) | What moved since last period? |
| 3. Where | Spatial intelligence map (first viewport) | Where is it happening? |
| 4. Risk / attention | Priority queue + recommended action | What requires attention NOW? |
| 5. Monitoring | Trends row, SAR, satellite, bio, threat watch | Is coverage adequate? Is health improving? |
| 6. Action | Field operations, quick actions, MRV pipeline | What work needs execution? |
| 7. Outcome | Carbon trajectory, compliance strips, species, activity | Are we on track? What was delivered? |

### First viewport (above the fold)

A Program Manager sees immediately:

- **Forest integrity** score, trend, health/risk distributions, NDVI/trees/stale/alerts signals
- **Spatial map** with layer controls (Health · NDVI · Alerts · Satellite · Bio · Field)
- **Priority queue** with severity, location, trend, SLA — plus contextual recommended action

No scrolling through five rows of identical cards before understanding the situation.

### Supporting sections (production parity)

All major production dashboard modules are retained:

- Operational status bar
- AI insight (one concise line — not a chatbot)
- Command strip (projects, violations, alerts, sites, survival due)
- Compliance / evidence / programme context / government rollup
- SAR intelligence + integrity trend
- Portfolio vitals (healthy · verified · ecosystem gauges)
- Canopy health mix (donut + legend)
- Carbon trajectory (historical → current → projected → target)
- Evidence / MRV pipeline (Capture → Evidence → Verify → MRV → Report)
- Satellite intelligence + site NDVI list
- Biodiversity pulse + taxon breakdown
- Threat watch (fire, pest, locust, weather)
- Field operations work queue
- Planted species leaderboard
- Quick actions (contextually prioritized)
- Spatial overview + recent tree registrations
- Live activity timeline
- Data sources strip
- Project comparison strip

---

## Visualization strategy

Every chart answers a business question:

| Visualization | Question |
|---------------|----------|
| Integrity gauge + distributions | Is the portfolio healthy? Where is risk concentrated? |
| NDVI / canopy / survival sparklines | Is forest health improving or deteriorating? |
| Satellite freshness | Is MRV coverage adequate? |
| Anomaly + alert trends | Are issues increasing? |
| SAR integrity series | Does radar confirm optical stress? |
| Carbon trajectory | Is sequestration on track vs target? |
| MRV pipeline | Where are evidence blockers? |
| Taxon bar chart | Is biodiversity improving? |
| Species leaderboard | What is planted and at what scale? |
| Threat grid | What external risks are active? |

Color is used **for state**, not decoration. Green does not dominate the interface.

---

## Interaction model

The dashboard behaves as **one connected system**:

| User action | System response |
|-------------|-----------------|
| Select map pin / zone | Charts highlight, KPIs update, priority queue selects related alert, recommended action updates |
| Select priority item | Map pin highlights, NDVI/satellite charts highlight |
| Select change chip (e.g. ↓12% NDVI) | Map focuses stress corridor, related charts highlight |
| Toggle map layers | Pins/heatmap show/hide by type |
| Filter project / programme / time | All sections re-filter consistently |
| Click trend chart | Cross-links to map or alerts |
| Click fence row | Selects project on map |
| Click project chip (bottom strip) | Full dashboard filters to that project |

Hover on chart points shows exact values with period labels.

---

## Information prioritization

Visual weight tiers:

- **PRIMARY** — First viewport: integrity, map, priority queue
- **IMPORTANT** — Status bar, change strip, command strip, trends, SAR
- **SUPPORTING** — Portfolio vitals, carbon, MRV, satellite/bio, threat
- **DETAIL** — Species, activity, data sources, recent trees, reports

Text is minimal. Signals use numbers, arrows, deltas, and color — not paragraphs.

---

## Color system

| Token | Use |
|-------|-----|
| Warm ivory / stone (`#f8f6f2`, `#fdfcfa`) | Base surfaces |
| Muted sage / eucalyptus (`#5c7a6e`, `#5a8a94`) | Healthy state, spatial/satellite |
| Deep charcoal (`#2a2f2c`) | Primary text |
| Muted amber (`#b8956b`) | Warning |
| Restrained terracotta (`#c4705a`) | Critical / decline |
| Muted teal (`#5a8a94`) | Satellite / spatial accents |

Avoided: neon green, heavy gradients, glassmorphism, cyberpunk aesthetics, marketing-homepage tone.

---

## Web / mobile parity

- **Desktop-first** — three-column cockpit (health | map | queue)
- **Tablet** — viewport stacks; map remains prominent; trends go 3-column
- **Mobile** — map first, then health, then queue; command strip 2-column; sections single-column

The mobile app should mirror the same information hierarchy and connected cross-filtering, adapted to touch and bottom navigation — not a shrunk desktop card stack.

---

## Production implementation notes

When approved, implement in this order:

1. **Layout shell** — Left nav, topbar filters, viewport grid in `executive-dashboard.tsx`
2. **Connected state** — Shared filter context (project, programme, time) driving all panels
3. **Map integration** — Promote `TreesMap` / plantation fence layers with compact layer toggles
4. **Priority queue** — Replace generic alert list with severity-sorted work queue component
5. **Change strip** — Compute period deltas from existing KPI endpoints
6. **Chart upgrades** — Recharts panels with cross-highlight on selection
7. **AI insight** — Single-line from `intelligence.brief()` — not a chat widget
8. **Preserve all existing API calls** — No new metrics; recompose existing data

### Files in this prototype

```
design/web-dashboard-prototype/
├── index.html          # Full dashboard structure
├── css/
│   ├── design-system.css
│   └── dashboard.css
├── js/
│   ├── mock-data.js    # Production-shaped representative data
│   ├── charts.js       # SVG chart utilities
│   └── app.js          # Connected interactions
└── README.md
```

### Relationship to `web-home-prototype`

`design/web-home-prototype/` explored earlier Command Center iterations (v1–v4). This prototype (`web-dashboard-prototype`) is the **final senior product design direction** with full production module parity and the connected spatial intelligence model.

---

## Design acceptance test

Within 10 seconds of opening, a Program Manager should understand:

1. Overall portfolio health (integrity 76/100, follow-up needed)
2. Biggest current issue (KM-48 NDVI drop)
3. Where it is (map corridor Ch. 142–148)
4. How serious it is (critical, 48h SLA)
5. What changed (↓12% NDVI, +3 alerts, +19 trees)
6. What action is required (Inspect KM-48)

…while still having access to SAR, compliance, carbon, biodiversity, threats, operations, species, and all other production intelligence below the fold.
