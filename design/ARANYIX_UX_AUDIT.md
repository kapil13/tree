# Aranyix Mobile UX Audit

**Date:** 2026-09-05  
**Scope:** Flutter app (`/mobile`), backend APIs (`/backend`), product workflows  
**Method:** Codebase inspection — routes, APIs, models, offline queues, RBAC  
**Rule:** This audit describes current state; it does **not** assume current UI is correct.

---

## 1. Product summary

Aranyix is a **field + intelligence + MRV** platform for plantation and forest programmes in India. Mobile users:

- **Capture** GPS-verified tree evidence in the field
- **Verify** survival, measurements, compliance placement
- **Prove** carbon, credits, and regulatory evidence to auditors

Core journey (target): **SEE → CAPTURE → VERIFY → PROVE**

---

## 2. Current mobile stack

| Layer | Technology |
|-------|------------|
| Framework | Flutter 3.4+, Material 3 |
| State | Riverpod |
| Routing | go_router |
| Offline | SQLite queues (trees, bioacoustic) |
| Maps | flutter_map + OSM |
| Auth | JWT, OTP, Google OAuth, biometrics |

27 screen files under `mobile/lib/src/screens/`.

---

## 3. Current navigation audit

### Bottom navigation (role-dependent)

| Persona | Tabs |
|---------|------|
| Field worker | Home · Trees · Map · Alerts |
| Supervisor | Home · Map · Alerts · Trees |
| Professional | Home · Monitoring · Projects · Alerts |
| Citizen BYOT | Home · Trees · Map · Profile |

**Issues:**
- No single “Field” hub — capture is scattered (FAB, drawer, project detail)
- Professional users lose **Map** from bottom nav (map only in drawer)
- **Monitoring** and **Alerts** overlap conceptually for supervisors
- **Profile** hidden for field workers in bottom nav (drawer only)

### Drawer (mirrors web sitemap)

5 sections, 14 destinations — reads as **admin sidebar**, not mobile IA:

| Section | Items |
|---------|-------|
| Overview | Dashboard |
| Plantation | Projects, Trees, Map, Field Ops |
| Intelligence | Monitoring, Bioacoustic, Alerts |
| Reports | Reports, Assistant, Carbon, Credits |
| Account | Profile |

**Issues:**
- Drawer duplicates bottom nav (Home, Trees, Map, Alerts, Monitoring, Projects, Profile)
- “Reports” section mixes compliance exports, AI chat, and carbon ledger
- Field Ops separated from Map and tree registration
- Bioacoustic in drawer + footer button (redundant)
- No settings, language, or sync status in drawer

---

## 4. Screen-by-screen audit

### Authentication & onboarding
| Screen | Route | Assessment |
|--------|-------|------------|
| Splash | `/` | OK — offline token tolerance |
| Welcome | `/welcome` | Marketing-heavy for repeat users |
| Login | `/login` | Email + OTP + Google — dense |
| Signup | `/signup` | 3-step — appropriate for professional |
| Org profile wizard | `/onboarding/org-profile` | Required for gov/NGO — OK |
| Pending approval | `/onboarding/pending` | OK |

### Home / dashboard
| Screen | Assessment |
|--------|------------|
| Executive home | KPI cards — dashboard-first, not field-first |
| Field worker home | Better — queues, tasks — but still card-heavy |

**Gap:** Home does not clearly answer “What should I do in the field right now?”

### Trees
| Screen | Assessment |
|--------|------------|
| Tree list | **Text-heavy list** — photos not prominent; feels like database |
| Tree detail | Functional — images, timeline, actions buried |
| Add tree (5 steps) | Context → Species → Location → Photos → Review |

**Critical issues:**
- Registration asks for **species/DBH/height before photos** — wrong order for field + compliance (photos + EXIF GPS are primary evidence)
- 5 steps with typing-heavy species step
- No progressive disclosure by scheme rules
- List does not scale visually for large registries

### Map
| Screen | Assessment |
|--------|------------|
| Map | OSM + work areas — good foundation |
| Drawing fences | Supervisor feature — mixed with field view |

**Gap:** Map not integrated as primary spatial context for registration or alerts

### Projects & field ops
| Screen | Assessment |
|--------|------------|
| Projects list | Standard list |
| Project detail | Many actions — setup, register, compliance |
| Field ops | Violations + survival due — good data, weak prioritization |

