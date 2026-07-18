# BYOT Infrastructure (Terraform)

```bash
cd infrastructure/terraform
terraform init
export TF_VAR_db_password='ChooseAStrongPasswordHere!'
terraform workspace new dev || terraform workspace select dev
terraform apply -var-file=env/dev.tfvars
```

## Modules

| Module | What it creates |
|---|---|
| `network/` | VPC, public/private subnets across N AZs, IGW, NATs, route tables |
| `s3/` | Encrypted, versioned, private buckets for `media`, `tiles`, `reports`, `backups` |
| `rds/` | PostgreSQL 16 + PostGIS, encrypted, with PGI + automated backups |
| `redis/` | ElastiCache Redis cluster with replication and TLS |
| `eks/` | EKS control plane + general (on-demand) and AI (spot) node groups |

After `apply`, configure `kubectl`:

```bash
aws eks update-kubeconfig --name byot-dev --region ap-south-1
kubectl apply -k ../kubernetes/overlays/dev
```

## Production

Use `env/prod.tfvars`, set `TF_VAR_db_password` from Secrets Manager via your
deployment pipeline, and enable a remote backend (S3 + DynamoDB lock).
