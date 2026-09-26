#!/usr/bin/env bash
# Platform Foundation E1 — PostgreSQL logical backup (pg_dump custom format).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT}/infrastructure/hostinger/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${ROOT}/infrastructure/hostinger/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/byot/postgres}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
OUT="${BACKUP_DIR}/byot-${STAMP}.dump"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

echo "==> pg_dump → $OUT"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-byot}" -d "${POSTGRES_DB:-byot}" -Fc \
  > "$OUT"

find "$BACKUP_DIR" -name 'byot-*.dump' -type f -mtime +"${RETENTION}" -delete 2>/dev/null || true
echo "OK: backup complete ($(du -h "$OUT" | awk '{print $1}'))"
