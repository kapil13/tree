# Aranyix Mobile — Complete Screen-by-Screen Gap Assessment

**Date:** 2026-09-09  
**Scope:** Flutter mobile app (`mobile/`) vs production field/intelligence requirements derived from web portal (`frontend/`), backend APIs (`backend/`), and design IA (`design/ARANYIX_INFORMATION_ARCHITECTURE.md`).  
**Method:** Code inspection only — routes in `mobile/lib/src/app.dart`, RBAC in `route_access.dart` / `nav_access.dart`, 32 screen files under `mobile/lib/src/screens/`, API client in `mobile/lib/src/api/api_client.dart`, web routes under `frontend/app/(app)/`.  
**Classification:** P0 = critical/functionality · P1 = important UX/workflow · P2 = enhancement

---

## Executive summary

The mobile app has a **solid field-capture core**: 5-step add-tree wizard with compliance/GPS/camera-only photos, offline tree + bioacoustic queues, survival/re-geotag survey, map with work-area draw, command-center home, and role-gated bottom tabs. Gaps cluster around **web parity for intelligence/compliance**, **orphaned or stubbed supervisor workflows**, **list UX (thumbnails, project context)**, and **missing screens** (project setup, satellite workspace, plantation MIS reports, credits ledger detail, portfolio health).

| Area | Maturity | Top gap |
|------|----------|---------|
| Auth / onboarding | Good | Deep-link `next=` after login incomplete |
| Dashboard / Home | Good | Project chip picker does not filter app-wide context |
| Map | Good | No navigate-to-GPS, NDVI/SAR overlays, focus query handling |
| Field ops | Partial | Violation resolve UI orphaned; sync link noop |
| Tree registry | Good | No photo thumbnails; project filter not exposed |
| Tree detail | Partial | Single scroll vs web 3-tab Overview/Field/Intelligence |
| Add tree | Strong | 5 internal steps vs 3-step IA label; offline queue redirect |
| Monitoring | Good | No plot-level drill-down; SAR action text only |
| Alerts | Good | Preferences in sheet; no push deep-link to alert |
| Bioacoustic | Strong | Professional-only tab |
| Evidence / MRV | Stub | Pipeline UI only; no bundle export or per-tree evidence |
| Reports | Minimal | 5 kinds; no download; web has 16 plantation MIS |
| Carbon / Credits | Partial | Estimate tool + summary only |
| Settings | Good | No team/org admin, billing, webhooks |
| Offline / sync | Good | No per-item delete/edit before sync |

---

## Navigation & shell (cross-cutting)

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| App shell / bottom nav | Home · Map · Field (can_write) · Monitor (supervisor/pro) · Bio (pro). Drawer for workspace/intelligence/compliance. Trees **not** in bottom nav. | IA v4.2: same 5-tab model; Trees via Field/Map/More; persistent project context chip | Drawer retained (IA said remove hamburger); Trees drawer-only hurts discoverability; project picker on Home does not persist filter | P1 | `nav_access.dart`, `nav_groups.dart`, `ARANYIX_INFORMATION_ARCHITECTURE.md` | Add optional Trees quick access or Field hub registry link; implement global project context provider |
| RBAC route guard | `canAccessPath` gates projects, field, bio, monitoring, reports, credits, add-tree, survival | All restricted routes guarded; evidence/biodiversity drawer-only | `/evidence`, `/biodiversity` reachable by URL without route rule | P1 | `route_access.dart` vs `nav_groups.dart` | Add `_RouteRule` for `/evidence`, `/biodiversity` |
| Register-tree FAB | Shown on `/trees`, `/map`, `/monitoring` (not home/field) | FAB on all field capture surfaces including Field tab | Field tab uses bottom bar instead of FAB; Home has `PrototypeFieldCaptureBar` | P2 | `app_shell.dart` `showFieldFabOnRoute` | Align FAB policy with IA or document intentional split |
| Deep link `/p/:code` | Resolves public code → `/trees/:id` after auth | QR/public code opens tree detail | Works; login `next=` param not wired in redirect | P1 | `app.dart` `TreeDetailDeepLinkScreen`, `login_screen.dart` | Honor `?next=` post-login |
| Orphan screens | `FieldWorkerHomeScreen`, `FieldOpsScreen` exist, unrouted (`/field-ops` → `/field`) | Field worker home variant; violation resolve workflow | Field ops resolve only in orphan screen; `_FieldOpsBody` violation cards `onTap: () {}` | P0 | `field_screen.dart`, `field_ops_screen.dart` | Wire violation resolve + survival due actions into Field ops body or restore route |

---

