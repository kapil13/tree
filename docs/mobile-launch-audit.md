# BYOT Mobile — Pre-Production Launch Audit

**Date:** 2026-09-04  
**App version:** 1.2.1+4 (`mobile/pubspec.yaml`)  
**Scope:** Full Flutter mobile codebase (`mobile/`), major user journeys, API contracts, production readiness.

---

## Executive summary

The mobile app has solid foundations (auth breadth, offline tree/bio queues, RBAC nav, Hindi i18n, Android App Links). **Tree registration (BYOT + Govt/NHAI)** had the highest launch risk: unclear GPS step progression, data-loss on online save, scheme-program misuse without a project, and missing API fields.

This audit branch (`cursor/mobile-launch-audit-f2ba`) **fixes all CRITICAL tree-registration issues** identified in the add-tree flow. Several **CRITICAL/HIGH platform issues** (release signing, cert pinning, FCM, deep-link `next=`) remain and are documented below.

**Automated verification run:** `flutter gen-l10n`, `flutter test` (28/28 passed), `flutter analyze` on changed files (no errors; pre-existing `value` deprecation infos on dropdowns).

**Not run in this environment:** Physical-device GPS/camera field test, release APK on hardware, Play Store upload.

---

## 1. CRITICAL — must fix before launch

| # | File / component | Problem | Why it matters | Recommended fix | Category | Status |
|---|------------------|---------|----------------|-----------------|----------|--------|
| C1 | `add_tree_screen.dart` | Offline-captured photos (`_localPhotoPaths`) were not uploaded before `createTree` when online | Trees saved without evidence photos; compliance/audit failure | Upload local paths in `_ensurePhotosUploaded()` before API save | API / Logic | **Fixed** |
| C2 | `add_tree_screen.dart` | Save & Next cleared compliance, stayed on review step, did not return to GPS | Bulk NHAI registration breaks strict compliance; users confused after save | Reset to step 2 (GPS), reload registration context, re-run compliance | UX / Logic | **Fixed** |
| C3 | `tree_registration_sync.dart` | Queue items stuck in `syncing` on 401 | Orphaned sync state; trees never retry after re-login | Revert to `pending` on unauthorized; stop sync loop | Logic | **Fixed** |
| C4 | `add_tree_screen.dart` | `planted_at` never sent on create | Backend MRV timestamps missing; web sends this field | Send ISO8601 UTC `planted_at` on create and in offline payload | API | **Fixed** |
| C5 | `add_tree_screen.dart` | Standalone `government_nhai` / ESG programs allowed without project/work area | Backend requires project context; submissions fail or create bad data | Block scheme programs without project; show scheme-project banner | UX / API | **Fixed** |
| C6 | `project_setup_readiness.dart` | `scheme_refs` gate missing vs web | Govt projects register trees before audit IDs configured | Added `missingSchemeRefKeys()` + setup step | Logic | **Fixed** |
| C7 | `add_tree_screen.dart` | Boolean/select `form_schema` fields skipped | Govt form data silently dropped | Render Switch/dropdown; include in metadata | API / UX | **Fixed** |
| C8 | `add_tree_screen.dart` | `min_photos` not enforced in step navigation/save | Users reach review/submit without required evidence | Enforce in `_canAdvanceFromStep`, save guard, photo step UI | UX / Logic | **Fixed** |
| C9 | `add_tree_screen.dart` | Chainage from `suggested_next` not written to metadata | NHAI corridor sequencing broken on mobile | Persist `chainage_km` from registration context | API | **Fixed** |
| C10 | `add_tree_screen.dart` | GPS step: no loading, no Next, warnings as errors, no settings link | Field users stuck after GPS capture (reported issue) | `_locating` state, success card, inline Next, Open Settings, accuracy warning | UX | **Fixed** |
| C11 | `android/app/build.gradle.kts` | Release build uses debug signing config | Cannot ship to Play Store securely | Production keystore + CI secrets | Security | **Open** |
| C12 | `certificate_pinning.dart` | `productionPins` empty; pinning is no-op | Documented TLS hardening not enforced | Add SPKI pins; fail closed | Security | **Open** |
| C13 | `api_client.dart` `uploadImageFile` | Presigned S3 upload uses unpinned `Dio()` | MITM on field photo evidence | Pin or allowlist S3 hosts | Security | **Open** |
| C14 | `login_screen.dart`, `app.dart`, `app_bootstrap.dart` | Deep link `?next=` ignored after login | QR tree links fail post-auth | Persist and honor `next` after session complete | Logic / UX | **Open** |

---

## 2. HIGH — should fix before launch

