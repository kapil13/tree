# Aranyix Mobile — Final Design Review

**Version:** 4.0  
**Date:** 2026-09-05  
**Status:** FINAL HTML PROTOTYPE — awaiting approval  
**Prototype:** `design/prototypes/index.html`  
**Rule:** No production implementation until explicit **APPROVED — IMPLEMENT**

---

## Summary

v4 completes the mobile redesign as an interactive HTML prototype aligned with the web app business process. It demonstrates command-center intelligence, context-first registration, scalable registry (1,248 trees), field execution, map connectivity, **global drawer navigation**, and **Bioacoustic as a first-class module**.

---

## 1. Information architecture

### Bottom navigation (primary)

**Home · Map · Field · Monitor · More**

| Tab | Role |
|-----|------|
| **Home** | Command center — what changed, what needs attention, what to do next |
| **Map** | Spatial layer connecting trees, alerts, work areas, evidence |
| **Field** | Execution — context, nearby tasks/trees, registration, sync |
| **Monitor** | Decision-support monitoring and hazards |
| **More** | Opens **global drawer** (not a sitemap screen) |

### Global drawer (More)

Organized sections exposing the full platform without cluttering bottom nav:

- **Workspace:** Command center, Projects, Tree registry (1,248), Field queue & sync
- **Field & map:** Field, Map
- **Intelligence:** Monitoring, **Bioacoustic**, Biodiversity, Alerts
- **Compliance & MRV:** Evidence, Reports, MRV status
- **Carbon & credits:** Carbon, Credits
- **Tools:** AI Assistant
- **Account:** Profile, Settings, Sign out

### Project context

Persistent **project chip** in app bar filters dashboard, map, registry, and monitoring. Registration inherits program → scheme → project once per session.

---

## 2. Dashboard (command center)

Answers: what is happening, what changed, what needs attention, where, why it matters, what to do next.

**Every metric is drillable:**

| Element | Action |
|---------|--------|
| Forest integrity hero | → Integrity drill-down (factors, projects, actions) |
| KPI chips | → Registry, Alerts, Attention list, Evidence, Carbon |
| Priority queue | → Alert detail, attention registry, sync queue, field |
| Spatial preview | → Full map |
| Project cards | → Project detail |
| **Bioacoustic intelligence card** | → Bioacoustic module |
| Recent activity | → Tree / alert / report |
| Register CTA | → Context-aware registration |

---

## 3. Context-first tree registration

**Flow:** Program → Scheme → Project (establish once) → Capture tree → Register another

- Context banner on every capture step — program, scheme, project, work area
- Inherited scheme rules shown read-only (pit size, spacing, guard, min photos)
- Tree-specific only: GPS → photos (pit if required) → species → submit
- **Register another** retains context; chainage/GPS advances via `suggested_next`
- Matches web `registration-context` / project mode — no duplicate data entry

**Prototype screens:** `register-context` → `register` (3 steps) → `register-success`

---

## 4. Tree registry (scale)

Designed for **1,000–10,000+ trees**, not a demo gallery.

- **1,248 trees** with procedural data
- Category overview chips: All, Attention, Missing evidence, Stale scan, Unverified, Healthy
- Compact scannable rows: 44px thumbnail, code, species, project/area, status badges
- Search, sort, filter sheet, pagination (25/page)
- Row tap → Tree detail; categories drill from dashboard KPIs

---

## 5. Field (execution layer)

Field is for **doing work**, not administration.

1. Active context banner
2. Nearest critical alert → map/detail
3. Primary CTA: Register tree in context
4. Nearby tasks (inspect, survey, evidence, verify, **bioacoustic**)
5. Nearby trees (compact rows + distance)
6. Sync queue status

---

## 6. Map

Core spatial experience connecting trees, alerts, work areas, and registration.

- Layer chips (trees, work areas, alerts)
- Pin sheet → tree detail / alert action
- FAB: Register here (pre-fills GPS context)
- Linked from dashboard, field, alerts, bioacoustic, tree detail

---

## 7. Bioacoustic

Major capability — not a simple audio recorder.