### Monitoring & alerts
| Screen | Assessment |
|--------|------------|
| Monitoring | Metrics display — not decision-oriented |
| Notifications | Raw alert list — limited action hierarchy |

### Intelligence & compliance
| Screen | Assessment |
|--------|------------|
| Bioacoustic | Recording + queue — field-usable |
| Reports | Download-oriented — desktop pattern on mobile |
| Carbon / Credits | Read-heavy — appropriate for supervisors |
| Assistant | Chat — OK |

### Profile
| Screen | Assessment |
|--------|------------|
| Profile / edit | Basic — missing sync diagnostics, language prominent |

---

## 5. Tree registration workflow (current vs product)

### Current flow (5 steps)
1. Context (project, work area, scheme fields)
2. Species + measurements (DBH, height)
3. GPS location
4. Photos
5. Review

### Product reality (from APIs + compliance)
- **GPS + photos** are primary evidence (`compliance-check`, EXIF strict mode, duplicate detection)
- **Species** can be suggested from location (`species-suggestions`)
- **Measurements** often optional at registration; survival surveys collect later
- **Scheme rules** vary — CAMPA vs NHAI vs BYOT need progressive disclosure
- **Offline queue** already exists — UX should foreground sync confidence

### Verdict
Current order optimizes for **data entry**, not **field capture**. Redesign required.

---

## 6. Offline & sync audit

| Capability | Status |
|------------|--------|
| Tree registration queue | SQLite + sync service |
| Bioacoustic queue | SQLite + audio files |
| Splash offline auth | Token without `/me` |
| Connectivity banner | Present |
| Queue UI on home | Partial |

**Gaps:**
- No global sync status (pending count, last sync, failed items)
- User cannot easily answer “Is my data safe?”
- No per-tree sync state in registry

---

## 7. RBAC & persona gaps

| Persona | Mobile needs | Current gaps |
|---------|--------------|--------------|
| Field worker | Fast capture, map, survival surveys | Map not in bottom nav for pros; registration heavy |
| Supervisor | Queue triage, monitoring, team context | Monitoring vs alerts split awkwardly |
| Citizen BYOT | Simple adopt/register | Professional drawer items hidden — OK |
| Verifier | Attest samples | **No mobile verifier workflow** |

---

## 8. Visual design audit

Current theme (`theme.dart`):
- Heavy green (`forest`, `forestLight` surfaces)
- Large radii (22px cards, 16px buttons)
- Soft shadows, rounded cards everywhere
- Google Fonts — generic SaaS feel

**Issues:**
- “Green SaaS” — not “forest intelligence”
- Excessive rounding and card chrome
- Icons oversized relative to data density
- Tree photos underused as visual anchor

---

## 9. Backend/API gaps for mobile UX

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No batch tree list with thumbnail URLs | Slow photo-rich registry | Add `thumbnail_url` to `TreeListItem` or CDN transform |
| Alert payload inconsistent | Hard to build actionable alert detail | Standardize alert schema with `deep_link`, `entity_type`, `recommended_action` |
| No mobile-optimized monitoring summary | Monitor tab overload | Add `GET /mobile/field-brief` aggregating actions |
| Verifier workflow web-only | Field attestations need laptop | Phase 2 — mobile verifier mode |
| Species ID on-device | Reduces typing | Optional — use AI analysis async after photo |
| Plot monitoring visits | API exists, **no mobile screen** | Add to Field hub for stratified sampling |

---

## 10. Audit conclusions

1. **IA is web-sidebar ported to mobile** — needs field-first restructuring  
2. **Tree registry must be photo-centric** — current list fails product promise  
3. **Registration must be capture-first** — photos + GPS before optional metadata  
4. **Map must be a primary tab** for all field roles  
5. **Monitoring must be decision-oriented** — not metric dashboards  
6. **Alerts must be actionable** — severity, context, next step  
7. **Visual language needs premium forest-intelligence direction** — less green chrome  
8. **Sync trust must be visible** — offline is implemented but not surfaced  

**Next:** See `ARANYIX_INFORMATION_ARCHITECTURE.md`, `ARANYIX_DESIGN_SYSTEM.md`, `ARANYIX_UX_DECISIONS.md`, and `/design/prototypes/`.
