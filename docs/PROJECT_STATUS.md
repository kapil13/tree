# Aranyix / BYOT — Project Status

Last updated after Phase 2 (field ops), Phase 3 (monitoring), and CI stabilization.

## Production checklist

| Item | Status | Notes |
|------|--------|-------|
| Phase 2 field ops | On `main` | `/field-ops`, mobile projects, offline sync, contractors |
| Phase 3 monitoring | On `main` | `/monitoring`, Celery jobs, `/health/workers` |
| CI (lint + tests) | Green | PRs #48–#50, #49 |
| VPS deploy | **You must run** | `infrastructure/hostinger/deploy.sh` after each `git pull` |
| Migration head | `0012_monitoring_job_runs` | `alembic upgrade head` (now in `deploy.sh`) |
| Celery worker + beat | Required | Monthly satellite + daily health roundup |
| Mobile APK | **Build when ready** | Executive home + field projects need new APK |

### Verify production

```bash
curl -s https://api.aranyix.tech/health | python3 -m json.tool
curl -s https://api.aranyix.tech/health/workers | python3 -m json.tool
curl -s https://api.aranyix.tech/openapi.json | grep -E 'monitoring-summary|health/workers'
```

---

## Open PR cleanup (close manually)

These draft PRs are **already merged into `main`** or **superseded**. Close them in GitHub to reduce noise:

| PR | Action | Reason |
|----|--------|--------|
| #9–#15 | Close | Superseded (photos, login, OTP, Sentinel, Postgres port) |
| #23–#27, #29–#35 | Close | Bioacoustic stack merged to `main` |
| #37 | Close | Stale; would revert Phase 2/3 if merged |
| #28 | Close after #51 merges | Rebased mobile executive dashboard |

Keep only new work as fresh PRs targeting `main`.

---

## What's next (product)

1. **VPS** — `git pull && ./deploy.sh` on production
2. **Mobile APK** — ship for field teams (Phase 2 + executive home)
3. **Observe** — `/monitoring` for 1–2 weeks; tune alert thresholds
4. **Phase 4** — reports export, notification polish, public passports (`docs/ROADMAP.md`)

---

## Key URLs

| Surface | URL |
|---------|-----|
| App | https://aranyix.tech/ |
| API | https://api.aranyix.tech/ |
| Field ops | https://aranyix.tech/field-ops |
| Monitoring | https://aranyix.tech/monitoring |
| Worker health | https://api.aranyix.tech/health/workers |
