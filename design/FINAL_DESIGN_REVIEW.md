# Aranyix Mobile — Final Design Review

**Version:** 3.0  
**Date:** 2026-09-05  
**Status:** FINAL HTML PROTOTYPE — awaiting approval  
**Prototype:** `design/prototypes/index.html`  
**Rule:** No production implementation until explicit **APPROVED — IMPLEMENT**

---

## 1. Product understanding

Aranyix is a **field + intelligence + MRV** platform for plantation and forest programmes in India. It serves government highway programmes (NHAI), CAMPA compensatory afforestation, urban forests (Nagar Van), corporate ESG, NGO community planting, and citizen BYOT tagging.

### Core product layers

| Layer | What it is | Examples |
|-------|------------|----------|
| **Planting program** | Platform access + form schema | `government_nhai`, `byot`, `corporate_esg` |
| **Central scheme** | Govt funding/compliance context | `nhai_highway`, `campa_ca`, `nagar_van` |
| **Planting project** | Operational unit with work areas | NHAI KM-48 Greenbelt |
| **Tree** | GPS-verified digital asset with evidence | ARX-NH-004821 |
| **Monitoring** | Satellite/SAR/NDVI intelligence | Scan engine, alerts |
| **Evidence/MRV** | Proof for auditors and credits | Reports, bundles, compliance |

### Product journey

**SEE → CAPTURE → VERIFY → PROVE**

- **SEE:** Command center dashboard, map, monitoring brief
- **CAPTURE:** Tree registration, bioacoustic, survival surveys
- **VERIFY:** Compliance checks, field verification, survival status
- **PROVE:** Reports, evidence bundles, carbon/credits

### Web + Mobile = ONE product

The web app (`frontend/`) and mobile app (`mobile/`) must share the same business process. Web optimizes for desktop workspace and bulk management; mobile optimizes for field capture, GPS, camera, offline, and one-handed use. **They are not two different products.**

---

## 2. Existing UX problems

### Navigation
- Mobile drawer mirrors web sitemap (14 items) — reads as admin panel, not mobile IA
- No unified "Field" hub — capture scattered across FAB, drawer, project pages
- Map not first-class for all roles (professionals lose bottom-nav map)
- Monitoring and Alerts overlap conceptually

### Dashboard / Home
- Mobile home is a shallow metrics strip, not a command center
- Web executive dashboard is rich; mobile does not wire `GET /v1/intelligence/brief`
- No interactive drill-down from insight → location → asset → action
- Decorative cards with numbers that go nowhere

### Tree registration
- Mobile: 5-step wizard front-loads typing (species, DBH) before evidence
- Does not mirror web `mode="project"` flow (GPS → pit photo? → photos → species)
- Does not call or reflect `registration-context` API inheritance
- Re-asks program/scheme/project context per tree instead of session inheritance
- Web blocks scheme users without `?project=` — mobile should match

### Tree registry (v2 prototype issue — fixed in v3)
- v2 used photo-forward **grid** — inappropriate at 1,000+ trees
- v3 redesign: **asset-management compact list** with thumbnails, category overview, pagination
- Designed for server-side search, cursor pagination, virtualized lists in production

### v3 prototype assessment

| Area | v2 state | v3 change |
|------|----------|-----------|
| Registry | Photo grid (6 trees) | **1,248-tree scale** with compact rows, 25/page pagination |
| Registry IA | Gallery-first | **Overview chips** → filtered list → detail |
| Field | Mini admin (4 action cards) | **Execution layer**: context, nearby alert, tasks, nearby trees, map link |
| Dashboard | Good command center | Retained; KPI links to registry categories |
| Registration | Web-aligned context | Retained |

---
- Generic green SaaS — large radii, green surfaces, decorative cards
- Does not communicate "forest intelligence"

### Web/Mobile gaps
- Mobile lacks intelligence brief API integration
- Citizen home uses heuristic vs web citizen dashboard
- Verifier workflow web-only

---

## 3. UX principles

