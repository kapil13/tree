# BYOT — Hostinger KVM 4 Deployment

Deploy the full BYOT stack on a **Hostinger KVM 4** VPS (4 vCPU, 16 GB RAM, 200 GB NVMe) using Docker Compose + Caddy (HTTPS).

## What gets deployed

| Service | Role |
|---------|------|
| PostGIS | Database |
| Redis | Cache + Celery broker |
| MinIO | Photo / media storage |
| Backend | FastAPI API |
| Worker | Celery (satellite, AI, notifications) |
| Beat | Monthly NDVI cron schedule |
| Frontend | Next.js |
| Caddy | HTTPS reverse proxy |

## 1. Buy and create the VPS

1. [Hostinger VPS](https://www.hostinger.com/in/vps-hosting) → **KVM 4** (16 GB RAM).
2. OS: **Ubuntu 22.04**.
3. Location: **India** (Mumbai) if available.
4. Note the **public IP**.

## 2. DNS (GoDaddy or any registrar)

Create **A records** pointing to your VPS IP:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `YOUR_VPS_IP` |
| A | `api` | `YOUR_VPS_IP` |
| A | `www` | `YOUR_VPS_IP` (optional) |

Example: `byot.earth` and `api.byot.earth`.

## 3. Hostinger firewall + UFW

In **Hostinger hPanel → VPS → Firewall**, allow:

- **22** (SSH)
- **80** (HTTP — Let's Encrypt)
- **443** (HTTPS)

On the server:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Do **not** expose ports 5432, 6379, 9000, 3000, or 8000 publicly.

## 4. Install Docker on the VPS

```bash
ssh root@YOUR_VPS_IP

apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git
```

## 5. Clone the repo

```bash
git clone https://github.com/YOUR_ORG/tree.git /opt/byot
cd /opt/byot/infrastructure/hostinger
```

## 6. Configure environment

```bash
cp .env.production.example .env.production
nano .env.production
```

Generate secrets:

```bash
openssl rand -hex 32   # JWT_SECRET, REDIS_PASSWORD, SESSION_COOKIE_SECRET
openssl rand -hex 32   # POSTGRES_PASSWORD
python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"  # EVIDENCE_SIGNING_KEY
openssl rand -hex 24   # MINIO_ROOT_PASSWORD
```

**Required values:**

| Variable | Example / notes |
|----------|-----------------|
| `APP_DOMAIN` | `byot.earth` |
| `API_DOMAIN` | `api.byot.earth` |
| `NEXT_PUBLIC_API_URL` | `https://api.byot.earth` (or same-origin empty on aranyix.tech) |
| `CORS_ORIGINS` | `https://byot.earth,https://www.byot.earth` |
| `POSTGRES_PASSWORD` | strong random hex |
| `JWT_SECRET` | strong random hex (≥32 chars) |
| `REDIS_PASSWORD` | **literal** 64-char hex — Docker Compose does **not** expand `$(openssl …)` |
| `SESSION_COOKIE_SECRET` | strong random hex |
| `EVIDENCE_SIGNING_KEY` | base64-encoded 32-byte Ed25519 seed (required in production) |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (required in production) |
| `MINIO_ROOT_PASSWORD` | strong random |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | from Google Cloud Console |
| `SENTINEL_HUB_CLIENT_ID` / `SECRET` | from Copernicus |
| `RAZORPAY_WEBHOOK_SECRET` | required when Razorpay keys are set |

## 7. Deploy

```bash
chmod +x deploy.sh worker-entrypoint.sh
./deploy.sh
```

Or manually (always rebuild frontend after UI changes):

```bash
export GIT_SHA="$(git -C ../.. rev-parse --short HEAD)"
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

After login, the app top bar shows the deployed git short SHA (e.g. `802de9e`). If it does not match your latest `git pull`, the frontend image was not rebuilt.

First start runs **Alembic migrations** automatically (via `backend/docker-entrypoint.sh`).

### Database migrations (manual)

From `infrastructure/hostinger/` (after `./deploy.sh` or when the stack is already up):

```bash
make migrate-db
```

Or from the repo root (auto-detects the production Docker stack):

```bash
cd /opt/aranyix
make migrate-db
```

### India admin geography (project location dropdowns)

After migration `0060_india_admin_geography`, load LGD data **once**:

1. Download the official `villages_by_blocks` CSV from [ramSeraph/opendata releases](https://github.com/ramSeraph/opendata/releases).
2. Place it on the VPS, e.g. `/opt/aranyix/data/lgd/villages_by_blocks.csv`.
3. Run:

```bash
cd /opt/aranyix/infrastructure/hostinger
make import-india-admin
# or with a custom path:
# LGD_CSV=/path/to/villages_by_blocks.csv make import-india-admin
```

Without this import, state/district/block/GP/village dropdowns stay empty.

### Urban cities (district-scoped ULBs)

After migration `0065_india_cities_district_code`, the `india_cities` table is cleared and rebuilt with district-scoped urban local bodies. Re-run the import after upgrading:

```bash
cd /opt/aranyix/infrastructure/hostinger
make migrate-db
make import-india-admin
```

Without re-import, urban city dropdowns stay empty even when rural geography is loaded.

### Seed demo user (optional)

```bash
make seed-demo
```

## 8. Verify

```bash
curl -fsS https://api.byot.earth/health
# Expect HTTP 200 with "db":"ok" and "redis":"ok"
# open https://byot.earth in browser
```

If `/health` returns HTTP 503 with `"redis":"error"`, check that `REDIS_PASSWORD` in `.env.production` is a single literal hex value shared by backend, worker, and Redis containers.

### Backend unhealthy / restart loop

```bash
cd infrastructure/hostinger
# Works even when backend is crash-looping (no exec needed):
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend --tail 120

# One-shot diagnosis (no restart loop):
./debug-backend-boot.sh
# or: make debug-backend
```

Look for `[byot] boot guard failed:` or `alembic upgrade failed` in the output.

**Required after P0 security merge** (add to `.env.production` if missing):

```bash
# JWT / Redis — literal hex values in the file (not $(openssl ...))
openssl rand -hex 32

# Evidence signing — base64-encoded 32-byte seed (NOT the same as openssl rand -hex)
python3 -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"

# Cloudflare Turnstile (both required in production)
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

Preflight: `./check-production-env.sh`

## 9. Android APK

Rebuild with your production API:

```bash
cd mobile
flutter build apk --release --dart-define=BYOT_API=https://api.byot.earth
```

## File reference

```
infrastructure/hostinger/
├── docker-compose.prod.yml    # Full production stack
├── .env.production.example    # Copy → .env.production
├── Makefile                   # migrate-db, import-india-admin, deploy
├── Caddyfile                  # HTTPS routing
├── deploy.sh                  # Build + start + health check
└── worker-entrypoint.sh       # Celery wait-for-postgres
```

## Updates (redeploy after git pull)

```bash
cd /opt/byot
git pull
cd infrastructure/hostinger
./deploy.sh
```

If you change `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, rebuild frontend:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build frontend
```

## Backups

Daily Postgres dump (add to crontab as root):

```bash
crontab -e
```

```cron
0 3 * * * cd /opt/byot/infrastructure/hostinger && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_dump -U byot byot | gzip > /var/backups/byot-$(date +\%F).sql.gz
```

```bash
mkdir -p /var/backups
```

Copy `/var/backups/` off the server periodically.

## Logs and troubleshooting

```bash
# All services
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Single service
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# Resource usage (KVM 4 = 16 GB RAM)
docker stats
```

| Problem | Fix |
|---------|-----|
| `dependency failed to start: backend is unhealthy` | Run `./troubleshoot-deploy.sh` then `./check-production-env.sh`. After P0, backend requires `EVIDENCE_SIGNING_KEY`, Turnstile keys, and strong `JWT_SECRET`. See logs: `docker compose … logs backend --tail 80` |
| `/health` returns 503, `"redis":"error"` | `REDIS_PASSWORD` must be a **literal** 64-char hex in `.env.production` (not `$(openssl …)`). Restart stack after fixing. |
| `alembic upgrade failed` in backend logs | Run `make migrate-db` or `docker compose … exec backend alembic upgrade head`; see `troubleshoot-deploy.sh` for revision hints |
| Caddy no certificate | DNS must point to VPS; ports 80/443 open |
| `postgis` extension error | Image is `postgis/postgis:16-3.4` — should work |
| OOM / restarts | `docker stats` — raise limits in compose or upgrade plan |
| CORS errors | Match `CORS_ORIGINS` to exact frontend URL (https, no trailing slash) |
| Maps blank | Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and **rebuild frontend** |

## Optional: public MinIO for browser uploads

If you need presigned direct-to-storage uploads from the browser:

1. Add DNS: `media.byot.earth` → VPS IP.
2. Uncomment the `MEDIA_DOMAIN` block in `Caddyfile`.
3. Set `MEDIA_DOMAIN=media.byot.earth` in `.env.production`.
4. Restart Caddy: `docker compose ... up -d caddy`.

## Cost

| Item | ~Monthly |
|------|----------|
| Hostinger KVM 4 | ₹1,099 intro / ~₹2,399 renewal |
| Domain | ~₹100 (amortized) |
| Google Maps / Sentinel | Often ₹0 on free tiers |

**Total:** roughly **₹1,200–2,500/month** (no AWS required).