- **Dedicated module** (`bioacoustic`) accessible from drawer and dashboard
- Ecosystem acoustic health score, species detections, session history
- Capture flow with inherited project context (`bioacoustic-capture`)
- Session detail with species confidence, evidence bundle, map link
- **Biodiversity fusion** screen combining bioacoustic + satellite signals
- Field task type for dusk-window surveys
- Connected to Monitoring, Evidence, Map, Dashboard

---

## 8. Tree detail

Digital asset view with progressive disclosure:

Identity → Location → Current state → Monitoring → Timeline → Actions

Not a raw database dump. Key actions: survey, view on map, evidence.

---

## 9. Key UX decisions

| Decision | Rationale |
|----------|-----------|
| 5-tab bottom nav | Field-ready; shallow primary IA |
| More → drawer | Full platform access without sitemap bottom nav |
| Command center Home | Single pane of glass; all metrics drillable |
| Context inheritance | One product process with web; fast bulk registration |
| Compact registry rows | Scale to 10k+ trees; thumbnails as identity not gallery |
| Bioacoustic first-class | Forest intelligence differentiator |
| Web-aligned 3-step capture | GPS → photos → species; matches `new-tree-client.tsx` |

---

## 10. Prototype flows demonstrated

| Flow | Path |
|------|------|
| Context → Register → Register another | `register-context` → `register` → `register-success` → `register` |
| Dashboard → drill-downs | Integrity, attention registry, alerts, evidence, bioacoustic |
| Field → Task → Action | Field tasks → registry / capture / bioacoustic / alert |
| Registry → Search/Filter → Detail | 1,248 trees, categories, pagination |
| Drawer → Modules | More → Bioacoustic, Evidence, Projects, Settings, etc. |
| Map → Pin → Tree | Map sheet → detail / register FAB |

---

## 11. States

Prototype includes: Loading, Empty, Offline banner, Sync queue, GPS accuracy in capture, Missing/broken image thumbs, Success (register), Permission-style auth tabs.

---

## 12. Visual design

- Forest intelligence aesthetic: restrained green (`#0B3D2E`), neutral surfaces
- Data-driven typography (DM Sans + mono for codes/GPS)
- Reduced card/pill decoration; priority cards and integrity hero for emphasis
- Field-ready 48px targets; compact registry density

See `design/ARANYIX_DESIGN_SYSTEM.md` for tokens and components.

---

## 13. Screen inventory (v4)

| Screen | ID | Notes |
|--------|-----|-------|
| Command center | `home` | Drill-downs + bioacoustic card |
| Global drawer | More tab | Slide-over from right |
| Bioacoustic | `bioacoustic`, `bioacoustic-capture`, `bioacoustic-detail` | New v4 |
| Biodiversity | `biodiversity` | Fusion view |
| Evidence & MRV | `evidence` | Pipeline + gaps |
| Tree registry | `registry` | 1,248 trees, pagination |
| Field | `field` | Execution layer |
| Registration | `register-context`, `register`, `register-success` | Context-first |
| Map, Monitor, Alerts | `map`, `monitor`, `alerts` | Connected intelligence |

Full list in prototype quick-jump controls.

---

## 14. Production gate

> **APPROVED — IMPLEMENT**

Required before any changes to `mobile/`, `frontend/`, or backend.

Recommended implementation order: design system → navigation/drawer → command center API → registration-context → registry virtualization → bioacoustic module routes.

---

## Prototype files

| File | Purpose |
|------|---------|
| `design/prototypes/index.html` | Entry + reviewer controls |
| `design/prototypes/css/design-system.css` | Tokens |
| `design/prototypes/css/app.css` | Components, drawer, registry, bioacoustic |
| `design/prototypes/js/mock-data.js` | 1,248-tree model, dashboard, bioacoustic |
| `design/prototypes/js/app.js` | SPA router + all interactions |

## Companion docs

- `design/ARANYIX_UX_AUDIT.md`
- `design/ARANYIX_INFORMATION_ARCHITECTURE.md`
- `design/ARANYIX_DESIGN_SYSTEM.md`
- `design/ARANYIX_UX_DECISIONS.md`
- `design/PROTOTYPE_REVIEW.md`
