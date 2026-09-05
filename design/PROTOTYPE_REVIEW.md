# Aranyix Mobile Prototype — Review Guide

**Version:** 1.0  
**Status:** Ready for review  
**Prototype entry:** `design/prototypes/index.html`

---

## How to review

1. Open `design/prototypes/index.html` in a desktop browser (Chrome recommended).
2. Use the **phone frame** for the primary walkthrough — all interactions happen inside it.
3. Use **Quick jump** buttons below the phone to jump to specific screens during review.
4. Read companion docs:
   - `ARANYIX_UX_AUDIT.md` — current-state audit
   - `ARANYIX_INFORMATION_ARCHITECTURE.md` — navigation & screen map
   - `ARANYIX_DESIGN_SYSTEM.md` — visual tokens & components
   - `ARANYIX_UX_DECISIONS.md` — product decisions & API gaps

---

## Prototype file list

| File | Purpose |
|------|---------|
| `index.html` | Entry point, phone shell, reviewer quick-jump |
| `css/design-system.css` | Design tokens (colors, typography, spacing) |
| `css/app.css` | Component & screen styles |
| `js/mock-data.js` | Realistic trees, alerts, projects, monitoring data |
| `js/app.js` | SPA router, screen renderers, interactions |

---

## Interactive flows to test

### Authentication
- [ ] Welcome → Sign in → Email / Phone OTP tabs
- [ ] Sign in enters the app (Home tab)

### Primary navigation (bottom tabs)
- [ ] Home · Map · Field · Monitor · More
- [ ] Active tab highlight
- [ ] Alert badge on Home & Monitor

### Home
- [ ] Operational brief with stats
- [ ] Action cards (sync, alerts, register)
- [ ] Project context chip (tap → project sheet)

### Map
- [ ] Tree pins + alert pin
- [ ] Tap pin → bottom sheet (tree or alert)
- [ ] Layer chips toggle (visual)
- [ ] FAB → Register tree
- [ ] Sheet actions → Tree detail / Alert detail

### Field hub
- [ ] Four capture actions (register, survey, bioacoustic, plot visit)
- [ ] Tree registry preview grid
- [ ] Sync status card → Sync queue

### Tree registry
- [ ] Photo-forward grid (default) / list toggle
- [ ] Search by code, species, work area
- [ ] Filter sheet (health, sync, verification)
- [ ] Missing photo placeholder
- [ ] Sync badges (synced / pending / failed)
- [ ] Tap tree → Tree detail
- [ ] Tap photo → Full-screen viewer

### Tree detail
- [ ] Photo hero with overlay
- [ ] Status badges (health, verification, sync)
- [ ] Location, monitoring, timeline sections
- [ ] Actions: View on map, Survey

### Tree registration (3 steps)
- [ ] Step 1: GPS + work area auto-detect + compliance pass
- [ ] Step 2: Photo capture (camera/gallery mock) — min 1 to continue
- [ ] Step 3: Species suggestion + submit / register next
- [ ] Offline mode (Settings) → “Save offline” messaging
- [ ] Back navigation between steps

### Monitor
- [ ] Action-required cards with CTAs
- [ ] Site health NDVI bars
- [ ] Hazard card (fire watch)

### Alerts
- [ ] Filter chips
- [ ] Severity stripes
- [ ] Tap → Alert detail with recommended action

### More menu (replaces drawer)
- [ ] Workspace: Projects, Field queue
- [ ] Intelligence: Monitoring, Alerts, Bioacoustic
- [ ] Compliance: Reports
- [ ] Carbon & Credits
- [ ] Tools: AI Assistant
- [ ] Account: Profile, Settings, Sign out

### Secondary screens
- [ ] Projects list → Project detail → Set active project
- [ ] Sync queue with pending/failed trees
- [ ] Reports list
- [ ] Carbon overview
- [ ] Credit ledger
- [ ] AI Assistant chat
- [ ] Profile
- [ ] Settings (offline toggle, sync prefs, clear queue dialog)

