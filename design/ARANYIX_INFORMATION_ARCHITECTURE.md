# Aranyix Mobile Information Architecture

**Version:** 1.0 (prototype)  
**Journey:** SEE → CAPTURE → VERIFY → PROVE

---

## 1. Navigation model

### Primary: bottom navigation (5 tabs)

Evaluated hypothesis **Home · Map · Field · Monitor · More** — **adopted with role variants**.

| Tab | Purpose | User question answered |
|-----|---------|------------------------|
| **Home** | Today’s operational brief | What needs my attention? |
| **Map** | Spatial context | Where are things happening? |
| **Field** | Capture & verify hub | What am I capturing / verifying? |
| **Monitor** | Intelligence & health | What is changing? What’s at risk? |
| **More** | Workspace, compliance, account | Everything else |

### Role-specific bottom nav

| Tab | Field worker | Supervisor | Professional / exec | Citizen BYOT |
|-----|--------------|------------|---------------------|--------------|
| Home | ✓ | ✓ | ✓ | ✓ |
| Map | ✓ | ✓ | ✓ | ✓ |
| Field | ✓ | ✓ | ✓ | ✓ |
| Monitor | — | ✓ | ✓ | — |
| More | ✓ (replaces Monitor) | ✓ | ✓ | ✓ |

Citizens get **Monitor** replaced by **More** (4 tabs + alerts badge on Home).

**Alerts** move to:
- Badge on Home + Monitor tab
- Dedicated inbox inside Monitor (not a top-level tab)

---

## 2. Drawer → “More” menu

The hamburger drawer is **removed**. Replaced by **More** tab + contextual sheets.

### More menu structure

```
WORKSPACE
  Active project selector (persistent context chip on all tabs)
  Projects
  Field queue (violations, survival due, sync pending)

INTELLIGENCE
  Monitoring detail (full portfolio view)
  Alert inbox
  Bioacoustic (if professional)

COMPLIANCE & MRV
  Reports & exports
  Evidence bundles (per project)

CARBON & CREDITS
  Carbon overview
  Credit ledger (supervisor+)

TOOLS
  AI Assistant

ACCOUNT
  Profile
  Settings (language, biometrics, sync, notifications)
  Sign out
```

### What was removed / merged

| Old drawer item | New location | Rationale |
|-----------------|--------------|-----------|
| Dashboard | **Home** | Same content, renamed |
| Trees | **Field → Registry** + Map layers | Trees are field objects, not top-level nav |
| Map | **Bottom tab** | Spatial is first-class |
| Field Ops | **Home brief** + **Field queue** | Ops are tasks, not a destination |
| Monitoring | **Monitor tab** | Intelligence surface |
| Bioacoustic | **Field hub** + More | Capture workflow |
| Alerts | **Monitor → Alerts** | Actionable inbox |
| Reports | **More → Compliance** | Infrequent, deep |
| Assistant | **More → Tools** | Utility |
| Carbon | **More → Carbon** | Secondary |
| Credits | **More → Credits** | Supervisor only |
| Profile | **More → Account** | Standard pattern |

---

## 3. Screen map (prototype)

### Auth
- Welcome
- Login (email / phone OTP tabs)
- Signup
- Onboarding pending / org profile

### Home
- Operational brief (actions, sync status, project context)
- Role variants: field worker vs supervisor vs citizen

### Map
- Tree + work area layers
- Alert pins
- Selected object sheet (tree / work area)
- Quick actions: Register here · Navigate · Survey

### Field
- **Hub:** Register tree · Survival survey · Bioacoustic · Plot visit
- **Registry:** Photo-forward tree list (grid/list toggle)
- **Register flow:** 3 steps (see UX Decisions)
- **Tree detail:** Photo hero, status, timeline, actions
- **Survival survey:** Camera + status + optional measure
- **Sync queue:** Pending / failed / synced

### Monitor
- **Brief:** Sites at risk, NDVI drops, fire/flood (decision cards)
- **Alerts inbox:** Filtered, grouped by severity
- **Alert detail:** What / where / severity / recommended action / deep link to map

### More
- Menu sections (above)
- Projects list → Project detail
- Reports, Carbon, Credits, Assistant, Profile, Settings

### States (embedded in flows)
- Loading skeletons
- Empty (no trees, no alerts, no project)
- Error (API, permission, GPS, camera)
- Offline banner + queue
- Sync progress

---

## 4. Project as workspace context

Projects are **not** a bottom tab for all users. Instead:

- **Project chip** in app bar (tap to switch)
- Persists across Home, Map, Field, Monitor
- Filters registry, map layers, monitoring, alerts
- “All projects” for org-wide supervisors

---

## 5. Information hierarchy principles

1. **Photos first** for trees — visual registry
2. **GPS context automatic** — show accuracy, don’t make users type coordinates
3. **Scheme rules invisible** until they block — progressive compliance
4. **Measurements deferred** unless scheme requires at registration
5. **AI suggestions after capture** — species/health from photo, not upfront forms
6. **Sync always visible** — pending count in header

---

## 6. Deep links (preserved)

| Link | Target |
|------|--------|
| `/p/:code` | Tree detail |
| `/trees/new?project=&work_area=` | Register with context |
| `/monitoring?fence=` | Monitor → work area |
| `/map?focus=` | Map → work area |

---

## 7. Prototype file mapping

| Prototype screen ID | Production route (future) |
|---------------------|---------------------------|
| `screen-home` | `/home` |
| `screen-map` | `/map` |
| `screen-field` | `/field` (new) |
| `screen-registry` | `/trees` |
| `screen-tree-detail` | `/trees/:id` |
| `screen-register-1..3` | `/trees/new` |
| `screen-monitor` | `/monitoring` |
| `screen-alerts` | `/notifications` |
| `screen-alert-detail` | alert sheet |
| `screen-more` | `/more` (new) |
| `screen-project` | `/projects/:id` |
| `screen-login` | `/login` |
