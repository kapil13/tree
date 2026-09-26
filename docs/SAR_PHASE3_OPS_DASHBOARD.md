# SAR Phase 3.3–3.6 — Supervisor ops dashboard & closed loop

Operational SAR capabilities for supervisors: portfolio dashboard, automated sweep health, field verification loop, and compliance reporting.

## 3.3 Supervisor operational dashboard

`GET /api/v1/planting-projects/monitoring-summary` now includes:

| Field | Meaning |
|-------|---------|
| `sar_aligned_work_areas` | Optical + SAR monitoring aligned |
| `sar_divergent_work_areas` | Canopy green but SAR shows ground risk |
| `sar_gap_fill_work_areas` | SAR fills stale optical NDVI |
| `sar_live_providers` / `sar_stub_providers` | Live vs stub scan counts |
| `sar_avg_forest_integrity` | Portfolio average Forest Integrity score |
| `unread_sar_alerts_by_kind` | SAR alert breakdown (30d) |
| `open_sar_field_verifications` | Open compliance tasks from SAR alerts |
| `sar_recommended_action` | Per work-area supervisor guidance |

## 3.4 Automated sweep → alert loop

Celery jobs track stub vs live scan outcomes:

- `monthly_sar_sweep` — 5th of month, 03:00 UTC
- `weekly_sar_integrity_watch` — Mondays 04:00 UTC
- `daily_sar_sweep_health` — daily 04:30 UTC (reviews recent job runs)

When stub ratio ≥ 50% or all scans are stub, owners receive `sar_sweep_health` alerts.

## 3.5 Field action loop

High/critical SAR fusion alerts create `sar_field_verification` compliance violations (Phase 3b). The monitoring summary lists open tasks with deep links to `/satellite?fence={id}`.

## 3.6 Reporting & compliance

`GET /api/v1/sar/portfolio-export` returns a CSV of Forest Integrity, monitoring mode, provider status, and recommended actions for all accessible work areas.

Intelligence assistant context (`intelligence_context_for_assistant`) includes SAR fusion summary KPIs for LLM grounding.

## Key modules

- `backend/app/services/monitoring/sar_ops_dashboard.py`
- `backend/app/services/monitoring/sar_sweep_health.py`
- `backend/app/services/monitoring/summary.py`
