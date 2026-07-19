# Phase 4 — Intelligence Hub

Phase 4 fuses external environmental data into a **segment-agnostic intelligence layer**: weather forecasts, pest intel, threat watch, GBIF/IUCN biodiversity baselines, integration health, and grounded AI assistant context. NHAI highway projects are one use case; the same APIs and UI serve mines, townships, NGOs, and generic planting programs.

## Slices delivered

| Slice | Scope |
|-------|--------|
| **4.7** | Integration health (`/health/integrations`, `/api/v1/intelligence/integrations`) |
| **4.1** | Weather intelligence — Open-Meteo alerts rolled into portfolio summary |
| **4.2** | Pest intel v2 — hotspot rollup from per work-area composite risk |
| **4.5** | Threat watch v2 — unified feed in `/intelligence` and assistant grounding |
| **4.6** | Grounded AI assistant — `intelligence_context_for_assistant` wired into `run_assistant` |
| **4.4** | GBIF/IUCN biodiversity baseline snapshots per work area (weekly Celery job) |

Sentinel + Bhoonidhi fusion (4.3) remains on the roadmap; Bhoonidhi and Sentinel credentials are surfaced in integration health today.

## Automated jobs (Celery beat)

| Schedule | Task | Purpose |
|----------|------|---------|
| Sunday 04:30 UTC | `biodiversity_baseline` | GBIF/IUCN species snapshots for work areas (skips if captured within 25 days) |

Existing beat jobs from Phase 3 (`threat_watch_scan`, satellite sweeps, health roundup) continue unchanged.

## API

```http
GET /api/v1/intelligence/summary?site_limit=15
```

Portfolio intelligence for supervisors: extends field-ops summary with threat watch sites, pest hotspots, weather alerts, early warnings, biodiversity coverage, and integration status.

```http
GET /api/v1/intelligence/integrations
```

Authenticated integration health (same payload as public health endpoint).

```http
GET /health/integrations
GET /api/v1/health/integrations
```

Public reachability check for Open-Meteo, GBIF, and credential status for Sentinel Hub, Bhoonidhi, and IUCN.

## Data model

Migration `0013_work_area_biodiversity_snapshots` adds `work_area_biodiversity_snapshots` — JSONB species lists from `build_regional_fauna()` (GBIF occurrences + optional IUCN enrichment).

## Web supervisor view

- **Intelligence** (`/intelligence`) — portfolio risk KPIs, integration status, weather alerts, pest hotspots, early warnings, threat watch table.
- **Monitoring** (`/monitoring`) — satellite staleness and job health (Phase 3).
- **AI assistant** — weather/threat intents and OpenAI grounding include live intelligence JSON.

## Deploy notes

After pull, run migrations:

```bash
docker compose exec backend alembic upgrade head
# Expect: 0013_work_area_biodiversity_snapshots (head)
```

Ensure **Celery worker** and **Celery beat** are running so `biodiversity_baseline` executes on schedule.

Rebuild **backend** and **frontend**. No mobile change required for Phase 4 web hub; assistant improvements apply to existing mobile/web assistant endpoints.

## Verification

```bash
curl -s https://api.aranyix.tech/health/integrations | jq .
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.aranyix.tech/api/v1/intelligence/summary | jq '.highest_risk, .weather_alert_count'
```
