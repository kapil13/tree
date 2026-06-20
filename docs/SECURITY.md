# BYOT — Security

## 1. Threat model (STRIDE summary)

| Threat | Mitigation |
|---|---|
| Spoofing | JWT (RS256), short-lived access (15 min) + rotating refresh; OAuth2 PKCE; OTP for high-risk actions |
| Tampering | TLS 1.3 everywhere; signed S3 URLs; HMAC webhooks; DB row hashes for audit |
| Repudiation | Append-only `audit_logs`; signed log batches archived to S3 Object Lock |
| Information disclosure | RBAC + RLS; field-level encryption for PII; CloudTrail; PII scrubbing in logs |
| DoS | API gateway rate limits; WAF; per-tenant Celery queue caps; CloudFront |
| Elevation of privilege | Principle of least privilege IAM; SCPs; admin actions require MFA + step-up OTP |

## 2. AuthN / AuthZ

* **AuthN**: Email/password (Argon2id) + OAuth2 Google + OTP (TOTP / SMS).
* **JWT**: RS256, `kid` rotation via JWKS; access TTL 15 min, refresh 30 d.
* **AuthZ — RBAC**:
  * roles: `user`, `farmer`, `ngo`, `corporate`, `government`, `admin`
  * permissions encoded in `core/security.py:Permission` enum;
    decorator `require(Permission.TREE_DELETE)` used in routes.
* **AuthZ — Tenant isolation**: every query is scoped by `organization_id`
  via SQLAlchemy session listener that sets PostgreSQL local settings used
  by Row-Level Security policies.

## 3. Data protection

* TLS 1.3 only; HSTS preload.
* RDS encrypted at rest (KMS), S3 SSE-KMS, EBS encryption.
* Field-level encryption for `users.phone`, `users.google_sub`, `audit_logs.ip`
  using application-managed envelope encryption (AWS KMS DEK).
* PII redaction in logs: structured logger drops `email`, `phone`, `ip`
  unless explicitly opted-in for an audit context.

## 4. API hardening

* Rate limits (Redis token bucket): default 1000/15 min/user; 60/min for
  `/auth/*`; 10/min for `/auth/otp/*`.
* Input validation: Pydantic v2 strict mode; geo bounds enforced (lat
  −90..90, lon −180..180).
* CORS: explicit allow-list; credentials only with allowed origins.
* CSRF: not needed for pure JWT bearer APIs; cookies use `SameSite=Strict; Secure`.
* File uploads: presigned PUT; max 25 MB; MIME sniff; ClamAV scan worker
  before exposing the asset via CDN.

## 5. OWASP ASVS coverage (selected)

| ASVS § | Item | Status |
|---|---|---|
| 2.1.1 | Min 12-char passwords | Enforced |
| 2.5.4 | Secure password storage (Argon2id) | Enforced |
| 3.5.1 | Session fixation prevention | New refresh on login |
| 5.2.5 | Output encoding | FastAPI + Next.js auto-escape |
| 8.2.1 | TLS 1.2+ | TLS 1.3 enforced |
| 9.1.1 | Cryptographic agility | JWKS rotation |
| 10.3.1 | Trusted dependencies | Renovate + `pip-audit` + `npm audit` in CI |

## 6. Compliance roadmap

* SOC 2 Type II — Year 1.
* GDPR (DPA, SAR endpoint, EU region in AWS Ireland) — Year 1.
* ISO 27001 — Year 2.
* Verra/Gold-Standard registry integration audits.

## 7. Secret management

* AWS Secrets Manager + KMS.
* No secrets in code or images; injected at pod start via External Secrets
  Operator (ESO).

## 8. Disclosure & response

* `security.txt` at root; bug bounty via independent platform.
* Incident response runbook in `docs/incident-response.md` (to be authored
  during onboarding sprint).