1. **One product process** — web and mobile share program/scheme/project/tree workflows
2. **Context inheritance** — never re-ask known information
3. **Dashboard = command center** — not a navigation screen
4. **Insight → action** — every metric drills to something real
5. **Capture-first** — GPS + photos before optional metadata
6. **Field-simple** — large targets, minimal typing, offline-visible
7. **Map first-class** — spatial context for field and monitoring
8. **Progressive disclosure** — scheme rules invisible until they block
9. **Forest intelligence aesthetic** — calm, credible, data-driven, not CRUD SaaS

---

## 4. Final information architecture

### Bottom navigation

**Home · Map · Field · Monitor · More**

| Tab | Purpose |
|-----|---------|
| **Home** | Intelligence command center |
| **Map** | Spatial context — trees, alerts, work areas |
| **Field** | Capture & verify hub |
| **Monitor** | Decision-support monitoring |
| **More** | Workspace, compliance, account |

**Citizen variant:** Monitor hidden (4 tabs); alerts surfaced on Home.

### Drawer removed

14 former drawer items redistributed (see `ARANYIX_INFORMATION_ARCHITECTURE.md`).

### Project as workspace context

Persistent **project chip** in app bar. Filters dashboard, map, registry, monitoring. Not a daily bottom tab for all users.

---

## 5. Navigation strategy

- **Shallow primary nav** (5 tabs max)
- **Deep secondary** via More menu + contextual sheets
- **Dashboard connects** to all destinations — not a dead end
- **Back stack** preserves drill-down context
- **Role-aware tab visibility** — field workers may de-emphasize Monitor

---

## 6. Dashboard strategy

The Home tab is renamed internally to **Command center**. It answers on open:

| Question | Dashboard section |
|----------|-------------------|
| What is happening? | Operational status banner + AI brief |
| What changed? | Forest integrity trend, recent activity |
| What needs attention? | Priority queue (alerts, trees, sync, surveys) |
| Where? | Spatial preview → Map |
| Why does it matter? | Integrity factors, alert context |
| What to do next? | Priority action CTAs |
| Evidence state? | Evidence gaps KPI → Reports |
| Project health? | Project performance cards |

### Hierarchy (top to bottom)

1. Operational status banner
2. Forest integrity hero (tap → drill-down)
3. AI brief line
4. Scrollable KPI chips (trees, alerts, attention, evidence, carbon)
5. What needs attention (priority cards)
6. Spatial preview (tap → Map)
7. Project performance
8. Recent activity (tap → tree/alert/report)
9. Primary CTA: Register tree in context

---

## 7. Dashboard interaction model

Every meaningful component is tappable:

| Component | Tap action |
|-----------|------------|
| Forest integrity 76/100 | → Integrity drill-down: factors, affected projects, recommended actions |
| KPI: 18 need attention | → Filtered tree list |
| KPI: 4 alerts | → Alert inbox |
| KPI: 5 evidence gaps | → Reports |
| Priority: NDVI drop | → Alert detail → Map |
| Priority: 1 pending sync | → Sync queue |
| Priority: 12 surveys due | → Field hub |
| Map preview | → Full map with pins |
| Project card | → Project intelligence |
| Activity item | → Tree detail / Alert / Report |
| Register CTA | → Context-aware registration |

**No decorative numbers.** Prototype demonstrates all above interactions.

---

## 8. Role-aware dashboard strategy

| Role | Dashboard emphasis |
|------|-------------------|
| **Field supervisor** | Today's priorities, sync queue, field queue, map preview, register CTA |
| **Field worker** | Assigned tasks, nearby trees, sync status, survival due, simplified KPIs |
| **Program manager / exec** | Forest integrity, project progress, monitoring risks, evidence gaps, carbon |
| **Citizen BYOT** | Trees tagged, carbon estimate, onboarding checklist, AI scan quota |

Prototype v2 demonstrates **supervisor** shell. Role toggle documented for implementation.

---

## 9. Web/Mobile consistency strategy

### Shared workflow model

```
Program enrollment (settings)
  → Project creation (scheme picker, refs, defaults, work areas)
    → Registration context established (registration-context API)
      → Tree capture (GPS, photos, species — tree-specific only)
        → Validation (compliance-check preview + server on submit)
          → Success → Register another (context retained, suggested_next)
```

### Device optimizations only

