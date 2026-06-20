# BYOT — UI / UX Wireframes

Design language: **ClimateTech / ESG**. Calm greens, generous whitespace,
data-dense but readable, accessible (WCAG AA), dark mode first-class.

Palette (Tailwind tokens in `frontend/lib/theme.ts`):

| Token | Light | Dark |
|---|---|---|
| `forest-50..900` | leafy greens | rich evergreens |
| `earth-50..900`  | warm sand / loam | deep umber |
| `sky-50..900`    | satellite blue | midnight |
| `accent`         | `#16a34a` | `#22c55e` |

Typography: Inter (UI), JetBrains Mono (code / IDs), DM Serif Display
(marketing).

---

## 1. Web — Dashboard (default)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  BYOT   ▾Org: Greenfield Farms                              🔔 5   👤 Ada  │
├──────────────┬─────────────────────────────────────────────────────────────┤
│ ▣ Dashboard │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ 🌳 Trees    │ │  4 821     │ │ 312.4 t    │ │ 245.7 tCO2e│ │ 96 %       │ │
│ 🛰 Satellite│ │  Trees     │ │ Biomass     │ │ Annual seq │ │ Healthy    │ │
│ 🧠 AI       │ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
│ ⛅ Carbon   │                                                              │
│ 📍 Map      │ ┌──────────────────────────┐  ┌─────────────────────────┐   │
│ 📑 Reports  │ │ Carbon Growth (12 mo)    │  │ Health Distribution     │   │
│ 🔔 Alerts   │ │ [stacked area chart]     │  │ [donut: healthy/mod/un] │   │
│ ⚙ Settings  │ └──────────────────────────┘  └─────────────────────────┘   │
│              │                                                              │
│              │ ┌─────────────────────────────────────────────────────────┐ │
│              │ │  Live map  (Mapbox)  •  cluster •  heatmap toggle       │ │
│              │ │  [vector tiles from /tiles/trees/{z}/{x}/{y}.mvt]       │ │
│              │ └─────────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

## 2. Web — Tree detail

```
< Back     BYOT-7K3X-29A1   Azadirachta indica (Neem)   ● Healthy  ✓ Satellite
┌───────────────────────────────────────────────────────────────────────────┐
│   [primary photo]                                                          │
│   age 5y · DBH 18 cm · height 6.2 m · canopy 4.1 m                          │
├──────────────────────────────────┬────────────────────────────────────────┤
│  Carbon                            │  AI analysis (latest)                  │
│  • Stored:    46.1 kg C            │  Species  Azadirachta indica  (0.93)   │
│  • CO₂e:      169.0 kg             │  Health   Healthy             (0.88)   │
│  • Annual:    12.4 kg              │  Growth   DBH 18.5, H 6.2     (0.81)   │
│  • Lifetime:  0.78 tCO₂e           │  ▸ View raw output                     │
│  • Revenue:   $9.36                │                                         │
├──────────────────────────────────┴────────────────────────────────────────┤
│  Satellite (Sentinel-2)                                                    │
│  NDVI  ▁▂▃▅▆▇▇▆▅▅▆▇   12-mo · last 2025-05-14 · cloud 6 %                   │
│  Presence confirmed · ΔNDVI +0.02 (stable)                                  │
├───────────────────────────────────────────────────────────────────────────┤
│  Photos timeline   [thumbnails carousel]                                    │
│  Alerts (2)        [Health spike on 2025-04 · resolved]                     │
│  Passport          [⬇ PDF]   [QR]                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

## 3. Web — Add tree wizard (3 steps)

```
1) Locate         2) Identify         3) Photos
────────────────  ──────────────────  ────────────────
[map picker]      species typeahead    drop / capture
GPS auto-fill     planted_at          up to 5 images
± accuracy        plantation (opt)     primary photo
                                       [Submit & Analyse]
```

## 4. Web — Map view

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Layers ▾ Trees  Heatmap  NDVI  Carbon  Health           [Search address] │
│                                                                          │
│              [full-bleed Mapbox map; clusters; sidebar tree card]        │
└──────────────────────────────────────────────────────────────────────────┘
```

## 5. Web — Carbon insights

```
KPI strip: Stored / Annual / Lifetime / Revenue
Chart 1: Carbon by species (bar)
Chart 2: Carbon over time (area)
Table:   Top 10 trees by sequestration
Side:    "Estimate a new plantation" calculator widget
```

## 6. Web — Reports

```
[New report] kind: Tree | Plantation | Carbon | ESG     format: PDF | XLSX
Filters: date range · org · plantation · species · health
[Queue]
Recent reports table: status · created · download
```

## 7. Mobile — Screens

* **Auth** — Splash, sign in (email or Google), OTP.
* **Home** — KPI cards, map snippet, "Add Tree" FAB.
* **Add Tree** — capture GPS, capture/import photos, species suggestion.
* **Tree Details** — health, carbon, satellite chip, passport share.
* **Photos** — gallery + capture more.
* **AI Analysis** — re-run, view recommendations.
* **Carbon Report** — per-tree and aggregate.
* **Map** — Mapbox with my trees; tap → detail.
* **Notifications** — list + preferences.
* **Profile** — org, role, theme, sign out.

## 8. Accessibility

* All interactive elements have a visible focus ring and aria labels.
* Charts ship with a data-table alternative.
* Color is never the sole signal (icons + text labels accompany health
  states).
* Min font size 14 px; respects `prefers-reduced-motion`.
