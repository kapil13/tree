# Phase 3 — Monitoring Automation

Phase 3 turns passive satellite and health data into **automated monitoring**: scheduled scans, deduplicated alerts, notification delivery, supervisor dashboards, and operational visibility into background workers.

## Slices delivered

| Slice | Scope |
|-------|--------|
| **3.1** | Monthly work-area satellite sweep; on-demand project scan; NDVI degradation alerts |
| **3.2** | Unified `create_monitoring_alert` with deduplication; compliance escalation after 7 days |
| **3.3** | Email/SMS/in-app via existing `dispatch_alert_channels`; async `send_notification` worker |
| **3.4** | Web `/monitoring` dashboard — satellite staleness, alert counts, job history |
| **3.5** | Mobile: notification deep links to trees/projects; work-area satellite status on project detail |
| **3.6** | Daily health roundup — trees with poor health, stale analysis, or failed satellite presence |
| **3.7** | `GET /health/workers`; `monitoring_job_runs` table; job run recording on all cron tasks |

## Automated jobs (Celery beat)

| Schedule | Task | Purpose |
|----------|------|---------|
| 1st of month, 02:00 UTC | `monthly_satellite_sweep` | Scan work areas not scanned in 25+ days |
| Daily 03:00 UTC | `daily_health_roundup` | Health roundup + compliance escalation |
| Daily 05:30 UTC | `threat_watch_scan` | Existing threat alerts |
| Daily 06:00 UTC | `survival_survey_reminders` | Existing survival survey reminders |

## API

```http
GET /api/v1/planting-projects/monitoring-summary
```

Portfolio monitoring KPIs for supervisors (extends field-ops summary).

```http
POST /api/v1/planting-projects/{id}/satellite-scan
```

On-demand satellite scan for all work areas in a project (project managers only).

```http
GET /health/workers
```

Celery worker reachability and recent job run history.

## Alert kinds

| Kind | Trigger |
|------|---------|
| `ndvi_degradation` | Work-area NDVI drops ≥0.15 vs recent baseline |
| `health_roundup` | Daily digest of at-risk trees per owner |
| `compliance_open` | Violation unresolved for 7+ days |

Alerts respect user notification preferences (`satellite_health`, `monitoring`, etc.) and deduplicate within a configurable window.

## Web supervisor view

- **Monitoring** (`/monitoring`) — stale satellite count, unread alerts by type, work-area NDVI table, recent background jobs.
- **Alerts** (`/alerts`) — unchanged; receives monitoring alerts in-app.

## Mobile

- **Notifications** — tap opens tree detail (`tree_id`) or project (`payload.project_id`).
- **Project detail** — work areas show last satellite scan age and staleness indicator.

## Deploy notes

After pull, run migrations:

```bash
docker compose exec backend alembic upgrade head
# Expect: 0012_monitoring_job_runs (head)
```

Ensure **Celery worker** and **Celery beat** containers are running in production so scheduled jobs execute.

Rebuild **backend** and **frontend**. Mobile APK update is optional unless field teams need notification deep links and satellite status on project screens.
