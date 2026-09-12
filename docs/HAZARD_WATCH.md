# Phase B — Hazard Watch (Fire, Flood, Locust)

Operational hazard monitoring for plantation work areas. Delivered across Sprints 1–5.

## Alert kinds

| Kind | Source | Trigger |
|------|--------|---------|
| `fire_alert` | NASA FIRMS (or seasonal fallback) | Active fire detections within `HAZARD_FIRE_RADIUS_KM` |
| `flood_extent_alert` | SAR fusion + rain forecast | Elevated water extent score with heavy rain |
| `locust_watch` | FAO / configured feed (or corridor model) | Locust observations or corridor proximity |

## APIs

```http
GET /api/v1/threats/fires?fence_id={uuid}&days=1
```

Returns FIRMS detections near a work-area centroid for satellite map overlays.

```http
GET /api/v1/dashboard/threat-watch
GET /api/v1/intelligence/summary
GET /api/v1/plantation-fences/{id}/pest-intel
```

Portfolio and per-site hazard signals roll up through threat watch and pest intel.

## Configuration

| Variable | Purpose |
|----------|---------|
| `FIRMS_MAP_KEY` | NASA FIRMS API key (free registration) |
| `FIRMS_API_URL` | FIRMS base URL (default NASA MODAPS) |
| `HAZARD_FIRE_RADIUS_KM` | Search radius for fire proximity (default 25) |
| `LOCUST_FEED_URL` | Optional JSON feed of locust observations |
| `FAO_LOCUST_FEED_ENABLED` | Attempt FAO DLIS BigQuery when no custom feed |
| `LOCUST_FEED_RADIUS_KM` | Proximity radius for locust observations (default 400) |
| `FCM_SERVER_KEY` | Firebase push for mobile hazard alerts |

Without `FIRMS_MAP_KEY`, fire watch uses a **seasonal fallback** heuristic (labelled in UI and integration health).

Without `LOCUST_FEED_URL`, locust watch uses a **seasonal corridor model** for South Asia.

## Notification preferences

Users can enable hazard push alerts under **Alerts → Notification preferences → Weather & pest early warnings**:

- `push_on_hazard` — sends FCM push for `fire_alert`, `flood_extent_alert`, and `locust_watch`
- Push payload includes `alert_id`, `fence_id`, and `deep_link` (`/map?fence=…` on mobile)

## Daily scan

Celery beat job `threat_watch_scan` (05:30 UTC) evaluates all plantation fences and creates in-app/email/push alerts per user preferences.

## Web UI

- **Executive dashboard** — Threat watch KPIs (fire, flood, locust)
- **Portfolio → Threats** — integration health for FIRMS and locust feed
- **Satellite map** — hazard layer legend with FIRMS fire pins
- **Alerts inbox** — hazard filter chips and preparedness interpretation

## Mobile

- Hazard labels and filters (`fire_alert`, `flood_extent_alert`, `locust_watch`)
- Monitoring hazard summary card
- Map pins for hazard alerts with fence centroid resolution
- Alert detail preparedness card and map deep link
