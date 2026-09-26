# Aranyix / BYOT — REST API

OpenAPI 3.1 spec (source of truth):

```
GET /openapi.json
GET /docs              # Swagger UI (when exposed)
GET /redoc             # ReDoc (when exposed)
```

CI enforces drift against `backend/openapi.snapshot.json`.

## 1. Conventions

* **Base URL** — `https://api.aranyix.tech/api/v1` (development: `http://localhost:8000/api/v1`)
* **Version header** — `X-API-Version: 1` on all `/api/*` responses
* **Auth** — `Authorization: Bearer <access_token>`
* **Trace ID** — every response includes `X-Trace-Id`; errors include `trace_id` in the JSON body
* **Pagination** — `?page=1&page_size=50` → `{items, page, page_size, total}`
* **Rate limit** — `1000 req / 15 min / user` (configurable via `GLOBAL_RATE_LIMIT_*`); `429` when exceeded
* **Idempotency** — selected `POST` routes accept `Idempotency-Key` header (24h Redis cache). See `API_VERSIONING.md`.

### 1.1 Error model

```json
{
  "error": {
    "code": "tree_not_found",
    "message": "Tree with id 7c… does not exist",
    "details": { "tree_id": "7c…" },
    "trace_id": "01HXXX…"
  }
}
```

## 2. Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Email/password → tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/otp/request` | Send OTP via email/SMS |
| POST | `/auth/otp/verify` | Verify OTP → tokens |
| GET  | `/auth/me` | Current user profile |

Legacy `POST /auth/register` is deprecated (`Sunset` header — see `API_VERSIONING.md`).

## 3. Trees

| Method | Path | Idempotency-Key |
|---|---|---|
| POST | `/trees` | **Supported** |
| GET  | `/trees` | — |
| GET  | `/trees/{id}` | — |

## 4. Payments

| Method | Path | Idempotency-Key |
|---|---|---|
| POST | `/payments/orders` | **Supported** |
| POST | `/payments/verify` | — |
| POST | `/payments/webhook` | Razorpay event dedup via `event_id` |

## 5. Audit exports

| Method | Path | Idempotency-Key |
|---|---|---|
| POST | `/audit-engagements/{id}/exports` | **Supported** |
| GET  | `/audit-engagements/{id}/export-summary` | — |

Blocked when required integrations (optical NDVI, SAR) are in stub mode.

## 6. Reporting & framework worksheets

| Method | Path | Notes |
|---|---|---|
| GET | `/reporting/frameworks` | List profiles |
| GET | `/reporting/projects/{id}/framework-report` | PDF/XLSX **worksheet** — not certification |
| GET | `/ogc/stac/catalog` | STAC 1.0 catalog (auth required) |
| GET | `/ogc/stac/projects/{id}/items` | Project NDVI STAC items |
| GET | `/ogc/projects/{id}/features` | OGC Features GeoJSON |

## 7. Credits & registry

| Method | Path | Description |
|---|---|---|
| GET | `/credits/projects/{id}` | Project credit ledger |
| POST | `/credits/serials/{id}/retire` | Retire serial |
| POST | `/credits/serials/{id}/transfer` | Custody transfer to another org |
| GET | `/credits/serials/{id}/certificate.pdf` | Retirement certificate |

## 8. Health

| Path | Purpose |
|---|---|
| `/health/live` | Liveness (no DB) |
| `/health` | DB + Redis readiness |
| `/health/synthetic` | DB, Redis, Celery, integration export gates |
| `/health/workers` | Celery worker probe (auth in production) |

## 9. Further reading

* `IMPLEMENTED.md` — shipped capabilities
* `API_VERSIONING.md` — deprecation and idempotency policy
* `openapi.snapshot.json` — full route list
