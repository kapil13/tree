# Aranyix Web Home — Living Intelligence Dashboard (Prototype)

**Status:** HTML prototype only — **not** connected to production APIs.  
**Awaiting approval:** `APPROVED — IMPLEMENT WEB` before any Next.js implementation.

## Open the prototype

From the repository root:

```bash
# Option A — Python
cd design/web-home-prototype && python3 -m http.server 8765

# Option B — npx
cd design/web-home-prototype && npx --yes serve -p 8765
```

Then open **http://localhost:8765** in your browser.

Resize the window to test responsive layouts (sidebar collapses below 768px).

---

## Dashboard philosophy

### Speak first, explore second

The current production executive dashboard (`frontend/components/dashboard/executive-dashboard.tsx`) surfaces rich data but buries the story inside KPI grids and collapsible evidence sections. This prototype inverts the hierarchy:

1. **Narrative hero** — A plain-language portfolio briefing (integrity score, what changed, what is at risk, where, why it matters).
2. **Spatial proof** — Map hotspots tied to the narrative, not a separate module to discover later.
3. **Prioritized queue** — Alerts, trees, stale scans, and surveys ranked by severity with inline context.
4. **Intelligence modules** — Satellite, bioacoustic, carbon, and compliance/MRV visible at a glance.
5. **Trends & evidence** — Carbon trajectory, NDVI pulse, health mix, and MRV pipeline status without accordion clicks.
6. **Actions** — Recommended next steps linked to existing product routes.

The dashboard should feel like an **intelligent mission-control workspace** that is actively monitoring the portfolio — not a static SaaS homepage.

---

## Information hierarchy

| Zone | Purpose | Production data source |
|------|---------|------------------------|
| Narrative hero | Portfolio integrity + spoken summary | `intelligence/brief`, `monitoring-summary`, `dashboard.kpi` |
| Status strip | 5 executive KPIs | `dashboard.kpi`, `field-ops-summary`, `alerts` |
| Priority queue | What needs attention now | Alerts, `open_violations`, `stale_satellite_work_areas`, `survival_due` |
| Spatial map | Where risk is concentrated | `plantation-fences`, alert payloads, tree coordinates |
| Intel row | Satellite / bio / carbon / compliance | `monitoring-summary`, `bioacoustic/summary`, `dashboard`, `compliance/portfolio-summary` |
| Trend charts | Carbon & NDVI & health | `carbon_growth`, `ecosystem.ndvi_series`, `health_distribution` |
| Evidence pipeline | MRV status without hiding | Compliance + evidence gap counts |
| Alerts preview | Unread inbox | `alerts` |
| Project breakdown | Per-project integrity | `field-ops-summary.projects` |
| Live feed | Recent activity | Trees, alerts, evidence, scans |
| Quick actions | Same destinations as prod | Register tree, portfolio health, satellite, bio, assistant, reports |

**No invented metrics** — all labels and fields mirror the production API shapes documented in `frontend/lib/api.ts` and `backend/app/schemas/dashboard.py`.

---

## Key interactions

| Interaction | Behavior |
|-------------|----------|
| Narrative chips | Scroll to map + select relevant hotspot/priority |
| KPI strip | Select metric (visual focus + toast) |
| Priority row click | Updates context detail card + map selection |
| Map pin click | Selects hotspot, syncs priority context |
| Layer chips | Toggle trees / alerts / stale scan pins |
| Intel cards | Toast → would open satellite, bio, carbon, compliance modules |
| Sidebar nav | Toast → recognizes production routes (`/dashboard`, `/projects`, etc.) |
| Quick actions | Toast → production paths (`/trees/new`, `/portfolio-health`, …) |
| Live pill | Simulated “updated N min ago” pulse |

Interactions **enrich** the story (context card, map sync) rather than hiding essential information behind clicks.

---

## Mobile Command Center parity

This web prototype aligns with the mobile **Command center** (`design/prototypes/js/app.js` → `renderHome()`):

| Mobile pattern | Web equivalent |
|----------------|----------------|
| Status banner + integrity score | Narrative hero with 76/100 score |
| `briefLines[0]` spoken insight | Headline + support paragraph |
| Next-up hero | Top priority in queue + detail card |
| Signal strip (alerts, attention, evidence, species) | Status strip + intel row |
| Map preview with alert pin | Full spatial panel with layers |
| Connected project card | Project breakdown section |
| Bioacoustic intel line | Bio intel card |
| Live feed | Activity feed |
| Field capture / quick actions | Recommended actions bar |

Shared **Forest Intelligence** tokens: DM Sans, IBM Plex Mono, `--brand-forest`, `--brand-canopy`, calm neutrals, semantic status colors (see `design/ARANYIX_DESIGN_SYSTEM.md`).

---

## File structure

```
design/web-home-prototype/
├── index.html           # Main interactive prototype
├── css/
│   ├── design-system.css  # Tokens & base
│   └── home.css           # Layout & components
├── js/
│   ├── mock-data.js       # Realistic mock aligned with API shapes
│   └── app.js             # Rendering & interactions
└── README.md
```

---

## Production implementation notes (for later)

When approved with `APPROVED — IMPLEMENT WEB`:

- Reuse existing React Query hooks in `executive-dashboard.tsx` — **restructure layout only**, do not change APIs.
- Replace collapsible `CommandCenterEvidence` accordions with visible intel zones where data already loads.
- Promote `intelligence.brief()` headline to page hero; keep `InsightPanel` content but lead with narrative.
- Wire map panel to existing `TreesMap` + alert geolocation from `alerts.payload`.
- Preserve sidebar nav from `frontend/components/sidebar.tsx` and role gating from `nav-access.ts`.

**Do not implement until explicit approval.**
