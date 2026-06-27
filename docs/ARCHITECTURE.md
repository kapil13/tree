# BYOT — System Architecture

## 1. Goals and constraints

* **Planetary scale**: 10M trees → 100M trees; multi-region deployment.
* **Geospatial-first**: every tree is a point; every plantation a polygon.
* **Pluggable intelligence**: AI vendors (OpenAI, Gemini, in-house CV) and
  satellite providers (Sentinel Hub, GEE, Planet) must be hot-swappable.
* **Credit-grade auditability**: every health/biomass/carbon claim must be
  traceable to evidence (photo, satellite scene, model version).
* **Multi-tenant**: individuals, farmers, NGOs, corporates, governments —
  isolated via `organizations` + RLS-friendly schema.

## 2. C4 — System context

```
                ┌──────────────────────────────────────────────────────────┐
                │                       BYOT Platform                      │
                │                                                          │
   Individuals  │  ┌──────────┐   ┌────────────┐   ┌───────────────┐       │
   Farmers      │──│ Next.js  │   │  FastAPI   │   │ AI / Satellite│       │
   NGOs         │  │   Web    │──▶│  Gateway   │──▶│  Workers      │       │
   Corporates   │  └──────────┘   └────────────┘   └───────────────┘       │
   Government   │  ┌──────────┐         │                  │               │
                │──│ Flutter  │─────────┘                  │               │
                │  │  Mobile  │                            ▼               │
                │  └──────────┘                  ┌────────────────┐        │
                │                                │ Postgres+PostGIS│       │
                │                                │ Redis, S3, MSK  │       │
                │                                └────────────────┘        │
                └──────────────────────────────────────────────────────────┘
                          │                                  │
                ┌─────────▼─────────┐                ┌───────▼──────────┐
                │ Carbon Marketplace│                │ Satellite APIs   │
                │ (Verra, GS)       │                │ Sentinel/Landsat │
                └───────────────────┘                │ Google Earth Eng │
                                                     └──────────────────┘
```

## 3. C4 — Container view

| Container | Tech | Responsibility |
|---|---|---|
| Web app | Next.js 15 (App Router) | User UI, dashboards, maps, reports, SSR/RSC |
| Mobile app | Flutter (Android/iOS) | Field data capture: GPS, camera, offline-first |
| API Gateway | FastAPI + Uvicorn behind Nginx Ingress | REST, OpenAPI, JWT auth, rate limiting |
| Auth service | FastAPI module + Authlib | JWT, OAuth2 (Google), OTP (TOTP / SMS via SNS) |
| Tree service | FastAPI + SQLAlchemy + PostGIS | CRUD, passports, QR, vector tiles |
| AI worker | Celery + PyTorch/Triton + OpenAI/Gemini adapters | Species, health, growth, biomass |
| Satellite worker | Celery + GEE/Sentinel Hub + rasterio | NDVI, change detection, time-series |
| Carbon engine | Pure-Python library used by API + workers | AGB, BGB, CO₂e, credit estimates |
| Notification service | Celery + SES + SNS + FCM | Email, SMS, push, in-app |
| Reporting service | Celery + WeasyPrint + openpyxl + S3 | PDF/Excel report generation |
| Datastore | PostgreSQL 16 + PostGIS 3.4 (RDS Multi-AZ) | OLTP, geo queries |
| Time-series | TimescaleDB hypertable `tree_metrics_ts` | Daily / weekly metrics |
| Cache & queue | ElastiCache Redis | Cache + Celery broker |
| Event bus | Amazon MSK (Kafka) | `tree.registered`, `analysis.completed`, etc. |
| Object storage | S3 + CloudFront | Photos, satellite tiles, reports |
| Search | OpenSearch (optional) | Full-text on species, organizations |
| Observability | OTel → Tempo / Prometheus / Loki / Grafana, Sentry | Tracing, metrics, logs, errors |

## 4. Component view — Backend