| Aspect | Web | Mobile |
|--------|-----|--------|
| Program/scheme select | Project setup wizard, full forms | Once per session; context banner |
| Registration layout | Side-by-side panels | Step-by-step full screen |
| Bulk operations | Tables, exports | Not applicable |
| GPS | Browser geolocation | Native GPS + accuracy |
| Photos | Upload zone | Camera-first, strict mode camera-only |
| Offline | Limited | SQLite queue, visible sync state |
| Dashboard | Multi-column panels | Scrollable command center + drill-downs |

### Consistency test (tree registration)

| Step | Web (`new-tree-client.tsx`) | Mobile (prototype v2) | Consistent? |
|------|----------------------------|----------------------|-------------|
| Entry | `/trees/new?project=` required for scheme users | Context from project chip or establish once | ✓ |
| Program | Locked from project | Inherited, not re-selected | ✓ |
| Scheme | From `project.scheme_code` | Inherited from context | ✓ |
| Project | URL param | Project chip / session context | ✓ |
| Work area | From GPS + registration-context | Auto-detected, shown not re-typed | ✓ |
| Pit/spacing/guard | Inherited standard | Inherited panel (read-only) | ✓ |
| GPS | Step 1 | Step 1 | ✓ |
| Pit photo | If `require_pit_photo` | Conditional step 2 slot | ✓ |
| Plant photos | Min from standard | Min from inherited rules | ✓ |
| Species | After photos, AI suggest | After photos, AI suggest | ✓ |
| Chainage | If `chainage_enabled` | Road side field conditional | ✓ |
| Compliance | POST compliance-check preview | Pass/warn banner | ✓ |
| Submit | POST /v1/trees | Register → success | ✓ |
| Register another | Refetch registration-context, suggested_next | Context retained, chainage increments | ✓ |

---

## 10. Program/Scheme context strategy

### Three-layer context

1. **Program** — who you are (`government_nhai`, `byot`, etc.)
2. **Scheme** — what rules apply (`nhai_highway`, `campa_ca`, etc.)
3. **Project** — where you work (NHAI KM-48)

### Establishment flow (prototype)

**Establish context** screen (shown once per session or when no project selected):
1. Select program
2. Select scheme (filtered by program)
3. Select project (filtered by scheme)
4. → Context locked for session

### Visible context banner (all registration steps)

```
Government NHAI → NHAI Highway Plantation
NHAI KM-48 Greenbelt
Chainage 142–148 · KM 146+200
🔒 Context inherited — not re-entered per tree
```

### APIs

- `GET /v1/planting-projects/{id}/registration-context` — drives inheritance
- `merge_project_into_tree_metadata()` on server — enforces on submit

---

## 11. Tree registration strategy

### Philosophy

**"Capture a tree"** — not "fill out a form."

### Mobile flow (project mode — primary)

**Prerequisite:** Program + Scheme + Project context established.

| Step | Tree-specific capture | Inherited (not asked) |
|------|----------------------|------------------------|
| 1. GPS & placement | Confirm/adjust GPS, compliance preview | Work area, chainage suggestion, project, scheme rules |
| 2. Photos | Pit photo (if required), plant photos | Min count, camera-only in strict mode |
| 3. Species & submit | Species confirm/edit, road side (if chainage) | Everything from registration-context |

### Standalone BYOT flow

For citizens without project: minimal program schema (species optional, 1 photo, GPS). Scheme users **must** have project — matches web `SchemeProjectRequiredBanner`.

### Register another

After success:
- Context retained (program, scheme, project, work area)
- `suggested_next` refetched — chainage/GPS advance
- Photos reset; species may persist
- Session counter shown: "3 trees registered · context retained"

---

## 12. No-repeat-data-entry strategy

Before showing any field, ask: **"Is this already known?"**

| Data | Source | Mobile UX |
|------|--------|-----------|
| Program | Project / enrollment | Inherited banner |
| Scheme | Project.scheme_code | Inherited banner |
| Project | Workspace chip | Inherited banner |
| Work area | GPS + compliance-check | Auto-detected |
| Pit size, spacing, guard | Planting standard template | Inherited panel |
| Implementing agency | tree_registration_defaults | Hidden |
| Permit reference | Scheme refs → defaults | Hidden |
| Chainage | registration-context suggested_next | Prefilled, editable |
| Species | AI after photo | Suggested, not upfront |
| DBH, height, canopy | Scheme rules (usually deferred) | Not in field registration |
| Carbon | Async post-registration | Not shown at capture |

