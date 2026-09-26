# Disaster recovery runbook (Platform Foundation E1)

## Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** (Recovery Point Objective) | **24 hours** | Nightly `pg_dump` + MinIO mirror; last good backup ≤ 24h old |
| **RTO** (Recovery Time Objective) | **4 hours** | Restore Postgres + MinIO on fresh KVM4, redeploy stack, smoke test |

## Backup schedule

On the Hostinger VPS (cron):

```bash
30 2 * * * /opt/aranyix/tree/scripts/backup/nightly-backup.sh >> /var/log/byot-backup.log 2>&1
```

Scripts (from repo root):

| Script | Purpose |
|--------|---------|
| `scripts/backup/pg-dump.sh` | Custom-format Postgres dump, 30-day local retention |
| `scripts/backup/mirror-minio.sh` | MinIO `byot-media` → local mirror → off-VPS (`BACKUP_S3_URI` or `BACKUP_RSYNC_TARGET`) |
| `scripts/backup/nightly-backup.sh` | Runs both |

Pre-migrate backup runs automatically in `infrastructure/hostinger/deploy.sh` before `alembic upgrade head`.

## Restore — PostgreSQL

1. Stop writers: `docker compose -f docker-compose.prod.yml stop backend worker beat`
2. Pick dump: `ls -lt /var/backups/byot/postgres/byot-*.dump | head -1`
3. Restore:

```bash
cd infrastructure/hostinger
source .env.production
DUMP=/var/backups/byot/postgres/byot-YYYYMMDDTHHMMSSZ.dump

docker compose -f docker-compose.prod.yml exec -T postgres \
  dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
docker compose -f docker-compose.prod.yml exec -T postgres \
  createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose -f docker-compose.prod.yml cp "$DUMP" postgres:/tmp/restore.dump
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --role="$POSTGRES_USER" /tmp/restore.dump
```

4. Start stack: `docker compose -f docker-compose.prod.yml up -d`
5. Verify: `curl -fsS https://${API_DOMAIN}/health/live`

## Restore — MinIO media

```bash
LOCAL_MIRROR=/var/backups/byot/minio
docker compose -f docker-compose.prod.yml run --rm minio-init \
  /bin/sh -c "
    mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" &&
    mc mirror --overwrite /mirror local/${S3_BUCKET_MEDIA:-byot-media}
  " -v "${LOCAL_MIRROR}:/mirror"
```

If off-VPS copy exists, sync down first:

```bash
aws s3 sync s3://your-bucket/byot-minio/ /var/backups/byot/minio/
```

## Quarterly restore drill

Every quarter (calendar reminder):

1. On a staging VM or isolated compose project, restore the latest production dump.
2. Run `alembic current` — head should match production.
3. Log in as demo user, open one project, download one evidence bundle.
4. Record date, dump file name, and pass/fail in this file:

| Quarter | Date | Dump used | Result | Notes |
|---------|------|-----------|--------|-------|
| Q3 2026 | | | | |

## Failure scenarios

| Scenario | Action |
|----------|--------|
| Bad migration | Restore pre-migrate dump from deploy; fix migration; redeploy |
| Disk full | `cleanup-docker-disk.sh`; expand volume; verify backup retention |
| MinIO corruption | Restore mirror; re-run presigned URL smoke on one tree photo |
| Full VPS loss | Provision KVM4, restore DNS, run DR restore steps, `./deploy.sh` |
