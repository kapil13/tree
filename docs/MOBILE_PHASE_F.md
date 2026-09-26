# Mobile Phase F — Parity & Web-Only Scope

## F1 P0 — Implemented on mobile

| Item | Mobile route / surface |
|------|------------------------|
| 4-step scheme wizard | `/projects/new` (`ProjectWizardScreen`) |
| Project setup / scheme refs | `/projects/:id/setup` (`ProjectSetupScreen`) — replaces web-only blocker |
| Portfolio hub (5 tabs) | `/portfolio` — overview, monitoring, compliance, audit, threats |
| Satellite workspace | `/satellite` — NDVI/SAR scan triggers, Bhoonidhi catalog |
| Estate Watch 8-phase workspace | `/projects/:id/audit` — phase nav + field/attestation deep links |
| Plantation MIS 16 reports | `ReportsScreen` via expanded `mobilePlantationMisReports` |

## F2 P1 — Implemented on mobile

| Item | Mobile route / surface |
|------|------------------------|
| Verification queue | `/verification` |
| Compliance checklist + gap actions | `/projects/:id/compliance` + `compliance_gap_actions.dart` |
| Bioacoustic monitoring plans + review | `BioacousticScreen` tabs: Plans, Review |
| Plot monitoring visit queue | `/plot-visits` |
| Stewardship nav | Drawer group → `/citizen/stewardship`, `/citizen/adopt` |
| Audience onboarding | `/onboarding/audience` (existing; linked from Account drawer) |

## F3 P2 — Acceptable web-only

These flows remain web-first. Mobile should deep-link or document explicit scope:

| Area | Web path | Mobile guidance |
|------|----------|-----------------|
| Platform admin | `/platform/*` | Web only — org admins use dashboard |
| Framework exports (BRSR, TNFD, ISO) | `/compliance/.../export` | Use web export or open project-scoped web link |
| Payments / Razorpay checkout | `/payments/*` | Web only — checkout and billing |

### Deep-link pattern for web-only exports

```
{webOrigin}/projects/{projectId}/compliance?export=brsr
```

Use `projectSetupWebUrl` / `webAppOriginFromApiBase` helpers when a mobile CTA must open the web dashboard with project context.

## Testing notes

- Project wizard requires supervisor write access (`isSupervisor` + `canWriteInApp`).
- Estate Watch per-project audit requires an existing `estate_monitoring` project engagement.
- Plot visit queue aggregates unvisited plots when no `?project=` filter is set.
- Satellite SAR scans may take up to 120s (API client timeout).
