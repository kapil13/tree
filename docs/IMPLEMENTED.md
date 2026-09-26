# Implemented (shipped in this repository)

This document lists capabilities that are **implemented and testable** in the current codebase. For roadmap and target-state architecture, see `TARGET_ARCHITECTURE.md`.

## Web & mobile

| Area | Status | Notes |
|------|--------|-------|
| Locales | **en + hi** | `frontend/messages/en.json`, `hi.json`; mobile `app_en.arb` / generated l10n |
| Marketing site | Shipped | CMS-driven homepage, solutions, resources |
| Dashboard & projects | Shipped | Role-scoped planting project workspace |
| Estate Watch audit | Shipped | 8-phase audit engagement, exports gated on live integrations |
| Reports & framework exports | Shipped | Worksheet-style PDF/XLSX — **not certification** |
| Platform admin | Shipped | Ops, CMS, billing, support modules |
| Mobile field app | Shipped | Flutter APK workflow in CI |

## Backend

| Area | Status | Notes |
|------|--------|-------|
| API | FastAPI `/api/v1` | OpenAPI at `/openapi.json` |
| Migrations | Alembic head `0088_phase_h_integration_ops` | 88 revision files |
| RLS | Partial | Policies on selected tables via `0087_platform_rls_policies`; not universal |
| Idempotency-Key | Partial | Redis-backed on tree create, payment orders, audit export create |
| OGC / STAC | Backend | `/api/v1/ogc/stac/*` — UI copy/export helpers on Reports |
| Webhooks | Shipped | Exponential retry + dead letter (Phase H) |
| Observability | Shipped | Prometheus metrics, synthetic `/health/synthetic`, optional Sentry |

## Integrations (honest modes)

Optical NDVI, SAR, FIRMS, locust, AI, bioacoustic, and Bhoonidhi report **live / stub / disabled** via the global integration strip. Stub modes block audit-ready and compliance exports where configured.

## Documentation source of truth

- **API surface:** `backend/openapi.snapshot.json` (CI drift check)
- **Environment:** `AGENTS.md`, `infrastructure/`
- **Human API summary:** `API_DOCUMENTATION.md` (must stay aligned with OpenAPI)