## Authentication & welcome

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Splash `/` | Token check → welcome or home | Brand + session restore | OK | — | `splash_screen.dart` | — |
| Welcome `/welcome` | Brand hero, journey carousel, Login / Sign up CTAs | Marketing entry, clear CTAs, back none | OK | — | `welcome_screen.dart` | — |
| Login `/login` | Email/password, phone OTP, Google OAuth, captcha, remember-me, invite preview, session-expired banner, dev API URL (debug) | All auth methods; forgot password link; invite accept | `?next=` deep link not applied after success | P1 | `login_screen.dart`, `app.dart` redirect | Redirect to `next` query after auth |
| Signup `/signup` | Multi-step: phone OTP, email OTP, org, captcha | Full registration + verify | OK (matches web signup flow) | — | `signup_screen.dart` | — |
| Forgot password `/forgot-password` | Request + confirm reset | Email/phone reset | OK | — | `auth_flow_screens.dart` | — |
| Auth callback `/auth/callback` | OAuth token exchange | Google redirect handling | OK | — | `auth_flow_screens.dart` | — |
| Onboarding pending `/onboarding/pending` | Wait state for org approval | Block app until approved | OK | — | `onboarding_screens.dart` | — |
| Org profile wizard `/onboarding/org-profile` | Org details form post-signup | Required org profile for pro accounts | OK | — | `org_profile_wizard_screen.dart` | — |

**Required fields (auth):** email/phone + password or OTP; captcha when enabled.  
**States:** loading, error snackbars, session expired — present.  
**Offline:** login fails gracefully (network error messages).

---

## Dashboard / command center

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Home `/home` | Command center: portfolio health banner, AI brief line, signal strip (alerts, attention, trees, species/healthy%), queue cards, map preview, connected project, bio teaser, live feed; pull-to-refresh; offline + pending sync banners; bottom `PrototypeFieldCaptureBar` for register | Role-aware ops brief; project context; actionable queue; link to map/monitor/field; weather optional | Project picker modal does not filter trees/map/monitor; no weather surfaced in UI; all users see same layout (no `FieldWorkerHomeScreen`); executive vs field worker parity with web `/dashboard` | P1 | `home_screen.dart`, web `dashboard/page.tsx` | Global project scope; optional field-worker simplified home |
| Home — project chip | Shows first fence name +N; tap opens picker | Switch active project across app | Picker does not persist selection to providers | P0 | `home_screen.dart` `_showProjectPicker` | Project context provider wired to list/map APIs |
| Home — queue section | Shows unread alerts (max 3) → notifications | Field tasks + violations + survival due | Queue is alerts-only, not field-ops queue | P1 | `home_screen.dart`, web field-ops summary | Merge violations/survival from `fieldOpsSummaryProvider` |
| Home — loading/error | Spinner; error + retry | Skeleton + retry | OK | — | | |
| Home — offline | `OfflineConnectivityBanner`, `PendingSyncBanner` | Offline banner + sync CTA | OK | — | | |
| Home — RBAC | All authenticated users | Viewers read-only (no capture bar) | `canAddTrees` hides capture bar | — | `nav_access.dart` | — |

**Primary CTA:** Register tree (bottom bar) or tap queue item.  
**Back:** Drawer menu (no back — tab root).

---

## Map

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Map `/map` | OSM `flutter_map`; layers Trees / Work areas / Alerts; tree + alert pin sheets; bbox-loaded trees; polygon/corridor draw + save work area (write); center on tree centroid | Spatial ops: layers, selection sheet, register here, navigate, survey | No external maps navigate; `?focus=` from monitoring not handled; no NDVI/SAR raster; no user location dot; draw requires project pick in sheet only | P1 | `map_screen.dart`, web `map/page.tsx` | Parse focus query; add "Open in Maps"; optional GPS puck |
| Map — tree pin sheet | Code, species, health, View tree, Register here | Thumbnail, project/area, actions | No photo thumbnail on sheet | P1 | `map_screen.dart` | Pass `image_url` if API returns |
| Map — alert pin sheet | Severity, title, View alert | Link to map location + alert detail | OK | — | | |
| Map — draw mode | Polygon (≥3 pts) / corridor (≥2); undo/cancel/save | Work area creation for supervisors | OK for API `createWorkArea` | — | | |
| Map — states | Loading/error/retry; empty map defaults Hyderabad | Offline tiles message | No offline tile cache | P2 | | Document online-only maps |
| Map — RBAC | All users view; draw gated `can_write` | Viewers see map, no draw | OK | — | `route_access.dart` `/map/draw` | — |

**Primary CTA:** Select pin → View tree / alert.  
**FAB (shell):** Register tree on `/map`.

---