**Repeated questions are a UX defect.**

---

## 13. Tree Registry strategy (v3 — scalable asset management)

### Design principle

The registry is **asset management at scale**, not a photo gallery.

| Scale | UX approach |
|-------|-------------|
| < 50 trees | Compact list still works |
| 1,000 trees | Pagination + server search + category filters |
| 10,000+ trees | Virtualized list + cursor pagination + bbox map filter |

### Overview (top of registry)

Interactive category chips with counts:

- **1,248** All
- **82** Attention
- **16** Missing evidence
- **31** Stale scan
- **45** Unverified
- **1,048** Healthy

Tap → filtered registry with result count: *"82 trees match"*

### Compact row hierarchy

```
[44px thumbnail]  ARX-NH-004821          124m
                  Neem
                  NHAI · Ch. 142–148
                  [Healthy] [Unverified]
```

Photos are **visual identity** (small thumbnail), not the primary layout.

### Search & filter

- Primary: search bar (ID, species, area, project)
- Category chips (overview)
- Sort: recent, tree ID, nearest, health
- Sheet: additional filters (health, sync, verification)
- Server-side search/filter in production (`page`, `bbox`, `q` params)

### Pagination model (prototype)

- 25 trees per page (not 1,248 DOM nodes)
- Prev/Next with "Showing 1–25 of 1,248"
- Procedural data generation simulates backend scale

### Production requirements

- `TreeListItem.thumbnail_url` for small thumbs
- Cursor-based pagination API
- Virtualized `ListView` (Flutter)
- Lazy image loading + disk cache
- Offline: cached recent trees subset

---

## 14. Registry scalability strategy

```
User opens Registry
  → Overview stats (from API aggregate)
  → Optional category filter
  → Server query (search + filter + sort + page)
  → Virtualized compact list (25–50 visible rows)
  → Tap row → Tree detail (full photo)
```

**Anti-patterns rejected:**
- Photo card grid at scale
- Loading all trees client-side
- Full-size images in list rows

---

## 15. Tree Detail strategy

Progressive disclosure sections:

1. **Identity** — photo hero, code, species
2. **Current state** — health, verification, sync badges
3. **Location** — project, work area, coordinates (tap → map)
4. **Monitoring** — NDVI, last scan, integrity
5. **Timeline** — registered, verified, alerts
6. **Actions** — survey, view on map, evidence

Not a raw database dump.

---

## 16. Field strategy (v3 — execution layer)

Field answers: **"What do I need to do right now?"**

Not a mini admin panel with four equal action cards.

### Field screen structure

1. **Active context banner** (program → scheme → project)
2. **Nearest critical alert** → map / alert detail
3. **Primary CTA:** Register tree in context
4. **Nearby tasks** (inspect, survey, evidence, verify)
5. **Nearby trees** (compact rows with distance, tap → detail)
6. **Map shortcut** in app bar
7. **Sync status** card

### Field ↔ Map connection

- Nearby trees sorted by proximity
- Alert card opens map at affected area
- Tree detail → View on map
- Map → pin → field inspect

---

## 16. Map strategy

First-class bottom tab. Connects:

- Trees (clustered pins)
- Work areas (polygons)
- Alerts (severity pins)
- My location

**Flows:**
- Map → pin → tree sheet → detail / survey / navigate
- Map → alert pin → alert detail → field action
- Map → long-press → Register here (pre-fills GPS)
- Dashboard spatial preview → full map

---

## 17. Monitoring strategy

Decision-support, not metrics dump.

**Monitor tab structure:**
1. Action required (cards with CTAs)
2. Site health (NDVI bars, stale scan warnings)
3. Hazards (fire/flood when applicable)

Each item answers: What? Where? When? Why? What to do?

---

## 18. Alert strategy

Actionable operational information:

- Severity stripe + plain language title
- Context (project / work area)
- Recommended action button
- Drill-down: affected trees, map, evidence, verify

