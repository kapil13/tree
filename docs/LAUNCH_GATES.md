# Launch Gates — Audit Status

Last audited: 2026-08-15 (Sprint 15)

This document tracks readiness against `docs/IMPLEMENTATION_PLAN.md` Gate A (mandatory) and Gate B (soft launch).

## Gate A — Tier 1 (mandatory)

| Item | Status | Evidence |
|---|---|---|
| Measurements: full time-series with method/instrument | **PASS** | `tree_measurements` table, API, mobile capture, `test_tree_measurements.py` |
| Carbon: 90% CI on CO₂e displays; Verra deduction wired | **PASS** | Engine uncertainty + `CarbonCo2eRange` on dashboards (Sprint 15), calculator, mobile disclaimer |
| Mortality-adjusted lifetime credits; dynamic buffer from risk | **PASS** | `mortality.py`, `buffer.py`, NPRT panel, `test_carbon_mortality_buffer.py` |
| DPDP: export, delete, consent ledger, grievance | **PASS** | `/v1/privacy/*`, settings panel, `test_privacy_dpdp.py` |
| Audit: hash chain verifies; evidence bundles signed + timestamped | **PASS** | `audit/chain.py`, `evidence/signing.py`; TSA uses dev stub unless `EVIDENCE_TSA_URL` configured |
| Copy: no implied sellable credits for citizen estimates | **PASS** | `CarbonEstimateLabel` on citizen + executive dashboards, tree detail, map |

**Gate A verdict:** All items pass for soft-launch scope. Production TSA remains an ops configuration step.

## Gate B — Soft launch (recommended)

| Item | Status | Evidence |
|---|---|---|
| Verifier workflow live | **PASS** | Verification panel, API, RBAC + integration test (Sprint 15) |
| BRSR export beta | **PASS** | Reports page, `test_brsr_export.py` |
| Hindi web on core flows | **PASS** | Citizen dashboard i18n (Sprint 15), auth, registration, sidebar, executive dashboard |
| WCAG: zero critical axe violations on core routes | **PASS** | `core-routes.test.tsx` renders real auth/dashboard components (Sprint 15) |
| Claim registry prevents double-counting | **PASS** | Unique partial index, `test_credit_claims.py`, serial issuance |

**Gate B verdict:** Ready for soft launch pending your own UAT and production deploy.

## Deferred / out of scope

| Item | Notes |
|---|---|
| India Stack (e-Sign, DigiLocker, Aadhaar) | Removed per product decision — not required for Gate B |
| Production RFC 3161 TSA | Configure `EVIDENCE_TSA_URL` when a TSA vendor is contracted |
| iOS mobile | Tier 4 — see `mobile/docs/ANDROID_FREEZE_IOS_ROADMAP.md` |

## Sprint 15 deliverables tied to gates

- **Design system:** Radix-based `Button`, `Input`, `Select`, `Dialog`, `Table`, `Tabs`, `Badge`, `Card`, `Skeleton` in `frontend/components/ui/`
- **PWA:** `manifest.webmanifest`, service worker, `/field-ops/offline-trees` supervisor cache
- **Stratified sampling:** Plot monitoring design API + project panel (plot-based census alternative)

## Verification

Run internal checklist: **Settings → Sprint verify** (`/settings/sprint-verify`).

Automated gates:

```bash
make test    # backend pytest including sprint 15
make lint    # ruff + frontend typecheck
cd frontend && npm test  # WCAG axe on core routes
```