```
backend/app/
├── main.py                 # FastAPI app factory
├── core/
│   ├── config.py           # Pydantic-Settings (12-factor)
│   ├── security.py         # JWT, password hashing, RBAC dependency
│   ├── database.py         # Async SQLAlchemy engine + session
│   ├── logging.py          # JSON structured logging + OTel hooks
│   └── rate_limit.py
├── models/                 # SQLAlchemy ORM models (1 file per aggregate)
├── schemas/                # Pydantic v2 DTOs
├── api/v1/
│   ├── deps.py             # current_user, db, RBAC
│   ├── auth.py
│   ├── trees.py
│   ├── analysis.py
│   ├── satellite.py
│   ├── carbon.py
│   ├── dashboard.py
│   ├── reports.py
│   ├── alerts.py
│   └── tiles.py            # /vector-tiles/{z}/{x}/{y} via PostGIS
├── services/
│   ├── ai/                 # species, health, growth, assistant
│   ├── satellite/          # sentinel, landsat, gee, ndvi
│   ├── carbon/             # IPCC, Verra VM0047, Gold Standard
│   ├── passport/           # QR + PDF
│   ├── reports/            # PDF/Excel
│   ├── notifications/      # SES, SNS, FCM
│   └── storage/            # S3 wrapper
├── workers/
│   ├── celery_app.py
│   └── tasks/              # analysis, satellite_scan, carbon_recalc, alerts
├── events/
│   └── kafka.py            # Producer/consumer wrappers
└── scripts/
    ├── seed_demo.py
    └── recompute_carbon.py
```

## 5. Request flows

### 5.1 Register a tree (web/mobile)

```
Client ──POST /api/v1/trees──▶ FastAPI
                                │
                                ├─ validate JWT + RBAC
                                ├─ insert tree + photos (S3 presigned)
                                ├─ enqueue ai.analyze(tree_id, photos)
                                ├─ enqueue satellite.baseline_scan(tree_id)
                                ├─ enqueue carbon.recalculate(tree_id)
                                └─ publish event tree.registered
Client ◀── 201 { tree_id, passport_url, qr_url }
```

### 5.2 AI analysis pipeline

```
Celery worker (ai.analyze)
  ├─ Pull photos from S3
  ├─ Pre-process (resize, EXIF strip, color normalize)
  ├─ Species: in-house ViT (primary) → fallback Gemini Vision
  ├─ Health: leaf-disease CNN + LLM second opinion
  ├─ Growth/biomass: tabular regressor (species, DBH proxy, height proxy)
  ├─ Persist tree_analysis row with model_version + confidence
  ├─ Trigger carbon.recalculate
  └─ Publish event analysis.completed → alerts service
```

### 5.3 Satellite monitoring (monthly cron)

```
Celery beat → satellite.monthly_scan
  ├─ Group trees into S2 tiles (lat/lon → MGRS)
  ├─ For each tile, fetch latest cloud-free scene (GEE/Sentinel Hub)
  ├─ Compute NDVI raster, clip to tree buffer (10–30 m)
  ├─ Store NDVI sample in tree_metrics_ts
  ├─ Detect change vs baseline → tree_loss / degradation alert
  └─ Publish satellite.updated
```

## 6. Data flow & event topics

| Topic | Producer | Consumers |
|---|---|---|
| `tree.registered` | API | AI worker, Satellite worker, Carbon worker, Notifications |
| `tree.updated` | API | Carbon worker, Search indexer |
| `analysis.completed` | AI worker | Carbon worker, Notifications, Dashboard cache |
| `satellite.updated` | Satellite worker | Notifications, Dashboard cache |
| `carbon.recalculated` | Carbon worker | Reports, Dashboard cache |
| `alert.created` | Notifications | Push (FCM), Email (SES), SMS (SNS) |

## 7. Scalability strategy

* **Read scaling** — RDS read replicas (cross-AZ), CDN edge cache for tiles.
* **Write scaling** — Partition `tree_metrics_ts` by month; shard hot tables
  by `organization_id` once a single org exceeds 10M trees.
* **Compute scaling** — EKS HPA on CPU / queue depth; spot node groups for AI workers.
* **Spatial scaling** — Pre-tile vector data using `ST_AsMVT` and cache in
  CloudFront (long TTL, invalidated on tree mutations within the tile).
* **AI scaling** — Triton Inference Server with dynamic batching; per-model
  autoscaling; OpenAI/Gemini used as overflow / fallback.
* **Satellite scaling** — Batch processing per S2 tile (one tile may cover
  thousands of trees) — cost ~O(tiles) not O(trees).

## 8. Multi-region & DR

* Primary: `ap-south-1` (Mumbai) — high tree density region for launch.
* Secondary: `eu-west-1` (Ireland) for EU customers + DR.
* RDS cross-region read replica; S3 CRR for media; Route 53 latency routing.
* RPO 5 min (PITR + replica), RTO 30 min (Pilot Light → Warm Standby promotion).
