# SAR Phase 3b — Field Action Loop

Closes the loop from **SAR fusion alert** → **field verification task** → **supervisor navigation**.

## Delivered

| Component | Description |
|-----------|-------------|
| **Deep links** | SAR alerts include `deep_link` (web) and `mobile_deep_link` |
| **Field tasks** | High/critical alerts create open `sar_field_verification` compliance violations |
| **Web** | Alerts page links to `/satellite?fence=…`; satellite page reads `?fence=` |
| **Mobile** | Notification tap opens monitoring/tree/project; monitoring shows SAR integrity |

## Alert payload fields

```json
{
  "fence_id": "…",
  "project_id": "…",
  "deep_link": "/satellite?fence=…",
  "mobile_deep_link": "/monitoring?fence=…",
  "action_label": "Review SAR on satellite map",
  "source": "sar_monitoring"
}
```

## Field verification tasks

- **Type:** `sar_field_verification` (`PlantingComplianceViolation`)
- **Created when:** SAR fusion or raw SAR alert severity is `high` or `critical`
- **Deduped:** 7 days per work area / alert kind
- **Resolve:** `POST /api/v1/planting-projects/{id}/compliance-violations/{violation_id}/resolve`

Metadata includes `forest_integrity_score`, `monitoring_mode`, and `action: field_verify_drainage_and_ground_conditions`.

## Supervisor flow

1. SAR scan or weekly watch detects risk → alert + optional field task
2. Supervisor opens **Alerts** → **Review SAR on satellite map**
3. Field team visits site, resolves compliance violation in project view
4. Re-run SAR scan to confirm integrity recovery

## Mobile

- Tap SAR alert → `/monitoring?fence={id}` with work area highlighted
- Monitoring tab shows SAR at-risk count and integrity per work area

## Next

- Copernicus + GEE dual-provider fallback (`SAR_FALLBACK_PROVIDER`)
- SAR trend charts on monitoring dashboard
- Push notification payload wiring for FCM deep links
