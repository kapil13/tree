# API versioning policy

## Current version

- **Major version:** `v1` (path prefix `/api/v1`)
- **Response header:** `X-API-Version: 1` on all `/api/*` responses

## Breaking changes

Breaking changes require a new major path (`/api/v2`) or an explicit deprecation window:

1. Announce deprecation in release notes and `Sunset` response headers.
2. Maintain the old behaviour for at least **90 days** unless a security fix requires faster removal.
3. Remove the route only after the `Sunset` date.

## Deprecation headers

Deprecated routes return:

- `Deprecation: true`
- `Sunset: <HTTP-date>` (RFC 8594)

Example (legacy register endpoint scheduled for removal):

```
POST /api/v1/auth/register
Sunset: Sat, 01 Mar 2027 00:00:00 GMT
```

## Idempotency

Mutating routes that accept `Idempotency-Key` (24h Redis TTL):

| Scope | Method | Path |
|-------|--------|------|
| Tree registration | POST | `/api/v1/trees` |
| Payment checkout | POST | `/api/v1/payments/orders` |
| Audit export create | POST | `/api/v1/audit-engagements/{id}/exports` |

Reusing a key with a different payload returns `409 idempotency_key_reused`.

## Source of truth

OpenAPI snapshot: `backend/openapi.snapshot.json` (CI drift check).
