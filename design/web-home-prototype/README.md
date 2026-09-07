# Aranyix Web Home — Forest Intelligence Command Center (Prototype v2)

**Status:** HTML prototype only — **not** connected to production APIs.  
**Awaiting approval:** `APPROVED — IMPLEMENT WEB` before any Next.js implementation.

## Open the prototype

From the repository root:

```bash
cd design/web-home-prototype && python3 -m http.server 8765
```

Then open **http://localhost:8765** in your browser.

### Demo states (query params)

| URL | State |
|-----|-------|
| `?state=error` | Error — services unavailable |
| `?state=empty` | Empty — no portfolio data |

Resize the window to test responsive layouts (sidebar collapses below 768px).

---

## Dashboard philosophy

### Speak first, explore second

The Program Manager should answer in **30 seconds** without navigating:

1. **What is the health of my portfolio?** → Intelligence brief + portfolio health strip
2. **What changed?** → Since yesterday / since last review
3. **Where is the issue?** → Spatial intelligence map + attention queue
4. **Why does it matter?** → Integrated narrative + satellite/bio/carbon/compliance context
5. **What should I do next?** → Aranyix recommendations (prioritized actions)

The dashboard feels like a **calm forest observatory + intelligent mission control** — not a green corporate SaaS grid.

---

## Information hierarchy

| Zone | Purpose | Production data source |
|------|---------|------------------------|
| Intelligence brief | Spoken portfolio summary + integrity score | `intelligence/brief`, `monitoring-summary`, `dashboard.kpi` |
| Portfolio health | 5 executive KPIs visible at a glance | `dashboard.kpi`, `field-ops-summary`, `alerts` |
| What changed | Since yesterday / since last review deltas | Activity, alerts, integrity trend |
| Spatial intelligence | Map hotspots + attention queue | `plantation-fences`, alerts, tree coordinates |
| Why it matters | Integrated intel narrative | `monitoring-summary`, `bioacoustic/summary`, compliance |
| Recommendations | Prioritized next actions | Alerts, field ops, compliance gaps |
| Evidence & outcomes | MRV pipeline, carbon, NDVI, projects, feed | `compliance/portfolio-summary`, `carbon_growth`, `ecosystem.ndvi_series` |

**No invented metrics** — all labels mirror production API shapes in `frontend/lib/api.ts` and `backend/app/schemas/dashboard.py`.

---

## Global filters (minimal)

Header provides only:

```
☰ Command Center  [All Projects ▾]  [All programmes ▾]  [Last 30 days ▾]  🔔
```

- **Project** — filters map, priorities, project breakdown, narrative context
- **Programme/scheme** — NHAI Greenbelt, CAMPA, Nagar Van
- **Time** — Today / 7 / 30 / 90 days / Custom

Filters affect the **entire dashboard** context. No species, tree status, NDVI, carbon, bioacoustic, evidence, compliance or alert-type filters on the homepage — those belong in their modules.

---

## Key interactions

| Interaction | Behavior |
|-------------|----------|
| Global filters | Update narrative, map, metrics, projects for selected context |
| Brief chips | Scroll to map + select relevant hotspot/priority |
| Health metrics | Visual focus + toast |
| Priority row / map pin | Sync context detail card + map selection |
| Layer chips | Toggle trees / alerts / stale scans / bioacoustic pins |
| Recommendations | Scroll to spatial zone or toast module route |
| Intel cards | Toast → satellite, bio, carbon, compliance modules |
| Sidebar nav | Toast → production routes (`/dashboard`, `/projects`, etc.) |

Interactions **enrich** the story rather than hiding essential information behind clicks.

---

## Visual design (v2)

Calm nature-inspired palette:

- Warm ivory / soft off-white base (`#f8f6f2`, `#fdfcfa`)
- Muted sage, eucalyptus, moss accents — used sparingly
- Deep charcoal typography — not neon green backgrounds
- Muted amber (warnings), soft coral (critical), restrained teal (spatial/bio)
- Generous whitespace, subtle borders, restrained elevation
- Subtle motion: live pulse, map pin ping, chart transitions, fade-up zones

---

## Mobile Command Center parity

| Mobile pattern | Web equivalent |
|----------------|----------------|
| Status banner + integrity score | Intelligence brief |
| `briefLines[0]` spoken insight | Headline + support paragraph |
| Next-up hero | Top recommendation + attention queue |
| Signal strip | Portfolio health strip |
| Map preview with alert pin | Full spatial panel with bio layer |
| Bioacoustic intel line | Integrated bio story in "Why it matters" |
| Live feed | Activity feed |
| Quick actions | Recommendations section |

Shared tokens: DM Sans, IBM Plex Mono, Forest Intelligence palette (see `design/ARANYIX_DESIGN_SYSTEM.md`).

---

## Deploy to aranyix.tech (preview URL)

`./deploy.sh` alone does **not** serve this prototype. To publish at a public URL:

```bash
cd /opt/aranyix
git pull origin main
mkdir -p frontend/public/design/web-home-prototype
cp -r design/web-home-prototype/* frontend/public/design/web-home-prototype/
cd infrastructure/hostinger
FORCE_FRONTEND_REBUILD=1 ./deploy.sh
```

Then open:

**https://aranyix.tech/design/web-home-prototype/index.html**

---

## File structure

```
design/web-home-prototype/
├── index.html
├── css/
│   ├── design-system.css
│   └── home.css
├── js/
│   ├── mock-data.js
│   └── app.js
└── README.md
```

---

## Production implementation notes (for later)

When approved with `APPROVED — IMPLEMENT WEB`:

- Reuse existing React Query hooks in `executive-dashboard.tsx` — restructure layout only
- Promote `intelligence.brief()` to page hero; wire global filters to existing project/time scoping
- Replace collapsible evidence accordions with visible intel zones
- Wire map to `TreesMap` + alert geolocation
- Preserve sidebar nav and role gating from `nav-access.ts`

**Do not implement until explicit approval.**
