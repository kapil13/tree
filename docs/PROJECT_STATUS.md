# Aranyix / BYOT — Project Status

Last updated: Phase I (launch quality & marketing truth).

See also: `IMPLEMENTED.md` (shipped) and `TARGET_ARCHITECTURE.md` (roadmap).

## Production checklist

| Item | Status | Notes |
|------|--------|-------|
| Web dashboard + API | Shipped | Next.js 15 + FastAPI |
| Mobile field app | Shipped | Flutter; APK workflow in CI |
| CI | Green | Backend lint/tests, frontend typecheck/build, Playwright API smoke, Android APK |
| Migration head | `0088_phase_h_integration_ops` | 88 Alembic revisions — run `alembic upgrade head` |
| Integrations honesty | Shipped | Global strip; export gates when stub |
| i18n (web + mobile) | **en + hi** | Marketing copy aligned; not 8 languages yet |
| RLS | Partial | `0087_platform_rls_policies` on selected tables |

### Verify production

```bash
curl -s https://api.aranyix.tech/health | python3 -m json.tool
curl -s https://api.aranyix.tech/health/synthetic | python3 -m json.tool
```

## Key URLs

| Surface | URL |
|---------|-----|
| App | https://aranyix.tech/ |
| API | https://api.aranyix.tech/ |
| OpenAPI | https://api.aranyix.tech/openapi.json |
| Worker health | https://api.aranyix.tech/health/workers |

## Documentation map

| Doc | Purpose |
|-----|---------|
| `IMPLEMENTED.md` | What is shipped today |
| `TARGET_ARCHITECTURE.md` | Roadmap / not yet built |
| `API_DOCUMENTATION.md` | Human API summary (align with OpenAPI) |
| `API_VERSIONING.md` | Version, Sunset, Idempotency-Key policy |
| `DATABASE_SCHEMA.md` | Schema reference (partial; see migrations for full model) |
| `AGENTS.md` | Cursor Cloud dev environment |