## Field operations

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Field tab `/field` | Dual body: `_FieldCaptureBody` (workers) vs `_FieldOpsBody` (supervisor/pro/admin). Capture: next alert hero, queue, nearby trees. Ops: KPIs, violations list, projects, survival meta | Capture hub + ops queue; sync queue entry; map shortcut | "Today's queue" Sync link is **noop** (`onLink: () {}`); violation cards in ops body **no onTap**; survival due not actionable | P0 | `field_screen.dart` L109, L205 | Link Sync → `/sync-queue`; wire violation → map/detail + resolve |
| Field — capture body | Nearby trees (5), alerts as tasks | GPS-nearby trees, assigned tasks | Uses global `treesProvider` not geo-sorted | P1 | `field_screen.dart` | Sort by distance when location available |
| Field — ops body | `fieldOpsSummaryProvider` KPIs | Open violations, survival due, project drill-down | Missing resolve violation (exists only in orphan `FieldOpsScreen`) | P0 | `field_ops_screen.dart` `_resolve` | Port resolve + survival list from orphan screen |
| Field worker home (orphan) | Dedicated simplified home with primary field actions | Field workers see task-first home per IA | **Not routed** — all workers get Command center | P1 | `field_worker_home_screen.dart`, `isFieldWorkerHome` | Route field workers to simplified home or merge UX |
| Field-ops `/field-ops` | Redirect to `/field` | Dedicated ops or merged | Orphan screen has richer violation UX than live tab | P1 | `app.dart` redirect | Merge orphan features before delete |

**Primary CTA:** Capture tree (bottom `PrototypeFieldCaptureBar`).  
**Offline:** `PendingSyncBanner` on both bodies.

---

## Projects

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Projects list `/projects` | Cards: name, segment, compliance mode, tree count, violations; offline queue section | Search/filter; create project (supervisor); empty CTA | No search/sort; **no create project**; no pull-to-refresh | P1 | `projects_list_screen.dart`, web `projects/new` | Add refresh; supervisor create entry |
| Project detail `/projects/:id` | Name, code, segment, chips, integrity gate card, work areas list → add tree per area | Sub-routes: compliance, credits, team, settings, setup wizard | **No** compliance/credits/team/settings/setup (web has `/projects/[id]/*`) | P0 | `project_detail_screen.dart`, web project workspace | Mobile sub-screens or deep links to web |
| Project detail — integrity | Fusion gate, blocking trees list | Monitoring gate reasons + remediation | Read-only display OK | — | | |
| Project detail — work areas | Tap → `/trees/new?project&work_area` | View on map, edit geometry, plot monitoring | Only launches register; no map focus | P1 | | Add "View on map" per work area |
| Project detail — FAB | Register tree with project context | Primary register CTA | OK | — | | |
| RBAC | field_worker, supervisor, professional | Viewers? | Viewers blocked at route level | — | `route_access.dart` | — |

**List row should contain:** name, segment label, compliance mode, tree count, open violations badge — **present**.

---

## Tree registry / list

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Tree list `/trees` | Registry UI: search (client-side on page), health filter sheet, sort (recent/code/health), category chips (all/attention/missing evidence/stale/unverified/healthy), pagination 50/page, `PrototypeRegistryRow` | Photo thumbnail, Tree ID, species, project/area, status, date, health badges; server search; project filter | **`imageUrl` never passed** — emoji thumb only; `_projectFilter` in API but **no UI** to set it; category counts only on current page; stale category defined client-side (90d geotag) | P0 | `tree_list_screen.dart`, `PrototypeRegistryRow` | Wire `thumbnail_url`/`images[0]`; add project filter chip |
| Tree list — actions | Tap row → detail; FAB/add icon → new tree | Swipe actions: survey, map | Row tap only | P2 | web trees list | Optional quick actions |
| Tree list — states | Loading, error+retry, empty+register CTA, refresh | Offline cached list | Online-only fetch | P1 | | Cache last page offline |
| Tree list — RBAC | All see list; add gated | Viewers read-only | OK | — | | |

**Primary CTA:** Open tree detail.  
**Back:** `PrototypeBackBar` (drawer stack).

---