Not a generic notification inbox.

---

## 19. Evidence/MRV strategy

Connected chain:

**Action → Evidence → Verification → MRV → Report**

Dashboard shows evidence gaps KPI. Reports accessible via More. Per-project evidence bundles. Status: complete / incomplete / pending / verified.

---

## 20. Bioacoustic/Biodiversity strategy

Part of intelligence system, not isolated:

- Field hub: capture workflow
- More: library / history
- Dashboard/monitoring: biodiversity KPIs with drill-down
- Contributes to ecosystem health score on web executive dashboard

---

## 21. Reports/Carbon/Credits strategy

Secondary surfaces in More menu. Connected via dashboard KPIs:

- Carbon: portfolio tCO₂e with per-project breakdown
- Credits: ledger for supervisors
- Reports: compliance exports, MRV bundles

Flow: Dashboard → Project → Evidence → Report

---

## 22. AI strategy

Utility in More + brief on dashboard:

- Explain forest conditions, alerts, monitoring
- Summarize project performance
- Find information
- Not a disconnected chatbot — links to alert/tree context

Prototype: Assistant with contextual NDVI explanation + link to alert.

---

## 23. Design system

Documented in `ARANYIX_DESIGN_SYSTEM.md`. Summary:

- **Colors:** Forest `#0B3D2E`, neutrals `#F7F8F6`, semantic only for status
- **Typography:** DM Sans + IBM Plex Mono for codes/GPS
- **Radius:** 6–14px (reduced from 22px)
- **Components:** Buttons 48px, context banner, integrity hero, priority cards, inherited panel
- **States:** Offline banner, sync badges, empty/loading skeletons

---

## 24. Screen inventory

| Screen | Prototype ID | Status |
|--------|--------------|--------|
| Welcome / Auth | `welcome`, `login`, `signup` | ✓ Interactive |
| Command center | `home` | ✓ v2 — full drill-downs |
| Integrity drill-down | `dashboard-integrity` | ✓ New v2 |
| Attention drill-down | `dashboard-attention` | ✓ New v2 |
| Map | `map` | ✓ Pins, sheets, FAB |
| Field hub | `field` | ✓ |
| Tree registry | `registry` | ✓ Grid/list, search, filter |
| Tree detail | `tree-detail` | ✓ |
| Context establishment | `register-context` | ✓ New v2 |
| Tree capture | `register` | ✓ v2 — web-aligned |
| Register success | `register-success` | ✓ New v2 — register another |
| Monitor | `monitor` | ✓ |
| Alerts / detail | `alerts`, `alert-detail` | ✓ |
| More menu | `more` | ✓ |
| Projects / detail | `projects`, `project-detail` | ✓ |
| Sync queue | `sync-queue` | ✓ |
| Reports, Carbon, Credits | `reports`, `carbon`, `credits` | ✓ |
| AI Assistant | `assistant` | ✓ |
| Profile, Settings | `profile`, `settings` | ✓ |
| Empty, Loading | `empty`, `loading` | ✓ |

---

## 25. Major UX decisions

1. **Command center Home** replaces shallow dashboard
2. **Drawer removed** → 5-tab nav + More
3. **Context inheritance** for registration — program/scheme/project asked once
4. **Web-aligned 3-step capture** — GPS → photos → species (not 5-step typing-first)
5. **Register another** retains context + suggested_next chainage
6. **Photo-forward registry** with attention flags
7. **Interactive dashboard** — every metric drills somewhere real
8. **Map as bottom tab** for all field/supervisor roles
9. **Forest intelligence visual language** — restrained green, strong typography

---

## 26. Removed/deprecated UX patterns

| Removed | Reason |
|---------|--------|
| 14-item hamburger drawer | Sitemap, not product architecture |
| 5-step mobile registration with upfront species/DBH | Contradicts capture-first + web flow |
| Green card backgrounds everywhere | Generic SaaS, not forest intelligence |
| Trees as bottom tab | Trees are objects; Field is the mode |
| Static metric cards without drill-down | Decorative, not command center |
| Re-asking program/scheme per tree | Context inheritance defect |

---

