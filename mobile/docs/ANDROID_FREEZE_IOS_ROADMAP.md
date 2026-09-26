# Android-first mobile roadmap

Aranyix ships **Android first**. iOS starts only after Android is feature-complete and frozen.

## Phase map (in-app)

| Phase | Focus | Status |
|-------|--------|--------|
| **A** Field reliability | Push registration, offline banners/sync, compliance violations, Hindi | Implemented on Android |
| **B** Adoption | Coach marks, QR share, role-based nav, satellite card on tree | Implemented |
| **C** Scale (Android) | OpenAPI path catalog, deep links (`/p/{code}`), analytics batching | Implemented on Android |
| **C** iOS | Native iOS app | **Deferred** until Android freeze |
| **D** Enterprise | Biometrics, cert pinning toggle, optional screenshot guard | Implemented on Android |

## Android freeze checklist

Before starting iOS:

1. Release signing + CI artifacts (APK + Play Store AAB) — see `.github/workflows/android-apk.yml`.
2. Wire live FCM (`google-services.json` + `BYOT_FCM_ENABLED=true`) — device API is ready at `POST /api/v1/devices/register`.
3. QA on physical devices: offline tree queue, deep links, biometrics, Hindi UI, citizen stewardship relinquish.
4. Tag release `android-v1.8.0-freeze` and stop feature work on Android except hotfixes.

**Launch phases (P0–P8, `main`):**

| Phase | Focus |
|-------|--------|
| P0 | Release signing, FCM, cert pinning |
| P1 | Survival offline queue, audit RBAC |
| P2 | Navigation back, map draw, reachability |
| P3 | Dark theme, bio polling, citizen card |
| P4 | Session expiry, R8, citizen fast signup |
| P5 | Citizen adoption APIs and screen |
| P6 | Stewardship hub, wizard back, session on field screens |
| P7 | Launch finalization — relinquish, AAB in CI, signup a11y |
| P8 | Android freeze — full session coverage, splash/login expiry UX, Play Store link |

## iOS (after freeze)

1. `flutter create --platforms=ios .` from `mobile/`
2. Reuse Dart layer (auth, API client, offline queues, l10n).
3. Add APNs device registration (`platform: ios`) to existing devices API.
4. App Store signing + TestFlight.

## Push notifications

- Mobile registers an install token today; swap to FCM token when Firebase is configured.
- Backend stores tokens in `user_devices` for future FCM/APNs dispatch.

## Deep links

- `https://aranyix.tech/p/{public_code}` → in-app tree detail (authenticated).
- `https://aranyix.tech/auth/callback` → OAuth return (existing).
- Invite links: `?invite=` on login/welcome.

## Security (enterprise)

- **Certificate pinning**: toggle in Profile; production host allowlist always enforced in release.
- **Screenshot guard**: Android `FLAG_SECURE` when enabled.
- **Biometrics**: optional unlock on app resume (`local_auth`).