## Tree detail

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Tree detail `/trees/:id` | Hero photo, status summary, action rail (Map/Inspect/Evidence/Monitor), location chip, audit blockers, satellite card, timeline, QR share, survival + follow-up photo, AI analysis, satellite health run | Web tabs: **Overview / Field survey / Intelligence** with measurements, pest intel, SAR, full gallery | Single scrolling page; no tabbed IA; **no measurement history** (`listTreeMeasurements` unused); no SAR/pest panels; evidence → generic `/evidence` not tree-scoped | P0 | `tree_detail_screen.dart`, `tree-detail-view.tsx` | Add tabs or sections; fetch measurements |
| Tree detail — photos | Hero uses first image; follow-up camera upload | Full gallery, EXIF/GPS integrity per photo | No gallery grid; no delete photo | P1 | web field tab | Photo grid + integrity badges |
| Tree detail — actions | Share QR, run AI, run satellite, re-geotag, add photo | Edit metadata, delete tree (admin), verification workflow | No edit/delete; no verification status change | P1 | backend verification APIs | Role-gated edit |
| Tree detail — states | Loading, error+retry | Offline cached detail | Online only | P1 | | Cache tree detail |
| Deep link `/p/:code` | Loader → resolve → `/trees/:id` | Public code entry | OK | — | | |

**Primary CTA:** Inspect → survival survey.  
**Back:** `context.pop()` transparent app bar.

---

## Add / register tree (wizard)

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Step 0 — Context `/trees/new` | Project mode: work area picker, setup readiness, scheme warning; BYOT: program picker; compliance mode indicator | Project + work area required for scheme programs; setup gate blocks | OK; setup blocks advance | — | `add_tree_screen.dart` `_stepContext` | — |
| Step 1 — Species | Species text, allowed list, NHAI road side/guard/pit, DBH/height/method, segment extras from scheme | Required species; compliance species list; measurements optional | OK | — | | |
| Step 2 — GPS | Capture GPS, accuracy, chainage label, map preview, compliance check trigger | GPS required; camera-only for photos later | OK; `allowFallback` on GPS per `location_helper` | — | | |
| Step 3 — Photos | Camera capture only, min photos from program, local + uploaded keys | Min photos, EXIF preserved, no gallery pick | OK (camera-only intentional) | — | | |
| Step 4 — Review | Compliance results, metadata summary, save | Strict mode blocks save | OK | — | | |
| Wizard chrome | 5 internal steps, **3-step** progress label (Site/GPS/Photos) | Clear step indicator | Steps 0–1 merged in visual "1" — can confuse | P2 | IA 3-step | Align labels with internal steps |
| Save behavior | Online: `createTree` → detail or register-next; Offline: queue + redirect `/projects` | Confirm success; queue when offline | Offline redirect to projects not sync queue | P1 | `_save` catch block | Redirect to `/sync-queue` with snackbar |
| Register next | Resets GPS/photos, suggested next coordinate from `registrationContext` | Bulk planting session | OK for project mode | — | | |
| Query params | `?project=`, `?work_area=` | Preserve from map/project | OK | — | | |
| RBAC | `can_write` route | Viewers blocked | OK | — | | |

**Primary CTA (last step):** Save & next (project) or Register tree.  
**Cancel:** Back in app bar pops route.  
**Validation:** Per-step snackbars — OK.

---

## Tree photos / evidence (per tree)

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| In-tree follow-up photo | Camera → upload → `addTreeImage` | Audit evidence with GPS/timestamp | OK on detail screen | — | `tree_detail_screen.dart` | — |
| In-tree gallery | Hero only | All images with dates, integrity flags | Missing | P1 | web tree detail field tab | Gallery component |
| Evidence hub `/evidence` | Pipeline visualization, verified/pending/gap stats, gap cards → field, reports CTA | Per-project MRV bundles, export, tree-level evidence | **Stub** — no API export; gaps derived from dashboard KPIs only; not tree-scoped | P0 | `evidence_screen.dart`, web compliance/MRV | Integrate MRV export APIs; tree-filtered gaps |
| Survival survey photos | Optional survey photo on re-geotag | Required for audit in strict programs? | Optional — OK | P2 | compliance rules | Gate by program |

---

## Monitoring

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Monitoring `/monitoring` | Needs-decision alerts (→ alert detail), site pulse NDVI rows per work area, bio summary teaser | Portfolio health, plot monitoring, SAR recommendations, weather | No portfolio-health score; no plot drill-down; `sar_recommended_action` shown as label only; `?fence=` query read but limited use | P1 | `monitoring_screen.dart`, web `monitoring/page.tsx`, `portfolio-health` | Link to project/map; plot monitoring screen |
| Monitoring — states | Loading, error, refresh, offline banner | Empty work areas copy | OK | — | | |
| RBAC | supervisor + professional (+ admin) | Field workers excluded | OK | — | | |

**Primary CTA:** Open alert detail or work area.

---

