# Aranyix Mobile — Product Journey (CMO / CPO)

This document defines the mobile app experience for a smooth, India-first user journey.

## Positioning

**Aranyix Mobile** is the field companion for plantation MRV: register trees offline, see health on a map, and get executive intelligence in your pocket — without needing a laptop.

**Tagline:** Data · Intelligence · Nature · Future

---

## Personas & primary journeys

| Persona | Goal | Mobile journey |
|---------|------|----------------|
| **Citizen / landowner (BYOT)** | Register trees, track carbon | Welcome → Sign up → Verify OTPs → Register first tree → Dashboard |
| **Field worker** | Daily registrations in assigned packages | Invite or login → Projects → Register tree (GPS + photos) |
| **Supervisor / manager** | Monitor sites, act on alerts | Login → Dashboard (map + charts) → Notifications |
| **Government / corporate (professional)** | Compliance & portfolio view | Sign up → Org profile (web) → Pending approval → Dashboard |

---

## Screen flow (implemented)

```
Splash
  ├─ no session → Welcome (marketing + value props)
  │     ├─ Create account → Signup wizard (4 steps)
  │     └─ Sign in → Login
  └─ session → Home (role-aware)

Signup wizard
  1. Category (BYOT / Govt / Corporate / NGO)
  2. Details (name, email, phone, password, Turnstile if enabled)
  3. Phone OTP
  4. Email OTP → tokens → onboarding gate or first tree

Login
  Email + password, org invite banner, links to signup / welcome

Home (executive)
  Forest health hero · Quick actions · Live map preview · Charts · AI brief · Alerts

Home (field worker)
  Task-focused: register tree, assigned projects, offline queue

Profile
  Identity, planting program preferences, sign out
```

---

## Dashboard principles (interactive)

1. **Glanceable health** — single forest health score with trend.
2. **Map at a glance** — tree markers; tap to expand full map.
3. **Charts that answer questions** — carbon growth (line), health mix (pie), species (bars); touch tooltips on line chart.
4. **Quick actions** — one tap to register tree, map, assistant, projects, bioacoustic (RBAC).
5. **Pull to refresh** — dashboard, alerts, weather, trees, plantations.

---

## UX rules

- **Progressive disclosure** — signup one step at a time with progress bar.
- **Forgiving errors** — human-readable messages (no raw API codes).
- **Offline-first field work** — tree queue banner on home; sync when online.
- **Role-aware UI** — field workers never see empty executive KPIs; they see tasks.
- **Professional onboarding** — deep org profile on web; mobile shows clear next steps.

---

## Parity with web

| Feature | Web | Mobile |
|---------|-----|--------|
| Multi-step signup + OTP | Yes | Yes |
| Turnstile CAPTCHA | Yes | Yes (WebView) |
| Google OAuth | Yes | Planned |
| Phone OTP login | Yes | Planned |
| Forgot password | Yes | Planned |
| Full org-profile wizard | Yes | Web handoff + sign in |
| Executive dashboard | Yes | Yes (map + charts) |

---

## Success metrics (recommended)

- Signup completion rate (start → email verified)
- Time to first tree registration
- D7 retention by persona
- Dashboard engagement (map expand, chart views, assistant opens)
- Offline queue sync success rate
