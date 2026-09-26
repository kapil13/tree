#!/usr/bin/env bash
# Platform Foundation E1 — mirror MinIO media bucket to local + optional off-VPS storage.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT}/infrastructure/hostinger/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${ROOT}/infrastructure/hostinger/.env.production}"
LOCAL_MIRROR="${LOCAL_MIRROR:-/var/backups/byot/minio}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

BUCKET="${S3_BUCKET_MEDIA:-byot-media}"
mkdir -p "$LOCAL_MIRROR"

echo "==> mc mirror MinIO/${BUCKET} → ${LOCAL_MIRROR}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm \
  -v "${LOCAL_MIRROR}:/mirror:rw" \
  minio-init \
  /bin/sh -ec "
    mc alias set local http://minio:9000 \"${MINIO_ROOT_USER}\" \"${MINIO_ROOT_PASSWORD}\"
    mc mirror --overwrite local/${BUCKET} /mirror
  "

find "$LOCAL_MIRROR" -type f -mtime +"${RETENTION}" -delete 2>/dev/null || true

if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  echo "==> aws s3 sync → ${BACKUP_S3_URI}"
  AWS_PROFILE="${BACKUP_AWS_PROFILE:-default}" aws s3 sync "$LOCAL_MIRROR" "$BACKUP_S3_URI" --delete
elif [[ -n "${BACKUP_RSYNC_TARGET:-}" ]]; then
  echo "==> rsync → ${BACKUP_RSYNC_TARGET}"
  rsync -az --delete "$LOCAL_MIRROR/" "${BACKUP_RSYNC_TARGET}/"
else
  echo "NOTE: set BACKUP_S3_URI or BACKUP_RSYNC_TARGET for off-VPS copy"
fi

echo "OK: MinIO mirror complete"
