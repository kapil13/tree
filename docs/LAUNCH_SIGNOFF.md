# Launch security sign-off

**Target soft launch:** 4 Sep 2026  
**Sign-off run:** 24 Aug 2026  
**Branch:** `cursor/security-signoff-f2ba`  
**Verifier:** Cloud Agent (automated + production smoke)

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Week 1 — Authz (C1–H5) | **PASS** | Covered by pytest + code review |
| Week 2 — Client trust (H6–H9) | **PASS** | Middleware + unit tests + prod curl |
| Week 3 — Ops (M9–H2) | **PARTIAL** | M9/M10 pass externally; M11/H2 need VPS SSH |
| Week 4 — Efficiency (L1–L7) | **PASS*** | L7 fix merged; *prod deploy pending for L7 curl |

**Overall:** Safe to proceed with soft launch **after** deploying this branch and completing two VPS-only checks (M11, H2).

## Automated verification

```bash
./scripts/security/retest-week4.sh
```

Last run (24 Aug 2026): backend 44 pytest pass, CMS tests pass, production smoke pass except L7 (500 until deploy).

## Production smoke (24 Aug 2026)

| Check | Result |
|-------|--------|
| `GET https://aranyix.tech/dashboard` (no cookie) | **307** → `/auth` |
| `Strict-Transport-Security` on app | **Present** |
| `Content-Security-Policy` on app | **Present** |
| `GET https://api.aranyix.tech/health/live` | **200** |
| Redis `:6379` on public IP | **Timeout** (not exposed) |
| `GET https://api.aranyix.tech/health/integrations` (no token) | **500** → fixed in code; expect **401** after deploy |

## Code fixes in this sign-off

1. **`/health/integrations` (L7)** — `get_current_user` now receives `Request`; was causing 500 instead of 401 in production.
2. **Mobile map (L1)** — Map screen loads trees by viewport bbox with `page_size=150`.
3. **Ops template** — `EVIDENCE_SIGNING_KEY` documented in `.env.production.example`.

## VPS-only follow-ups (before 4 Sep)

Run on Hostinger after deploy:

```bash
# Migration head
docker compose -f docker-compose.prod.yml exec backend alembic current
# Expect: 0054_refresh_homepage_compliance_phase_e

# Redis password required
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Expect: NOAUTH or (with -a) PONG — not open without password

# Gmail SA mount (M11) — if email OTP enabled
docker compose -f docker-compose.prod.yml exec backend test -f /run/secrets/gmail-sa.json && echo OK

# Secrets distinct from JWT (recommended)
grep -E '^(SESSION_COOKIE_SECRET|EVIDENCE_SIGNING_KEY)=' .env.production
# Must not be empty or identical to JWT_SECRET

# H2 — trigger login OTP on production with a test account when AUTH_OTP_EMAIL_ENABLED=true
```

## Optional load baseline

```bash
k6 run scripts/load/week4-smoke.js
API_BASE=https://api.aranyix.tech ACCESS_TOKEN=<jwt> k6 run scripts/load/week4-smoke.js
```

Record p95 for `/health/live` and authenticated `GET /trees?bbox=…` in this file when run.

## Sign-off checklist

See [SECURITY_RETEST_WEEK4.md](./SECURITY_RETEST_WEEK4.md) for item-by-item pass marks.

**Approved for soft launch (code + automated gates):** Yes, pending deploy + VPS ops checks above.
