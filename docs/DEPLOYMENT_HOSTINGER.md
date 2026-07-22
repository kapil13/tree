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
openssl rand -hex 32   # use for JWT_SECRET
openssl rand -hex 32   # use for POSTGRES_PASSWORD
openssl rand -hex 24   # use for MINIO_ROOT_PASSWORD
```

**Required values:**

| Variable | Example |
|----------|---------|
| `APP_DOMAIN` | `byot.earth` |
| `API_DOMAIN` | `api.byot.earth` |
| `NEXT_PUBLIC_API_URL` | `https://api.byot.earth` |
| `CORS_ORIGINS` | `https://byot.earth,https://www.byot.earth` |
| `POSTGRES_PASSWORD` | strong random |
| `JWT_SECRET` | strong random |
| `MINIO_ROOT_PASSWORD` | strong random |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | from Google Cloud Console |
| `SENTINEL_HUB_CLIENT_ID` / `SECRET` | from Copernicus |

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

### Seed demo user (optional)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec backend python -m app.scripts.seed_demo
```

## 8. Verify

```bash
curl -fsS https://api.byot.earth/health
# open https://byot.earth in browser
```

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