| # | File / component | Problem | Why it matters | Recommended fix | Category | Status |
|---|------------------|---------|----------------|-----------------|----------|--------|
| H1 | `security_services.dart` | Push uses fake `install:{timestamp}` token, not FCM | No production alerts on device | Integrate `firebase_messaging` | Architecture | Open |
| H2 | `splash_screen.dart` | Any `me()` failure logs user out (incl. network) | Field users lose session on poor signal | Distinguish network vs 401 | Logic / UX | Open |
| H3 | `api_client.dart`, screens | Session expiry inconsistent; most screens don't redirect to login | Confusing errors when token expires | Global session-expired handler | UX | Open |
| H4 | `login_remember.dart` | Plaintext password stored when "Remember me" | Credential exposure on compromised devices | Remember email only | Security | Open |
| H5 | `app_bootstrap.dart` | Biometric failure forces full logout | Gloved/cancel fingerprint evicts session | Re-prompt without logout | UX / Security | Open |
| H6 | `auth_flow_screens.dart`, `signup_screen.dart` | `dev_hint` OTP shown in release UI | OTP leak if backend returns hints | Gate with `kDebugMode` | Security | Open |
| H7 | `survival_survey_screen.dart` | No offline queue (unlike add-tree/bio) | Survival work fails offline | Add offline queue + sync | Architecture | Open |
| H8 | `bioacoustic_screen.dart`, `bioacoustic_queue.dart` | WAV recorded but uploaded as `.m4a` | Sync/analysis failures | Align format end-to-end | API | Open |
| H9 | `profile_screen.dart` | Users can disable cert pinning | Security control undermined | Mandatory in release | Security | Open |
| H10 | `api_client.dart` | `confirmPasswordReset` missing public-auth header strip | Reset can fail with stale token | Use `_publicAuthOptions()` | API | Open |
| H11 | `project_setup_readiness.dart` | Web setup URL hardcoded to production | Staging/custom API opens wrong site | Derive from API base URL | API | Open |
| H12 | `add_tree_screen.dart` | Project create opened dead route `/projects/new` | Broken button in scheme banner | Open web `projects/new` externally | UX | **Fixed** |
| H13 | `ios/` | iOS not scaffolded despite pubspec description | Cannot ship App Store build | Complete iOS scaffold or scope Android-only | Architecture | Open |
| H14 | `auth_flow_screens.dart` | Phone OTP login lacks captcha when Turnstile enabled | OTP login fails if backend requires captcha | Share captcha widget with phone flow | API / Security | Open |

---

## 3. MEDIUM — recommended

| # | Area | Problem | Fix | Category |
|---|------|---------|-----|----------|
| M1 | Navigation | Stack routes (add-tree, bio, reports) lack visible back button | `menuWithBack: true` on pushed routes | UX |
| M2 | `map_screen.dart` | Draw mode not intercepted on Android back | `PopScope` to cancel draw | UX |
| M3 | Offline banner | Connectivity ≠ API reachability | Health ping before "online" | Logic |
| M4 | `api_client.dart` | Citizen signup/profile APIs unused | Implement or remove | Architecture |
| M5 | `route_access.dart` | `/map/draw` guard with no route | Remove or add route | Architecture |
| M6 | `reports_screen.dart` | `esg` report kind not localized | Add ARB string | UX |
| M7 | `bioacoustic_sync.dart` | Sync blocks on 3-min analysis poll | Upload-only sync; poll in UI | Performance |
| M8 | `app.dart` | Dark theme disabled | System theme toggle | UX |
| M9 | `AndroidManifest.xml` | Invite/login paths not in App Links | Add verified intent filters | UX |
| M10 | `tree_registration_queue.dart` | DB path not under documents dir | Use `path_provider` like bio queue | Architecture |
| M11 | Govt forms | Many NHAI fields on web collapsed into project defaults on mobile (intentional) | Document for field trainers; optional chainage display on species step | UX |
| M12 | `add_tree_screen.dart` | DBH/height only shown for non-project mode | Project trees may need measurements on web — verify parity | API |

---

## 4. LOW — polish / future

| # | Area | Notes |
|---|------|-------|
| L1 | `login_screen.dart` | Debug demo credentials prefilled (`kDebugMode` only) |
| L2 | `build.gradle.kts` | No R8 minify/shrink |
| L3 | `api_client.dart` | JPEG content-type hardcoded for all uploads |
| L4 | `assistant_screen.dart` | Hardcoded demo prompt text |
| L5 | `tree_registration_sync.dart` | No `dispose()` connectivity cleanup |
| L6 | Accessibility | Limited semantic labels on wizard steps |
| L7 | Tablet/landscape | Not explicitly tested |

---

## Govt / NHAI form field review

Mobile intentionally mirrors web **project-mode** registration: permit, legal basis, agency, and scheme refs are configured once in **web project setup**, not re-entered per tree. Per-tree mobile fields:

| Field | Required | Mobile handling | Notes |
|-------|----------|-----------------|-------|
| Work area | Yes (strict/guided) | Dropdown step 0 | Reloads registration context on change (**fixed**) |
| Species | Yes | Dropdown or text step 1 | Allowed list from project standard |
| Road side | NHAI/chainage | Dropdown when chainage enabled | In metadata |
| Guard type / pit size | Standalone NHAI only | Shown when no project + NHAI program | Blocked without project (**fixed**) |
| GPS lat/lon/accuracy | Yes | Step 2 with explicit Next (**fixed**) | |
| Photos | min_photos / ≥1 | Step 3 with count + Next (**fixed**) | Camera only in strict mode |
| DBH / height | Optional | Non-project mode only | |
| form_schema extras | Per program | Text, boolean, select (**fixed**) | |
| chainage_km | NHAI projects | From `suggested_next` (**fixed**) | |
| planted_at | Yes (API) | Sent at save (**fixed**) | |

---

## Launch-readiness checklist (complete app)

### Build & distribution
- [ ] Release keystore configured (not debug signing)
- [ ] CI produces signed APK/AAB artifact
- [ ] Version code/name bumped for launch build
- [ ] Play Store listing scoped to **Android** (iOS deferred)
- [ ] `google-services.json` + FCM for push

### Security
- [ ] Cert pinning populated or feature removed from marketing
- [ ] S3 upload path pinned/allowlisted
- [ ] No password persistence in Remember me
- [ ] `dev_hint` gated to debug builds
- [ ] Penetration test on auth + token storage

### Authentication & session
- [ ] Deep link `next=` honored after login
- [ ] Splash distinguishes offline vs expired session
- [ ] Global 401 → login with `session=expired`
- [ ] Phone OTP + captcha parity with email
- [ ] Biometric cancel does not logout

### Tree registration (BYOT + Govt)
- [x] GPS step: loading, success, Next, settings, accuracy warning
- [x] Offline photos uploaded before online save
- [x] `planted_at` on create + offline queue
- [x] Scheme programs require project
- [x] `scheme_refs` setup gate
- [x] Boolean/select form fields submitted
- [x] `min_photos` enforced
- [x] Chainage in metadata
- [x] Save & Next returns to GPS with context reload
- [x] 401 sync items revert to pending
- [ ] Field test: 10-tree NHAI session on 3G
- [ ] Field test: strict compliance project with min_photos=2

### Other field flows
- [ ] Survival survey offline queue
- [ ] Bioacoustic WAV/M4A alignment
- [ ] Bio sync does not block on long analysis poll

### Navigation & UX
- [ ] Back button on stack routes (add-tree, bio, reports)
- [ ] Map draw mode back interception
- [ ] Hindi strings for new GPS/scheme copy
- [ ] Dark mode or documented light-only for v1

### API & data
- [ ] Backend healthy (`EVIDENCE_SIGNING_KEY`, Turnstile on VPS)
- [ ] Mobile API base `https://api.aranyix.tech` verified
- [ ] Project setup web URL matches environment
- [ ] Offline queue sync E2E after airplane mode

### QA matrix (manual)
- [ ] Fresh install → signup → add BYOT tree → view detail
- [ ] Project tree: setup blocked → complete on web → register tree
- [ ] GPS denied → settings → retry
- [ ] GPS timeout → retry outdoors
- [ ] Photo offline → online save includes photos
- [ ] Session expiry mid-registration
- [ ] Android back through wizard steps
- [ ] Duplicate submit prevention (busy state)
- [ ] App background/resume during wizard

---

## Changes in this branch

| File | Change |
|------|--------|
| `add_tree_screen.dart` | GPS UX overhaul; scheme-project gate; photo upload before save; planted_at; min_photos; chainage; boolean/select fields; Save & Next flow; smarter offline queueing |
| `project_setup_readiness.dart` | scheme_refs validation; `projectCreateWebUrl()` |
| `tree_registration_sync.dart` | planted_at; 401 → pending fix |
| `location_helper.dart` | `openLocationSettings()` |
| `api_client.dart` | `getCentralScheme()` |
| `api_errors.dart` | `isOfflineOrNetworkError()` |
| `l10n/*.arb`, `setup_labels.dart` | New strings for GPS/scheme steps |
| `project_setup_readiness_test.dart` | scheme_refs tests |

---

## Remaining unresolved (prioritized)

1. **Release signing** (C11) — blocking Play Store
2. **FCM push** (H1) — blocking operational alerts
3. **Deep link next=** (C14) — blocking QR tree workflows
4. **Cert pinning** (C12–C13, H9) — security posture
5. **Session/splash hardening** (H2–H5)
6. **Survival offline** (H7), **bio format** (H8)
7. **Physical field QA** on target devices