### States
- [ ] Offline banner (toggle in Settings)
- [ ] Empty state demo
- [ ] Loading skeleton demo
- [ ] Confirmation dialog (clear failed queue)

---

## Redesigned navigation

### Bottom navigation
**Home · Map · Field · Monitor · More**

(Citizen variant: Monitor hidden — not shown in this prototype; see IA doc.)

### Drawer removed
All 14 former drawer items redistributed:
- Dashboard → Home
- Trees → Field → Registry
- Map → Bottom tab
- Field Ops → Home actions + Field queue
- Monitoring → Monitor tab
- Alerts → Monitor + badge
- Bioacoustic → Field hub + More
- Reports / Carbon / Credits / Assistant / Profile → More sections

---

## Major UX changes

| Area | Before | After |
|------|--------|-------|
| Navigation | 14-item hamburger drawer | 5-tab bottom nav + More menu |
| Tree list | Text-heavy list | Photo-forward grid with sync/health badges |
| Registration | 5 steps, typing first | 3 steps: Place → Evidence → Confirm |
| Monitoring | Metrics dump | Decision cards + action CTAs |
| Alerts | Raw notification list | Severity hierarchy + recommended actions |
| Visual | Green SaaS cards everywhere | Forest intelligence — restrained surfaces |
| Project context | Buried in forms | Persistent project chip |
| Offline | Hidden in settings | Banner + per-tree sync + queue screen |

---

## Key product decisions (summary)

See `ARANYIX_UX_DECISIONS.md` for full detail.

1. **SEE → CAPTURE → VERIFY → PROVE** journey drives IA
2. GPS + photos before optional metadata at registration
3. Species AI-suggested after photo, not upfront form field
4. DBH/height deferred unless scheme mandates
5. Map is first-class, not drawer-only
6. Alerts are operational, not notification feed
7. Projects are workspace context, not a daily tab

---

## Backend / API gaps

| Gap | Impact | Proposed |
|-----|--------|----------|
| `TreeListItem.thumbnail_url` | Photo registry needs efficient thumbnails | Add to list API response |
| Alert `recommended_action` + `deep_link` | Actionable alert cards | Standardize alert schema |
| `GET /mobile/field-brief` | Home operational brief | New aggregated endpoint |
| Plot visit mobile screen | Field hub action has no route | Add mobile plot visit flow |
| Verifier workflow | Web-only today | Mobile verify queue for supervisors |
| Registration-context per scheme | Chainage/rules visibility | Already exists — surface in Step 1 only when required |

---

## Unresolved questions

1. **Citizen BYOT nav** — 4 tabs (no Monitor) or simplified Home-only?
2. **Bioacoustic** — Field hub primary vs More library for playback?
3. **Verifier role** — Dedicated tab or queue inside Field?
4. **Map provider** — Google Maps (current) vs Mapbox for offline tiles?
5. **Tree registry default view** — Grid vs list per role?
6. **Push notifications** — Deep link to alert detail vs map focus?
7. **Plot monitoring visits** — Separate flow or part of survival survey?
8. **i18n** — Hindi/regional labels in prototype scope for v2?

---

## Approval gate

**Do not implement in production until explicit approval:**

> **APPROVED — IMPLEMENT**

Upon approval, implementation will:
1. Apply design system to Flutter `mobile/lib/src/theme.dart`
2. Restructure navigation per IA doc
3. Rebuild screens to match prototype
4. Preserve existing APIs; file backend gaps separately
5. Run tests, lint, typecheck, and UX consistency audit

---

## Reviewer notes

- Prototype uses Unsplash tree photos for realism; production uses uploaded evidence photos.
- Map is a styled placeholder — interactions (pins, sheet) are representative, not live GIS.
- Role switching (field worker vs citizen) is documented but not toggled in prototype v1.
- Quick-jump controls are reviewer-only; not part of production UI.
