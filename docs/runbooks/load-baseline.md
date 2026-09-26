# Load testing baseline (Platform Foundation E5)

Run on **Hostinger KVM4** before any government pilot. Record p95 latency in the table below.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed on the VPS or CI runner
- Demo or pilot JWT: `ACCESS_TOKEN`
- Optional: `PROJECT_ID`, `WEBHOOK_ID` for scoped scripts

## Scripts

| Script | Command |
|--------|---------|
| Login storm | `k6 run scripts/load/platform-e5/login-storm.js` |
| Bulk tree create | `ACCESS_TOKEN=<jwt> k6 run scripts/load/platform-e5/bulk-tree-create.js` |
| Satellite enqueue | `ACCESS_TOKEN=<jwt> PROJECT_ID=<uuid> k6 run scripts/load/platform-e5/satellite-enqueue.js` |
| Report export | `ACCESS_TOKEN=<jwt> PROJECT_ID=<uuid> k6 run scripts/load/platform-e5/report-export.js` |
| Webhook fan-out | `ACCESS_TOKEN=<jwt> WEBHOOK_ID=<uuid> k6 run scripts/load/platform-e5/webhook-fanout.js` |
| Legacy smoke | `k6 run scripts/load/week4-smoke.js` |

Set `API_BASE=https://api.aranyix.tech` for production baseline runs.

## Baseline record (KVM4)

| Scenario | Date | VUs | p95 (ms) | Error rate | Notes |
|----------|------|-----|----------|------------|-------|
| `/health/live` | | 5 | | | week4-smoke.js |
| Login storm | | 20 | | | |
| Bulk tree create | | 3 | | | |
| Satellite enqueue | | 2 | | | |
| MRV export | | 2 | | | |
| Webhook test | | 5 | | | |

## Pass criteria (initial)

- `/health/live` p95 < 500 ms at 5 VUs
- Authenticated tree list p95 < 2000 ms (week4-smoke)
- Login storm error rate < 10% (mostly 401, not 5xx)
- Expensive endpoints return 429 before 5xx under sustained load
