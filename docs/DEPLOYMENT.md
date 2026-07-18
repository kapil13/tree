# BYOT — Production Deployment Guide (AWS)

## 1. Reference architecture

```
                 ┌──────────────────────────┐
   users ──TLS──▶│  CloudFront + WAF + ACM  │
                 └─────────────┬────────────┘
                               ▼
                 ┌──────────────────────────┐
                 │  ALB (Ingress, NLB-fronted │
                 │   via AWS Load Balancer    │
                 │   Controller on EKS)        │
                 └─────────────┬───────────────┘
                               ▼
        ┌──────────────────────────────────────────────────┐
        │                EKS (multi-AZ, multi-NG)          │
        │                                                  │
        │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
        │  │ frontend pod │  │ api pods     │  │ workers │ │
        │  │  next.js 15  │  │  fastapi      │  │ celery  │ │
        │  └──────────────┘  └──────────────┘  └─────────┘ │
        └──────────────────────────────────────────────────┘
                  │             │              │
                  ▼             ▼              ▼
            ┌─────────┐   ┌──────────┐   ┌────────────┐
            │  RDS    │   │ ElastiC  │   │  MSK Kafka │
            │ PostGIS │   │ Redis    │   │            │
            │ Multi-AZ│   │ Cluster  │   │  3 brokers │
            └─────────┘   └──────────┘   └────────────┘
                  │
                  ▼
            ┌─────────┐
            │   S3    │── images / tiles / reports / backups
            │ + KMS   │
            └─────────┘
```

## 2. Environments

| Env | Cluster | DB | Domain |
|---|---|---|---|
| dev | EKS shared, 2 small nodes | RDS db.t4g.medium | `dev.byot.earth` |
| staging | EKS dedicated, mirror prod scale ÷4 | RDS db.r7g.large | `staging.byot.earth` |
| prod | EKS dedicated, 3 AZ, mixed on-demand + spot NGs | RDS db.r7g.2xlarge multi-AZ | `byot.earth` |

## 3. Bringup with Terraform

```bash
cd infrastructure/terraform
terraform init -backend-config=env/dev.tfbackend
terraform workspace select dev || terraform workspace new dev
terraform apply -var-file=env/dev.tfvars
```

`terraform` modules included:

* `network/` — VPC, subnets, NAT, endpoints (S3, ECR, STS, KMS)
* `eks/` — EKS control plane, node groups (general + spot AI workers)
* `rds/` — PostgreSQL 16 + PostGIS, parameter group, subnet group
* `redis/` — ElastiCache Redis cluster
* `s3/` — buckets: `media`, `tiles`, `reports`, `tf-state`
* `iam/` — IRSA roles for backend, workers, external-secrets
* `cloudfront/` — distributions for media and tiles
* `route53/` — hosted zone + ACM certs
* `observability/` — managed Prometheus + managed Grafana + Loki S3

## 4. Application deployment

```bash
# Build + push containers
make build push REGISTRY=$ECR_URL TAG=$GIT_SHA

# Apply manifests
kubectl apply -k infrastructure/kubernetes/overlays/prod
```

Kubernetes manifests are organised as Kustomize overlays:

```
infrastructure/kubernetes/
├── base/
│   ├── backend-api.yaml
│   ├── backend-worker.yaml
│   ├── frontend.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── pdb.yaml
└── overlays/
    ├── dev/
    ├── staging/
    └── prod/
```

## 5. Database migrations

* Run as a Kubernetes Job on each release:

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: alembic-upgrade }
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: $ECR_URL/byot-backend:$GIT_SHA
          command: ["alembic","upgrade","head"]
      restartPolicy: Never
```

## 6. CI/CD pipeline

`.github/workflows/ci.yml` runs on every PR:

1. Backend: ruff, mypy, pytest with Postgres+PostGIS service.
2. Frontend: pnpm lint, tsc --noEmit, build.
3. Container scan (Trivy).
4. Conventional-commits validation.

`.github/workflows/cd.yml` runs on `main` push:

1. Build + push docker images to ECR with `$GIT_SHA` tag.
2. Update overlays/staging with new tag (commit via PR).
3. ArgoCD syncs to staging automatically; prod requires manual approval.

## 7. Observability

* Tracing: OpenTelemetry → AWS X-Ray + Tempo.
* Metrics: Prometheus scrape (FastAPI exposes `/metrics`).
* Logs: Loki collection via promtail; JSON structured.
* Errors: Sentry frontend + backend.
* SLOs: API availability 99.9 %, p95 latency 250 ms, error budget burn alerts.

## 8. Backups & DR

* RDS automated backups + PITR 14 days.
* Cross-region read replica (eu-west-1).
* S3 versioning + Object Lock for `reports`.
* Quarterly DR game-day; promotion runbook in `docs/runbooks/dr.md`.

## 9. Cost guardrails

* AWS Budgets per env; alerts at 50/80/100 %.
* Spot node groups for AI workers (label `workload=ai`, taint `spot=true`).
* CloudFront in front of all heavy GETs.
* S3 lifecycle: media to IA after 90 days, tiles to IA after 30 days.
