# SAR Operations Runbook

Operational guide for **live SAR ground intelligence** (Sentinel-1 C-band) on Aranyix production.

## Provider options (Stage B)

| `SAR_PROVIDER` | Data source | Credentials | Live provider tag |
|----------------|-------------|-------------|-------------------|
| `gee` | Google Earth Engine `COPERNICUS/S1_GRD` | `GEE_SERVICE_ACCOUNT_JSON` | `sar-gee-sentinel1` |
| `sentinel_hub` | Copernicus Data Space Statistics API | `SENTINEL_HUB_CLIENT_ID` / `SECRET` | `sar-sentinel-hub-s1` |
| `stub` | Deterministic demo | none | `nisar-sar-stub` |

**Dual-provider (Phase 4.7):** set `SAR_FALLBACK_PROVIDER` to try a second live source before stub:

```env
SAR_PROVIDER=sentinel_hub
SAR_FALLBACK_PROVIDER=gee
```

**Recommendation:** Use `sentinel_hub` primary with `gee` fallback for production resilience, or `gee` alone if Earth Engine is already registered.

## Architecture

| Component | Role |
|-----------|------|
| **backend** | API scans (`POST /v1/sar/work-areas/{id}/scan`) |
| **worker** | Celery `run_sar_scan`, `monthly_sar_sweep` (queue: `satellite`) |
| **beat** | Schedules monthly SAR sweep — **5th of month, 03:00 UTC** |
| **GEE / Sentinel Hub** | Samples Sentinel-1 VH/VV at fence centroid |

Live records: **`sar-gee-sentinel1`** or **`sar-sentinel-hub-s1`**. Stub: **`nisar-sar-stub`**.

## Copernicus Sentinel Hub setup (no Google)

```env
SAR_PROVIDER=sentinel_hub
SAR_ENABLED=true
SENTINEL_HUB_CLIENT_ID=your-cdse-client-id
SENTINEL_HUB_CLIENT_SECRET=your-cdse-secret
```

Uses the same Copernicus Data Space credentials as optical NDVI. No extra volume mounts required.

## Google Earth Engine setup

1. Register GCP project at [Earth Engine signup](https://signup.earthengine.google.com/)
2. Enable **Earth Engine API**
3. Create service account + JSON key → `/opt/aranyix/secrets/gee-service-account.json` (`chmod 600`)
4. Grant service account Earth Engine access

### GEE environment

```env
SAR_PROVIDER=gee
SAR_ENABLED=true
GEE_SA_JSON_HOST=/opt/aranyix/secrets/gee-service-account.json
GEE_SERVICE_ACCOUNT_JSON=/run/secrets/gee-sa.json
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gee-sa.json
```

**backend** and **worker** must mount the key:

```yaml
volumes:
  - ${GEE_SA_JSON_HOST}:/run/secrets/gee-sa.json:ro
```

## Deploy / upgrade

```bash
cd /opt/aranyix/infrastructure/hostinger
./deploy.sh
```

## Verification

### Automated script

```bash
chmod +x verify-sar-gee.sh
./verify-sar-gee.sh
```

### Manual checks

```bash
# GEE init
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  python -c "from app.services.satellite.gee_sar_sampler import _initialize_gee; print(_initialize_gee())"

# Full ops check
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  python -m app.scripts.sar_ops_check --list-fences 5

# Live sample (replace coordinates)
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  python -m app.scripts.sar_ops_check --sample 28.61 77.21

# API status (needs Bearer JWT)
curl -sS -H "Authorization: Bearer $TOKEN" https://api.aranyix.tech/api/v1/sar/status
```

Expect: `gee_available: true`, `provider: sar-gee`.

### UI

Satellite → select plantation fence → **Run SAR scan** → Forest Integrity Score + ground status.

## Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend --tail=50 | grep -iE 'sar|gee'
docker compose -f docker-compose.prod.yml --env-file .env.production logs worker --tail=50 | grep -iE 'sar|monthly_sar'
```

| Log | Meaning |
|-----|---------|
| `gee_initialize_failed` | EE project not registered or bad key |
| `gee_s1_sample_failed` | No Sentinel-1 scene or quota error (falls back to stub) |
| `sar_fence_scan_error` | Scan failed after sampling (check traceback) |
| `ValidationError SarAnalysisOut` | Upgrade to latest `main` (fixed in Stage A) |

## Monthly sweep

- Task: `app.workers.tasks.monthly_sar_sweep`
- Queue: `satellite` (worker must be running with GEE env + mount)
- Skips fences scanned via optical NDVI within last 20 days

Manual trigger (ops):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec worker \
  celery -A app.workers.celery_app call app.workers.tasks.monthly_sar_sweep
```

## Pilot calibration

Tune thresholds in `backend/app/services/satellite/sar_analytics.py`:

| Constant | Default | When to lower | When to raise |
|----------|---------|---------------|---------------|
| `WETLAND_PROB_THRESHOLD` | 0.65 | Missing real wetlands | Too many wetland alerts |
| `DOUBLE_BOUNCE_THRESHOLD` | 0.60 | Missing waterlogging | False flood alerts |
| `GROUND_MOISTURE_HIGH` | 0.70 | Dry sites flagged moist | Missing moist ground |

After changes: redeploy backend + worker, rescan 2–3 pilot fences, compare with field notes.

## Key rotation

1. Create new key in GCP → save to `gee-service-account.json.new`
2. `mv` into place, `chmod 600`
3. `docker compose ... up -d backend worker` (no rebuild needed)
4. Clear EE init cache: restart containers (or redeploy)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `missing_token` on curl | Export fresh JWT from browser `byot_access_token` |
| `gee_available: false` | Install `earthengine-api`, register EE project |
| `init: False` project not registered | Earth Engine console → register project |
| UI 500 on scan | Deploy latest main (SarAnalysisOut fix) |
| `nisar-sar-stub` in DB | GEE returned no scene — normal for some dates/locations |
| Worker sweep uses stub | Worker missing GEE mount or env |

## Related docs

- [SATELLITE_MONITORING.md](./SATELLITE_MONITORING.md) — optical NDVI pipeline
- [PHASE3_MONITORING.md](./PHASE3_MONITORING.md) — Celery monitoring automation