## Alerts / notifications

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Notifications `/notifications` | Filter chips (all/critical/ndvi/fire/survey), list, mark read on tap, preferences sheet (4 toggles) | Inbox with filters, mark read, preferences, push deep link | No pagination; no bulk mark-read; push → alert id not verified | P1 | `notifications_screen.dart` | Push notification handler → `/alerts/:id` |
| Alert detail `/alerts/:id` | Severity, message, recommended action CTA (tree/project/fence/map), mark reviewed | Resolve/dismiss workflows per alert kind | Loads from cached `alertsProvider` only — **no single-alert API**; if not in cache shows empty | P1 | `alert_detail_screen.dart` | Fetch alert by id or pass full payload |
| Alert preferences | Bottom sheet: satellite, survival, threat, compliance | Channel toggles | OK (uses `getAlertPreferences` / `updateAlertPreferences`) | — | | |

**Primary CTA:** Recommended action button.  
**Back:** Pop from detail; back bar on list (not tab — opened from drawer/home).

---

## Bioacoustic

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Bioacoustic tab `/bioacoustic` | Record tab (60–180s, SPL noise warning, GPS, fence picker, upload/queue) + Library tab (recordings list, sync, analyze) | Professional monitoring per site | Strong implementation | — | `bioacoustic_screen.dart` | — |
| Session detail `/bioacoustic/:id` | Species detections, audio metadata, analyze/retry | Full taxa list, regional fauna compare | Basic detail screen | P1 | `bioacoustic_session_detail_screen.dart` | Parity with web bioacoustic detail |
| Offline queue | `bioacoustic_queue` + sync | Queue + retry | OK | — | | |
| RBAC | professional only (tab + route) | | OK | — | | |

**Primary CTA:** Start/stop recording.

---

## Biodiversity

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Biodiversity `/biodiversity` | Taxa/Shannon/fusion stats, work area hotspots → map, link to bioacoustic | Species registry, trends, fused satellite+bio | Summary only; no species list; no trend charts | P1 | `biodiversity_screen.dart`, web intelligence | Species list + recording links |
| RBAC | Drawer: professional only; **no route guard** | Gate route | URL bypass | P1 | `route_access.dart` | Add route rule |

---

## Carbon

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Carbon `/carbon` | Portfolio tCO₂e hero, per-project estimates, single-tree estimate form (species/DBH/height/age) | Portfolio + project rollups + field calculator | Dashboard uses KPI totals; project rows **estimated** from average per tree | P1 | `carbon_screen.dart`, web `tools/carbon` | Use project-level carbon API if available |
| Honesty labels | "Estimate — not registry credit" | Required disclaimers | OK | — | | |

**Primary CTA:** Estimate button.

---

## Reports

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Reports `/reports` | List reports; create: kind (tree/plantation/carbon/esg/biodiversity) + format (pdf/xlsx); fence picker for plantation/biodiversity | MIS plantation suite, download/share, framework exports (BRSR/ISO) | **No download/open** of completed reports; only 5 kinds vs web **16** plantation routes; no date/project filters | P0 | `reports_screen.dart`, `frontend/app/(app)/reports/plantation/*` | Add download URL handler; plantation report picker |
| RBAC | supervisor + professional | | OK | — | | |

**Primary CTA:** Create report.

---

## Credits

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Credits `/credits` | Org summary: gross/buffer/net/issued, by_status breakdown | VM0047 ledger, project credits, verification, green credit panels | **Summary only** — no per-project ledger, no issuance history | P0 | `credits_screen.dart`, web `projects/[id]/credits` | Credits ledger list + project drill-down |
| RBAC | supervisor + professional | | OK | — | | |

---

## AI assistant

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Assistant `/assistant` | Chat UI, single-turn `api.assistant`, default sample prompt | Context-aware help (project/tree), streaming, history | No conversation persist; no app context injection | P2 | `assistant_screen.dart`, web `assistant/page.tsx` | Add session history; optional tree/project context |

**Primary CTA:** Send message.

---

## Settings / profile

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Profile `/profile` | Header, edit profile link, program memberships, language (en/hi), push, biometric, screenshot guard, analytics, version, sign out | Account settings hub | No team management, billing, privacy, webhooks, audit (web `/settings/*`) | P1 | `profile_screen.dart`, web settings routes | Link or mobile screens for org admin |
| Profile edit `/profile/edit` | Name, phone, org display | Update profile fields | OK | — | `profile_edit_screen.dart` | — |

**Primary CTA:** Edit profile.

---

## Offline / sync

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Sync queue `/sync-queue` | Tree registrations + bio recordings; sync all; retry failed | Per-item detail, delete, edit payload, progress % | Retry via mark pending only; **no delete**; no payload preview | P1 | `sync_queue_screen.dart`, web `field-ops/offline-trees` | Item detail sheet + delete |
| Connectivity banner | Global banner widget | Show offline state | OK | — | `offline_connectivity_banner.dart` | — |
| Tree registration offline | Queue on network fail in add-tree | Auto-sync on reconnect | OK | — | `tree_registration_queue.dart` | — |
| Bioacoustic offline | Queue + sync | | OK | — | | |

