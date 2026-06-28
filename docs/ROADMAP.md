# BYOT — Development Roadmap & Sprint Plan

We use 2-week sprints. The plan below describes scope by sprint, not
calendar time, so it can be rebased onto any team's velocity.

## Phase 0 — Foundations (Sprints 1–2)

* Monorepo, CI/CD skeleton, Terraform bootstrap (network, ECR, S3, RDS).
* Backend skeleton: FastAPI, SQLAlchemy, Alembic, JWT auth, RBAC.
* Database schema baseline (users, organizations, trees, images, species).
* Frontend skeleton: Next.js 15, Tailwind, shadcn/ui, auth pages.
* Mobile skeleton: Flutter app shell, navigation, auth.

## Phase 1 — Tree registration MVP (Sprints 3–4)

* Module 1 — User Management with OTP + Google OAuth.
* Module 2 — Tree registration (GPS, photos, presigned S3, QR, passport PDF).
* Module 6 — Digital passport generator.
* Dashboard v1 with KPI tiles and trees-list.
* Basic Mapbox view with tree pins.

**Exit criteria** — A field user can register a tree with photos from
mobile, see it on the web map, and download its passport PDF.

## Phase 2 — AI + Carbon MVP (Sprints 5–6)

* Module 3 — AI Tree Analysis (species, health, growth) using OpenAI +
  Gemini adapters; in-house ViT remains in `byot-ml` repo and is plugged in
  via Triton when ready.
* Module 5 — Carbon engine v1 (species allometric, IPCC defaults).
* AI assistant (`/assistant/query`).
* Recommendations engine v1.

**Exit criteria** — Every tree shows a species, health badge, biomass
estimate, and a carbon estimate with confidence.

## Phase 3 — Satellite (Sprints 7–8)

* Module 4 — Satellite monitoring (Sentinel-2 via GEE), monthly cron.
* NDVI time-series + change detection.
* Tree presence validation badge.
* Satellite overlays on Mapbox.

**Exit criteria** — Each tree has at least one satellite record after a
month; degradation alerts are firing on test plantations.

## Phase 4 — Dashboard, Map, Alerts, Reports (Sprints 9–10)

* Modules 7, 8, 9, 10 polished to production quality.
* PDF + Excel report exports.
* Email + Push + SMS notification channels.
* Public passport pages (read-only, share-link).

## Phase 5 — Credit-readiness (Sprints 11–12)

* Verra VM0047 methodology mapping; buffer pool logic.
* Plantation polygons + stratification.
* Audit-grade evidence bundles (photos + satellite + model versions zipped).
* Outbound webhooks.

## Phase 6 — Scale & marketplace (Sprints 13+)

* Multi-region (eu-west-1 secondary), DR drill.
* Connector for carbon marketplace partners.
* Biodiversity monitoring (acoustic + species sightings).
* In-house ViT (`byot-vit-species`) promoted to primary.

---

## Per-sprint deliverables template

| Sprint | Theme | Backend | Frontend | Mobile | Infra |
|---|---|---|---|---|---|
| S1 | Bootstrap | Auth skeleton | Login / signup pages | App shell, auth | Terraform VPC + ECR |
| S2 | Foundations | RBAC, audit logs | Layout, sidebar | Map + GPS plumbing | EKS + RDS |
| S3 | Trees | CRUD + S3 presign | Tree list / detail | Add tree wizard | CloudFront |
| S4 | Passport | PDF + QR | Passport viewer | Share QR | — |
| S5 | AI | Adapters + worker | Analysis viewer | Trigger analysis | Triton on EKS |
| S6 | Carbon | Engine v1 + endpoints | Carbon panels | Carbon screen | — |
| S7 | Satellite | GEE pipeline | NDVI charts | Satellite badge | Cron job |
| S8 | Change det. | Alerts pipeline | Alerts inbox | Push notifs | SES, SNS, FCM |
| S9 | Dashboard | Aggregation queries | KPI dashboards | Home dashboard | — |
| S10| Reports | PDF/Excel jobs | Reports list | Download reports | — |
| S11| Credits | Verra mapping | Credit panel | Credit screen | — |
| S12| Hardening | Load tests, perf | a11y polish | offline-first | DR drill |
