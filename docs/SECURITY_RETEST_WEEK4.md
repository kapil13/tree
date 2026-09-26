# Week 4 security regression checklist

Manual or scripted verification after Weeks 1–4 deploy. Record pass/fail and date.

**Last run:** 2026-08-24 — see [LAUNCH_SIGNOFF.md](./LAUNCH_SIGNOFF.md) and `./scripts/security/retest-week4.sh`

## Week 1 — Authz

| ID | Test | Pass |
|----|------|------|
| C1 | Citizen verify-link: user A cannot create link for user B's null-org tree | ☑ 2026-08-24 |
| C2 | Google OAuth rejects unverified email; `state` required | ☑ 2026-08-24 |
| H1 | Org invite does not auto-add existing user without accept | ☑ 2026-08-24 |
| H3 | Tree/bio upload rejects `s3_key` outside `/{user_id}/` | ☑ 2026-08-24 |
| H4 | Satellite endpoints return 403 without `can_access_tree` | ☑ 2026-08-24 |
| H5 | Logs do not contain OTP codes or full invite URLs | ☑ 2026-08-24 |

## Week 2 — Client trust

| ID | Test | Pass |
|----|------|------|
| H6 | Signed `byot_session` cookie; `/dashboard` gated when logged out | ☑ 2026-08-24 |
| H7 | CMS HTML strips `<script>`; `javascript:` hrefs become `/` | ☑ 2026-08-24 |
| H8 | Mobile release: no custom API host; cleartext off | ☑ 2026-08-24 |
| H9 | Mobile logout calls `POST /auth/logout` | ☑ 2026-08-24 |

## Week 3 — Ops

| ID | Test | Pass |
|----|------|------|
| M9 | Redis requires password on VPS | ☑ 2026-08-24 (port not public; confirm `-a` on VPS) |
| M10 | `curl -sI https://APP_DOMAIN` shows HSTS + CSP | ☑ 2026-08-24 |
| M11 | Gmail SA mounted at `/run/secrets/gmail-sa.json` in backend | ☐ VPS SSH — run after deploy if email OTP on |
| H2 | Login email OTP sends when Gmail configured | ☐ VPS — requires `AUTH_OTP_EMAIL_ENABLED` + Gmail SA |

## Week 4 — Efficiency

| ID | Test | Pass |
|----|------|------|
| L1 | Web map uses bbox + `page_size` ≤ 150 | ☑ 2026-08-24 |
| L1 | Mobile map loads trees by viewport bbox | ☑ 2026-08-24 |
| L5 | Field worker MVT/list scope matches project assignment | ☑ 2026-08-24 |
| L7 | `/health/integrations` returns 401 without token in production | ☑ 2026-08-24 (code); deploy to prod for live 401 |

## Load baseline (optional)

```bash
k6 run scripts/load/week4-smoke.js
API_BASE=https://api.aranyix.tech ACCESS_TOKEN=<jwt> k6 run scripts/load/week4-smoke.js
```

Record p95 latency for `/health/live` and authenticated `GET /trees?bbox=…`.

## How to re-run

```bash
./scripts/security/retest-week4.sh
cd backend && pytest tests/test_launch_security.py tests/test_week1_security.py tests/test_s3_key_ownership.py tests/test_data_scope.py tests/test_mvt_scope.py
cd frontend && npm test -- --run lib/cms-sanitize.test.ts
```
