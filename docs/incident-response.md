# Incident response runbook

Operational playbook for security and availability incidents on the BYOT / Aranyix Hostinger VPS stack.

## 1. Severity levels

| Level | Examples | Response target |
|-------|----------|-----------------|
| **SEV-1** | Active data breach, auth bypass, ransomware, full outage | Immediate (15 min) |
| **SEV-2** | Partial outage, credential leak suspected, privilege escalation | Same business day (4 h) |
| **SEV-3** | Degraded performance, failed deploy, non-exploitable vulnerability | Next business day |
| **SEV-4** | Low-risk findings, cosmetic issues | Scheduled backlog |

## 2. On-call contacts

1. **Primary**: platform owner / DevOps (see internal contact list).
2. **Security reports**: `security@aranyix.tech` (also published in `/.well-known/security.txt`).
3. **Hosting**: Hostinger VPS panel + support for infrastructure/network issues.

## 3. First 30 minutes (any SEV-1/SEV-2)

1. **Acknowledge** the alert or report; assign an incident commander.
2. **Triage**: confirm scope (which services, users, data).
3. **Contain** if active exploitation is suspected:
   - Rotate `JWT_SECRET`, `SESSION_COOKIE_SECRET`, `EVIDENCE_SIGNING_KEY`, Redis password, DB password, MinIO keys, Razorpay webhook secret as applicable.
   - Enable maintenance mode via platform governance (`/platform` → maintenance) to block writes.
   - Revoke suspicious sessions (user password reset / session invalidation).
4. **Preserve evidence**: export Caddy, backend, and worker logs before redeploy:
   ```bash
   cd infrastructure/hostinger
   docker compose -f docker-compose.prod.yml --env-file .env.production logs --no-color > /tmp/incident-$(date +%Y%m%d-%H%M).log
   ```
5. **Communicate** status to stakeholders (internal channel); no public disclosure until scope is understood.

## 4. Service recovery checklist

```bash
cd infrastructure/hostinger
docker compose -f docker-compose.prod.yml --env-file .env.production ps
curl -fsS https://api.${APP_DOMAIN}/health
curl -fsS -H "Authorization: Bearer $ADMIN_TOKEN" https://api.${APP_DOMAIN}/health/workers
```

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `/health` 503, `redis: down` | Redis down or wrong `REDIS_PASSWORD` | `docker compose … restart redis`; verify literal password in `.env.production` |
| `/health` 503, `database: down` | PostGIS not ready | `docker compose … restart db`; check disk space |
| Backend crash loop on deploy | Missing prod guard env | Set `EVIDENCE_SIGNING_KEY`, Turnstile keys, strong `JWT_SECRET` per `docs/SECURITY.md` |
| 502 from Caddy | Frontend/backend container stopped | `docker compose … up -d`; inspect logs |
| Auth 503 on login | Redis unavailable (rate limit fail-closed) | Restore Redis first |

Full deployment reference: `docs/DEPLOYMENT_HOSTINGER.md`.

## 5. Post-incident

1. Document timeline, root cause, and blast radius.
2. Open tracking issues for remediations (code, config, monitoring).
3. Rotate any credentials that may have been exposed.
4. Update `docs/SECURITY.md` or this runbook if procedures were wrong or missing.
5. For SEV-1/SEV-2 with customer impact, prepare a factual status summary for affected org admins.

## 6. Preventive controls (already in codebase)

- Production boot guards (`validate_runtime_settings()`).
- RBAC + org-scoped queries + org feature flags.
- Health probes require auth for worker/integration detail in production.
- Audit log chain for sensitive mutations.
- Rate limits on auth routes (fail-closed when Redis is down).

## 7. Related documents

- `docs/SECURITY.md` — threat model and secrets
- `docs/DEPLOYMENT_HOSTINGER.md` — VPS operations
- `docs/LAUNCH_SIGNOFF.md` — launch gate checklist
