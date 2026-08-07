# SAR Phase 3 — Fusion & Alerts (Operational Value)

Turns SAR fusion (Forest Integrity Score) into **supervisor dashboards**, **deduplicated alerts**, and **scheduled re-scans** for at-risk work areas.

## Delivered in this phase

| Component | Description |
|-----------|-------------|
| **Fusion alerts** | `maybe_alert_sar_fusion()` on every SAR scan (manual + sweep) |
| **Monitoring summary** | SAR integrity, mode, staleness per work area on `/monitoring` |
| **Weekly watch** | Celery `weekly_sar_integrity_watch` — re-scans top at-risk fences |
| **Alert kinds** | See table below |

## Alert kinds

| Kind | Trigger |
|------|---------|
| `sar_integrity_drop` | Score drops ≥15 pts vs prior SAR scan |
| `sar_optical_divergent` | `monitoring_mode = optical_sar_divergent` |
| `sar_integrity_at_risk` | Score &lt; 50 or grade `at_risk` / `critical` |
| `sar_monsoon_gap_fill` | Optical stale + SAR stress (`sar_gap_fill` mode) |

Existing SAR finding alerts (`sar_hidden_moisture`, `sar_flood_risk`, etc.) still fire from raw analytics.

Alerts use `satellite_health` notification prefs and 7-day dedupe per work area.

## Scheduled jobs

| Schedule | Task | Queue |
|----------|------|-------|
| 5th of month, 03:00 UTC | `monthly_sar_sweep` | `satellite` |
| **Monday 04:00 UTC** | `weekly_sar_integrity_watch` | `satellite` |

Weekly watch re-scans up to **20** at-risk fences not scanned in the last **7** days (prioritizes optical/SAR mismatch).

Manual trigger:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec worker \
  celery -A app.workers.celery_app call app.workers.tasks.weekly_sar_integrity_watch
```

## API / UI

```http
GET /api/v1/planting-projects/monitoring-summary
```

New fields:

- `stale_sar_work_areas`
- `sar_at_risk_work_areas`
- `sar_avg_forest_integrity`
- Per work area: `sar_forest_integrity`, `sar_integrity_grade`, `sar_monitoring_mode`, `sar_stale`

**Portfolio → Monitoring** tab shows SAR KPIs and integrity columns.

## Prerequisites

1. Live SAR provider configured (`SAR_PROVIDER=gee` or `sentinel_hub`)
2. GEE dB-scale fix deployed (PR #169) so scans persist live data
3. Worker + beat running with SAR env/credentials

## Verification

```bash
# Run SAR scan on a fence, then check monitoring summary
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.aranyix.tech/api/v1/planting-projects/monitoring-summary | jq '.sar_at_risk_work_areas, .sar_avg_forest_integrity'

# Confirm weekly job registered
docker compose ... exec beat celery -A app.workers.celery_app inspect scheduled
```

## Next (Phase 3 follow-ups)

- Alert → field task workflow
- Mobile notification deep links to SAR panel
- Copernicus + GEE dual-provider fallback
- Portfolio SAR trend charts

See also [SAR_OPERATIONS.md](./SAR_OPERATIONS.md) and [PHASE3_MONITORING.md](./PHASE3_MONITORING.md).