**Primary CTA:** Sync now.

---

## Survival survey (field)

| SCREEN | CURRENT | REQUIRED | GAP | PRIORITY | SOURCE/REASON | RECOMMENDED ACTION |
|--------|---------|----------|-----|----------|---------------|-------------------|
| Survival `/trees/:id/survival` | GPS (no fallback), survival status, DBH/height/method, remarks, optional photo, submit `regeotagTree` | Audit survey with confirm | OK core flow | — | `survival_survey_screen.dart` | — |
| Validation | GPS required before submit | | OK | — | | |
| RBAC | `can_write` for route | | OK | — | | |

**Primary CTA:** Submit survey.  
**Cancel:** Back pops.

---

## 1. Complete screen inventory

| # | Route | Screen file | In shell tabs | Routed |
|---|-------|-------------|---------------|--------|
| 1 | `/` | splash_screen.dart | — | ✓ |
| 2 | `/welcome` | welcome_screen.dart | — | ✓ |
| 3 | `/login` | login_screen.dart | — | ✓ |
| 4 | `/signup` | signup_screen.dart | — | ✓ |
| 5 | `/forgot-password` | auth_flow_screens.dart | — | ✓ |
| 6 | `/auth/callback` | auth_flow_screens.dart | — | ✓ |
| 7 | `/auth` | redirect | — | ✓ |
| 8 | `/onboarding/pending` | onboarding_screens.dart | — | ✓ |
| 9 | `/onboarding/org-profile` | org_profile_wizard_screen.dart | — | ✓ |
| 10 | `/p/:code` | app.dart (TreeDetailDeepLinkScreen) | — | ✓ |
| 11 | `/home` | home_screen.dart | ✓ | ✓ |
| 12 | `/map` | map_screen.dart | ✓ | ✓ |
| 13 | `/field` | field_screen.dart | ✓ | ✓ |
| 14 | `/monitoring` | monitoring_screen.dart | ✓ | ✓ |
| 15 | `/bioacoustic` | bioacoustic_screen.dart | ✓ | ✓ |
| 16 | `/trees` | tree_list_screen.dart | drawer | ✓ |
| 17 | `/projects` | projects_list_screen.dart | drawer | ✓ |
| 18 | `/notifications` | notifications_screen.dart | drawer | ✓ |
| 19 | `/profile` | profile_screen.dart | drawer | ✓ |
| 20 | `/trees/new` | add_tree_screen.dart | — | ✓ |
| 21 | `/trees/:id` | tree_detail_screen.dart | — | ✓ |
| 22 | `/trees/:id/survival` | survival_survey_screen.dart | — | ✓ |
| 23 | `/projects/:id` | project_detail_screen.dart | — | ✓ |
| 24 | `/alerts/:id` | alert_detail_screen.dart | — | ✓ |
| 25 | `/bioacoustic/:id` | bioacoustic_session_detail_screen.dart | — | ✓ |
| 26 | `/carbon` | carbon_screen.dart | — | ✓ |
| 27 | `/credits` | credits_screen.dart | — | ✓ |
| 28 | `/reports` | reports_screen.dart | — | ✓ |
| 29 | `/evidence` | evidence_screen.dart | — | ✓ |
| 30 | `/biodiversity` | biodiversity_screen.dart | — | ✓ |
| 31 | `/assistant` | assistant_screen.dart | — | ✓ |
| 32 | `/profile/edit` | profile_edit_screen.dart | — | ✓ |
| 33 | `/sync-queue` | sync_queue_screen.dart | — | ✓ |
| 34 | `/field-ops` | redirect → `/field` | — | redirect |
| — | *(orphan)* | field_worker_home_screen.dart | — | ✗ |
| — | *(orphan)* | field_ops_screen.dart | — | ✗ |

---

## 2. Missing screens (web or IA has; mobile does not)

| Screen | Web / business reference | Priority |
|--------|-------------------------|----------|
| Project setup wizard | `/projects/[id]/setup` | P0 |
| Project compliance workspace | `/projects/[id]/compliance` | P0 |
| Project credits workspace | `/projects/[id]/credits` | P0 |
| Project team / settings | `/projects/[id]/team`, `settings` | P1 |
| Create planting project | `/projects/new` | P1 |
| Portfolio health hub | `/portfolio-health` | P1 |
| Satellite intelligence workspace | `/satellite`, `/platform/satellite` | P1 |
| Plantation MIS report sub-screens (16) | `/reports/plantation/*` | P0 |
| Field ops offline trees admin | `/field-ops/offline-trees` | P1 |
| Intelligence summary | `/intelligence` | P1 |
| Stewardship / citizen | `/stewardship` | P2 |
| Org settings (team, billing, privacy, webhooks, audit) | `/settings/*` | P1 |
| Platform admin (superadmin) | `/platform/*` | P2 (mobile optional) |
| Plot monitoring detail | web monitoring plot APIs | P1 |
| Tree detail tabbed Intelligence view | web `tree-detail-view.tsx` | P0 |
| Dedicated field-worker home | IA + `FieldWorkerHomeScreen` | P1 |

