# BYOT — Security (current implementation)

This document describes **what the codebase actually implements today** on the Hostinger VPS Docker stack. It is not a target-state AWS enterprise architecture doc.

## 1. Threat model (STRIDE summary)

| Threat | Mitigation (as implemented) |
|---|---|
| Spoofing | Email/password (Argon2id) + Google OAuth + SMS/email OTP; JWT access tokens (HS256) + refresh rotation |
| Tampering | TLS via Caddy; presigned MinIO uploads; HMAC Razorpay webhooks; audit log chain hashes |
| Repudiation | Append-only `audit_logs` with actor, resource, and diff |
| Information disclosure | RBAC + application-layer `organization_id` scoping on queries; org feature flags |
| DoS | Redis token-bucket rate limits on auth routes (fail-closed in production when Redis is down) |
| Elevation of privilege | Role-based permissions (`core/security.py`); org admin gates; platform module grants |

## 2. AuthN / AuthZ

* **AuthN**: Email/password (Argon2id), Google OAuth, MSG91/Resend OTP flows, Cloudflare Turnstile CAPTCHA in production.
* **JWT**: HS256 signed with `JWT_SECRET`; access + refresh tokens; denylist via Redis.
* **Session cookie**: HttpOnly `byot_session` for Next.js middleware (signed with `SESSION_COOKIE_SECRET`).
* **AuthZ — RBAC**: roles (`user`, `farmer`, `ngo`, `corporate`, `government`, `admin`, …) with `Permission` enum checks on sensitive routes.
* **Tenant isolation**: queries filtered by `organization_id` in services/repositories — **not** PostgreSQL RLS.
* **Org feature flags**: per-organization toggles for `ai_scan`, `satellite`, `bioacoustic`, `reports`, `payments` enforced on API routes and reflected in frontend nav.

## 3. Data protection

* TLS terminated by Caddy (Let's Encrypt).
* PostGIS and MinIO volumes on the VPS; MinIO SSE at rest when configured.
* PII handled per DPDP privacy endpoints (`/privacy/*`); structured logging without automatic field encryption.
* Evidence export bundles signed with Ed25519 (`EVIDENCE_SIGNING_KEY` required in production).

## 4. API hardening

* Rate limits (Redis): applied on `/auth/*` and OTP routes; production returns 503 if Redis is unavailable.
* Input validation: Pydantic v2 on all request bodies.
* CORS: explicit allow-list via `CORS_ORIGINS`.
* File uploads: presigned PUT to MinIO; size/MIME checks in upload services.
* Health probes: `/health` checks Postgres + Redis; `/health/workers` and `/health/integrations` require auth in production.

## 5. Production boot guards

`validate_runtime_settings()` refuses to start when:

* `JWT_SECRET` is weak or missing
* `APP_DEBUG=true` in production
* `AUTH_ALLOW_DEV_OTP=true`
* Turnstile keys missing
* Razorpay configured without `RAZORPAY_WEBHOOK_SECRET`
* `EVIDENCE_SIGNING_KEY` missing or invalid

## 6. Deployment secrets

Secrets live in `infrastructure/hostinger/.env.production` (not committed). See `docs/DEPLOYMENT_HOSTINGER.md` for the full required-variable table, including `REDIS_PASSWORD` (must be a literal value — Docker Compose does not expand shell substitutions).

## 7. Disclosure & response

* Security contact: `/.well-known/security.txt` (served from the frontend static bundle).
* Incident response runbook: `docs/incident-response.md`.