## 27. Backend/API/data gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| `GET /v1/intelligence/brief` not wired on mobile | High | Web executive dashboard uses this |
| `TreeListItem.thumbnail_url` | High | Photo-rich registry |
| Alert schema: `recommended_action`, `deep_link`, `entity_id` | Medium | Actionable alert cards |
| `GET /mobile/field-brief` (aggregated) | Medium | Optional — reduce parallel calls |
| Plot visit mobile screen | Medium | API exists, no mobile route |
| Verifier workflow mobile | Low | Web-only today |
| Citizen dashboard parity | Medium | Web has rich citizen shell |
| Role-based dashboard variants | Medium | Single prototype shell today |

---

## 28. Web/Mobile inconsistencies discovered

| Area | Web | Mobile (current prod) | Prototype v2 |
|------|-----|----------------------|--------------|
| Registration steps | 4 (project mode) | 5 (typing first) | 3 (capture-first) ✓ |
| registration-context | Used | Not used | Demonstrated ✓ |
| Scheme without project | Blocked | Allowed? | Blocked via context setup ✓ |
| Intelligence brief | API | Client heuristic | Mock brief ✓ |
| Dashboard richness | Executive panels | Shallow | Command center ✓ |
| Pit photo conditional | Yes (NHAI) | No | Yes ✓ |
| Register another | suggested_next | Unknown | Demonstrated ✓ |

---

## 31. Product risks

| Risk | Mitigation |
|------|------------|
| Registry performance at 10k+ trees | Server pagination, virtualization, thumbnail-only in list |
| Offline registry subset stale | Show "offline mode · last synced" + queue indicator |
| Context confusion across projects | Persistent context banner + locked program in project mode |
| Dashboard overload | Strict hierarchy + progressive disclosure |
| Web/mobile registration drift | Shared registration-context API contract |
| Image bandwidth in field | Thumbnails in list; full res only in detail |

---

## 32. Unresolved product decisions

1. **Citizen home** — 4-tab nav vs simplified single-screen?
2. **Context establishment** — always explicit screen vs auto from last project?
3. **Verifier queue** — Field tab section vs supervisor-only?
4. **Bioacoustic** — Field primary vs More library emphasis?
5. **Offline context** — can user switch project offline?
6. **Map tiles** — Google vs offline-capable provider?
7. **Dashboard role toggle** — single adaptive layout vs distinct shells?
8. **i18n** — Hindi labels in prototype v3?

---

## 30. Recommendations for production implementation

### Phase 1 — Foundation
1. Apply design system to `mobile/lib/src/theme.dart`
2. Restructure navigation per IA (5 tabs, remove drawer)
3. Wire `GET /v1/intelligence/brief` on home
4. Implement context banner component

### Phase 2 — Command center
1. Rebuild home as command center with drill-down routes
2. Port `portfolioOperationalStatus` logic from web
3. Interactive KPI chips → existing screens

### Phase 3 — Registration
1. Replace 5-step wizard with web-aligned project mode
2. Integrate `registration-context` API on flow start
3. Conditional pit photo, chainage, species-suggestions
4. Register another with suggested_next refetch

### Phase 4 — Registry & polish
1. Photo-forward grid with thumbnails API
2. Attention flags from monitoring/alerts
3. Empty/loading/offline states audit
4. UX consistency check against prototype

### Do NOT
- Change backend business logic without gap analysis
- Invent mobile-only registration fields
- Ship without web/mobile consistency test

---

## Approval gate

> **APPROVED — IMPLEMENT**

Required before any production code changes.

---

## Prototype files

| File | Purpose |
|------|---------|
| `design/prototypes/index.html` | Entry point |
| `design/prototypes/css/design-system.css` | Tokens |
| `design/prototypes/css/app.css` | Components |
| `design/prototypes/js/mock-data.js` | Realistic data |
| `design/prototypes/js/app.js` | SPA router + interactions |

## Companion docs

- `design/ARANYIX_UX_AUDIT.md`
- `design/ARANYIX_INFORMATION_ARCHITECTURE.md`
- `design/ARANYIX_DESIGN_SYSTEM.md`
- `design/ARANYIX_UX_DECISIONS.md`
- `design/PROTOTYPE_REVIEW.md`