---

## 3. Missing actions / controls

| Location | Missing action | Priority |
|----------|----------------|----------|
| Field ops body | Resolve compliance violation | P0 |
| Field ops body | Open survival-due tree list / survey | P0 |
| Field tab | Sync queue link (noop) | P1 |
| Tree list rows | Photo thumbnail, swipe quick actions | P0 / P2 |
| Tree list filter | Project picker (API param exists) | P1 |
| Tree detail | Measurement history, photo gallery, edit tree | P0 / P1 |
| Reports list | Download / share PDF/XLSX | P0 |
| Map pin sheet | Navigate external, focus tree on map from detail | P1 |
| Project work area | View on map, edit geometry | P1 |
| Sync queue | Delete queued item, view payload | P1 |
| Home project picker | Apply filter globally | P0 |
| Credits | Per-project ledger drill-down | P0 |
| Evidence | Export MRV bundle | P0 |

---

## 4. Missing states

| State | Where needed | Current | Priority |
|-------|--------------|---------|----------|
| Offline tree list cache | Tree registry | Online only | P1 |
| Offline tree detail | Tree detail | Online only | P1 |
| Skeleton loaders | Home, lists | Mostly spinners | P2 |
| Permission denied | All gated routes | Redirect to `/home` without message | P1 |
| GPS denied / disabled | Add tree, survival, bio | Error snackbars | OK |
| Camera denied | Add tree, photos | Error paths | OK |
| Sync in-progress per item | Sync queue | Global syncing flag only | P2 |
| Empty project context | Map, field | Shows org name | OK |
| Stale data indicator | Monitoring NDVI | days_since_scan in copy | OK |

---

## 5. Missing data / API support (client gaps)

API methods exist in `api_client.dart` but are **unused or underused** on mobile:

| API | Purpose | Mobile usage | Priority |
|-----|---------|--------------|----------|
| `listTreeMeasurements` | Measurement history | Not used | P0 |
| `resolveViolation` | Close compliance violation | Only in orphan `FieldOpsScreen` | P0 |
| `survivalDue` | Trees needing survey | Not used (only aggregate counts) | P1 |
| `listComplianceViolations` | Project violations list | Not used | P1 |
| `getEcosystemHealth` | Fence-level ecosystem | Not used | P1 |
| `regionalFauna` | Bioacoustic compare | Not used | P2 |
| `citizenProfile` / `citizenStewardship` | Citizen mode | Not used | P2 |
| Report download URLs | Open generated files | No client method wired in UI | P0 |
| Project CRUD / setup endpoints | Create/configure projects | Not exposed | P0 |
| Plot monitoring endpoints | Tier-3 plot visits | Not exposed | P1 |
| Credits ledger detail | Per-project credits | Not exposed | P0 |
| MRV / evidence export | Compliance bundles | Not exposed | P0 |
| Single alert fetch | Alert detail by id | Uses list cache only | P1 |

---

## 6. Web vs mobile parity gaps

| Domain | Web | Mobile | Gap severity |
|--------|-----|--------|--------------|
| Navigation | Sidebar: dashboard, trees, map, field-ops, monitoring, satellite, reports, compliance, intelligence | Bottom tabs + drawer; no satellite/compliance/intelligence routes | High |
| Tree detail | 3 tabs, measurements, AI detail, SAR, pest | Single page, limited intel | High |
| Projects | Full workspace (setup, compliance, credits, team) | List + read-only detail | High |
| Reports | 16 plantation MIS + frameworks | 5 kinds, no download | High |
| Credits | VM0047 ledger, verification | Summary totals | High |
| Field ops | Violations resolve, survival lists, offline admin | Partial merge; resolve missing | High |
| Portfolio health | Dedicated hub | Only home health score | Medium |
| Settings | Team, billing, privacy, webhooks | Profile-level only | Medium |
| Map | Google Maps, richer layers | OSM, trees/work areas/alerts | Medium |
| Monitoring | Plot monitoring, satellite digest | Work area NDVI list | Medium |
| Auth | Same flows | Parity good | Low |
| Add tree | Web wizard | Mobile 5-step + offline stronger | Mobile ahead on offline |
| Bioacoustic | Web dashboard | Mobile record + queue strong | Low |
| RBAC | `nav-access.ts` mirrored | Mostly mirrored | Low |

