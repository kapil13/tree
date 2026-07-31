# Week 4 security regression checklist

Manual or scripted verification after Weeks 1–4 deploy. Record pass/fail and date.

## Week 1 — Authz

| ID | Test | Pass |
|----|------|------|
| C1 | Citizen verify-link: user A cannot create link for user B's null-org tree | ☐ |
| C2 | Google OAuth rejects unverified email; `state` required | ☐ |
| H1 | Org invite does not auto-add existing user without accept | ☐ |
| H3 | Tree/bio upload rejects `s3_key` outside `/{user_id}/` | ☐ |
| H4 | Satellite endpoints return 403 without `can_access_tree` | ☐ |
| H5 | Logs do not contain OTP codes or full invite URLs | ☐ |

## Week 2 — Client trust

| ID | Test | Pass |
|----|------|------|
| H6 | Signed `byot_session` cookie; `/dashboard` gated when logged out | ☐ |
| H7 | CMS HTML strips `<script>`; `javascript:` hrefs become `/` | ☐ |
| H8 | Mobile release: no custom API host; cleartext off | ☐ |
| H9 | Mobile logout calls `POST /auth/logout` | ☐ |

## Week 3 — Ops

| ID | Test | Pass |
|----|------|------|
| M9 | Redis requires password on VPS | ☐ |
| M10 | `curl -sI https://APP_DOMAIN` shows HSTS + CSP | ☐ |
| M11 | Gmail SA mounted at `/run/secrets/gmail-sa.json` in backend | ☐ |
| H2 | Login email OTP sends when Gmail configured | ☐ |

## Week 4 — Efficiency

| ID | Test | Pass |
|----|------|------|
| L1 | Web map uses bbox + `page_size` ≤ 150 | ☐ |
| L1 | Mobile map loads trees by viewport bbox | ☐ |
| L5 | Field worker MVT/list scope matches project assignment | ☐ |
| L7 | `/health/integrations` returns 401 without token in production | ☐ |

## Load baseline (optional)

```bash
k6 run scripts/load/week4-smoke.js
API_BASE=https://api.aranyix.tech ACCESS_TOKEN=<jwt> k6 run scripts/load/week4-smoke.js
```

Record p95 latency for `/health/live` and authenticated `GET /trees?bbox=…`.
