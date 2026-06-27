# BYOT — Bring Your Own Tree

> A production-grade ClimateTech SaaS platform that lets individuals, farmers,
> NGOs, corporates, and government agencies **register trees, monitor health,
> estimate carbon sequestration, validate plantations via satellite + AI, and
> generate carbon-credit-ready reports** at planetary scale.

[![Backend CI](https://img.shields.io/badge/backend-FastAPI-009688)](./backend)
[![Frontend](https://img.shields.io/badge/frontend-Next.js%2015-black)](./frontend)
[![Mobile](https://img.shields.io/badge/mobile-Flutter-02569B)](./mobile)
[![Infra](https://img.shields.io/badge/infra-AWS%20%7C%20Terraform%20%7C%20K8s-FF9900)](./infrastructure)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

---

## 1. Vision

BYOT (Bring Your Own Tree) is the operating system for distributed
reforestation. Anyone — from a homeowner with a single neem tree to a
government running a million-hectare afforestation program — can register
trees, prove they exist with satellite + computer-vision evidence, watch them
grow over time, and convert that growth into IPCC / Verra / Gold Standard
quality carbon credits.

**Design targets**

| Dimension | Target |
|---|---|
| Trees under management | 10M+ (Year 2), 100M+ (Year 5) |
| Concurrent users | 100k WAU MVP, 10M WAU at scale |
| Geographic coverage | Global, with 10 m Sentinel-2 grid resolution |
| Species coverage | 100+ at GA, 1,000+ at v2 |
| Carbon-credit standards | Verra VM0047 / VCS, Gold Standard, IPCC AR6 defaults |
| p95 API latency | < 250 ms |
| RPO / RTO | 5 min / 30 min |

---

## 2. Repository layout

```
byot/
├── backend/              # FastAPI + PostGIS + Celery + AI/satellite services
│   ├── app/
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # Next.js 15 (App Router) + Tailwind + shadcn/ui + Mapbox
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── mobile/               # Flutter (Android + iOS)
│   ├── lib/
│   └── pubspec.yaml
├── infrastructure/
│   ├── docker-compose.yml
│   ├── terraform/        # AWS VPC, EKS, RDS PostGIS, S3, CloudFront, IAM
│   └── kubernetes/       # Helm-friendly raw manifests
├── .github/workflows/    # CI/CD (lint, test, build, push, deploy)
└── docs/                 # Architecture, ERD, API, AI, Satellite, Carbon, Roadmap
```

---

## 3. MVP modules

| # | Module | Status in this repo |
|---|---|---|
| 1 | User Management (Auth, OTP, OAuth, RBAC) | ✅ Backend models + endpoints, JWT, Google OAuth scaffold |
| 2 | Tree Registration (Geo, photos, passport, QR) | ✅ Models + endpoints + QR/PDF generator |
| 3 | AI Tree Analysis (species, health, growth) | ✅ Pluggable service layer with OpenAI/Gemini adapters + stub CV pipeline |
| 4 | Satellite Monitoring (Sentinel-2, Landsat, GEE) | ✅ NDVI engine + Sentinel/GEE adapter + change detection |
| 5 | Carbon Calculator (AGB, BGB, CO₂e, credits) | ✅ Full Python engine with IPCC + Verra factors |
| 6 | Tree Digital Passport (QR, PDF) | ✅ ReportLab passport renderer |
| 7 | Dashboard | ✅ Next.js dashboard with KPIs, charts, map |
| 8 | Map View (Mapbox + PostGIS clustering) | ✅ Vector tile endpoint + Mapbox component |
| 9 | Alerts (push/email/SMS) | ✅ Multi-channel notifier scaffold |
| 10 | Reporting (Tree, Plantation, Carbon, ESG) | ✅ PDF/Excel exporters |

---

## 4. Tech stack

**Web** — Next.js 15 (App Router, RSC), React 19, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Mapbox GL JS, Recharts.

**Mobile** — Flutter 3 (Android + iOS), Riverpod, go_router, dio, geolocator, camera, mapbox_maps_flutter.

**Backend** — FastAPI, Python 3.12, SQLAlchemy 2 (async), Alembic, Celery + Redis, Pydantic v2, GeoAlchemy2.

**Data** — PostgreSQL 16 + PostGIS 3.4, TimescaleDB-ready time-series tables, S3 (Parquet) cold storage.

**Storage / CDN** — AWS S3 + CloudFront for images / tiles / report artifacts.

**Infra** — AWS (EKS, RDS, S3, SQS, MSK Kafka, CloudFront, Route 53, ACM, KMS), Terraform, Docker, Kubernetes, ArgoCD-ready manifests.

**Auth** — JWT (access + refresh), OAuth2 (Google), TOTP/SMS OTP, RBAC.

**AI layer** — OpenAI (GPT-4o / GPT-4o-mini), Google Gemini, custom Vision Transformer for species (PyTorch + ONNX served via Triton), tabular models for biomass/growth.

**Satellite layer** — Sentinel-2 (Copernicus / Sentinel Hub), Landsat 8/9 (USGS), Google Earth Engine, optional Planet Labs.

**Observability** — OpenTelemetry, Prometheus, Grafana, Loki, Sentry.

---

## 5. Quick start (local dev)

```bash
# 1. Clone
git clone https://github.com/<your-org>/byot.git && cd byot

# 2. (Optional) Backend env — template is backend/.env.example, not repo root
cp backend/.env.example backend/.env

# 3. Bring up Postgres+PostGIS, Redis, MinIO, backend, frontend
docker compose -f infrastructure/docker-compose.yml up --build

# 4. Run migrations + seed
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.scripts.seed_demo

# 5. Visit
open http://localhost:3000       # Web dashboard
open http://localhost:8000/docs  # Swagger / OpenAPI
```

---

## 6. Documentation index

| Doc | What's inside |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | C4 system context, container, component diagrams |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Full ERD, DDL, indexes, PostGIS strategy, partitioning |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | REST + OpenAPI overview, examples, error model |
| [docs/AI_SERVICE.md](docs/AI_SERVICE.md) | Model registry, inference pipeline, prompts, eval |
| [docs/SATELLITE_MONITORING.md](docs/SATELLITE_MONITORING.md) | Sentinel/Landsat/GEE pipeline, NDVI, change detection |
| [docs/CARBON_ENGINE.md](docs/CARBON_ENGINE.md) | AGB / BGB equations, IPCC factors, Verra VM0047 mapping |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, RBAC, encryption, OWASP ASVS mapping |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | AWS reference architecture + Terraform + Helm flow |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Sprint plan and release roadmap |
| [docs/UI_WIREFRAMES.md](docs/UI_WIREFRAMES.md) | Web + mobile wireframes (textual + ASCII) |

---

## 7. License

Apache-2.0 — see [LICENSE](LICENSE).