---

## 7. Production blockers

1. **Supervisor violation resolution not reachable** in live Field tab (orphan screen only) — blocks compliance closure in field. **P0**
2. **Report generation without download/open** — users cannot retrieve artifacts. **P0**
3. **Tree registry lacks photo thumbnails** despite component support — weak audit identity in list. **P0**
4. **Project context picker does not scope data** — multi-project orgs see blended data. **P0**
5. **Credits and evidence are display stubs** — cannot support carbon/MRV field audits. **P0**
6. **No project setup/compliance mobile path** — scheme registrations blocked on incomplete setup with only web remediation. **P0**
7. **Tree detail missing measurement history and intelligence tab** — survival/MRV audit trail incomplete vs web. **P0**
8. **Evidence/biodiversity route RBAC bypass** — professional-only content reachable by direct URL. **P1**

---

## 8. Recommended implementation order

### Phase 1 — Field operations correctness (P0)
1. Wire violation resolve + survival due actions into `FieldScreen` `_FieldOpsBody` (port from `field_ops_screen.dart`).
2. Fix Field sync link → `/sync-queue`.
3. Global **project context** provider; wire Home picker, tree list `projectId` filter UI, map bbox/trees.
4. Tree list **thumbnail** from API image URL on `PrototypeRegistryRow.imageUrl`.
5. Reports **download/share** when `status=ready`.

### Phase 2 — Tree & project depth (P0–P1)
6. Tree detail: measurement history (`listTreeMeasurements`), photo gallery, Intelligence section (SAR/pest/AI detail).
7. Project detail: compliance gate actions + link to setup status; survival due list per project.
8. Credits ledger drill-down (per project).
9. Evidence: real gap feed from API + export entry points.

### Phase 3 — Parity expansion (P1)
10. Plantation MIS report picker (subset of 16 for mobile).
11. Map: `?focus=` handling, external navigate, user location.
12. Alert detail fetch-by-id; push notification deep links.
13. Route guards for `/evidence`, `/biodiversity`.
14. Offline cache for tree list + detail.

### Phase 4 — UX polish (P1–P2)
15. Field worker home variant or simplified command center.
16. Sync queue item delete/preview.
17. Project create (supervisor).
18. Biodiversity species list; assistant context.
19. IA alignment: evaluate Trees in Field hub vs drawer-only.

---

## Appendix A — Add-tree wizard step reference

| Internal step | UI label | Required to advance | Key fields |
|---------------|----------|---------------------|------------|
| 0 | Site & species (visual 1) | Program/project/work area; setup not blocking | project_id, work_area_id, program_code |
| 1 | Site & species (visual 1) | species_text | species, DBH, height, NHAI fields, scheme extras |
| 2 | GPS & placement (visual 2) | latitude, longitude | GPS accuracy, chainage, compliance check |
| 3 | Photos & submit (visual 3) | min_photos (program or 1) | camera photos only |
| 4 | Photos & submit (visual 3) | compliance pass in strict mode | review + save |

---

## Appendix B — List row requirements (derived from registry business rules)

| List | Row must show | Mobile status |
|------|---------------|---------------|
| Tree registry | Photo thumb, Tree ID (`public_code`), species, work area/project, health, verification badge, date, carbon optional | Missing thumb; rest mostly OK |
| Projects | Name, segment, compliance mode, tree count, violations | OK |
| Alerts | Severity, title, message/kind, time, read state | OK |
| Work areas (project) | Name, geometry type, tree count, satellite freshness | OK |
| Sync queue | Species/label, photo count, status, timestamp | OK |
| Bio recordings | Duration, site, status, date | OK |
| Reports | Kind, format, status, created_at | OK (no download action) |

---

## Appendix C — Evidence sources

| Source | Path |
|--------|------|
| Mobile router | `mobile/lib/src/app.dart` |
| RBAC | `mobile/lib/src/route_access.dart`, `mobile/lib/src/nav_access.dart` |
| Navigation groups | `mobile/lib/src/nav_groups.dart` |
| API client | `mobile/lib/src/api/api_client.dart` |
| Web routes | `frontend/app/(app)/**/page.tsx` |
| Web tree detail | `frontend/components/trees/tree-detail-view.tsx` |
| IA document | `design/ARANYIX_INFORMATION_ARCHITECTURE.md` |
| Prototype UI | `mobile/lib/src/widgets/prototype/prototype_ui.dart` |

---

*Assessment only — no production code, backend, or UI changes were made.*
