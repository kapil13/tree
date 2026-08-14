#!/usr/bin/env bash
# Diagnose and recover unhealthy byot-prod-redis-1 on the VPS.
# Handles: corrupted AOF (common after disk-full), auth healthcheck, disk pressure.
#
# Run from: infrastructure/hostinger/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
REDIS_CONTAINER="byot-prod-redis-1"
REDIS_VOLUME="byot-prod_redis-data"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

redis_logs() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs redis --tail "${1:-80}" 2>&1 || true
}

redis_healthy() {
  docker inspect "$REDIS_CONTAINER" --format '{{.State.Health.Status}}' 2>/dev/null | grep -q healthy
}

echo "==> Redis container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps redis 2>/dev/null || true

echo ""
echo "==> Disk space"
df -h / /var/lib/docker 2>/dev/null || df -h /

DISK_PCT="$(df / | tail -1 | awk '{print $5}' | tr -d '%')"
if [[ "$DISK_PCT" -ge 95 ]]; then
  echo "WARN: Root disk is ${DISK_PCT}% full — free space first: ./cleanup-docker-disk.sh"
fi

echo ""
echo "==> REDIS_PASSWORD configured?"
if [[ -z "${REDIS_PASSWORD:-}" ]] || [[ "${REDIS_PASSWORD}" == CHANGE_ME* ]]; then
  echo "ERROR: Set REDIS_PASSWORD in $ENV_FILE (use: openssl rand -hex 32)"
  exit 1
fi
echo "  OK (length ${#REDIS_PASSWORD})"

echo ""
echo "==> Redis logs (last 80 lines)"
LOGS="$(redis_logs 80)"
echo "$LOGS"

AOF_CORRUPT=false
if echo "$LOGS" | grep -q "Bad file format reading the append only file"; then
  AOF_CORRUPT=true
  echo ""
  echo "==> Detected corrupted AOF (often caused by earlier disk-full crash)"
fi

repair_aof() {
  local manifest="/data/appendonlydir/appendonly.aof.manifest"
  echo ""
  echo "==> Stopping Redis before AOF repair..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop redis 2>/dev/null || docker stop "$REDIS_CONTAINER" 2>/dev/null || true

  if ! docker volume inspect "$REDIS_VOLUME" >/dev/null 2>&1; then
    echo "ERROR: volume $REDIS_VOLUME not found. Run: docker volume ls | grep redis"
    exit 1
  fi

  echo "==> Backing up appendonlydir..."
  BACKUP="/tmp/redis-aof-backup-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP"
  docker run --rm \
    -v "${REDIS_VOLUME}:/data:ro" \
    -v "${BACKUP}:/backup" \
    redis:7-alpine \
    sh -c 'if [ -d /data/appendonlydir ]; then cp -a /data/appendonlydir /backup/; else exit 2; fi'
  echo "  Backup: ${BACKUP}/appendonlydir"

  echo "==> Diagnosing AOF..."
  docker run --rm -i \
    -v "${REDIS_VOLUME}:/data:ro" \
    redis:7-alpine \
    redis-check-aof "$manifest" || true

  echo "==> Repairing AOF (truncates corrupt tail of last INCR file)..."
  printf 'y\n' | docker run --rm -i \
    -v "${REDIS_VOLUME}:/data" \
    redis:7-alpine \
    redis-check-aof --fix "$manifest"

  echo "==> Verifying repaired AOF..."
  docker run --rm -i \
    -v "${REDIS_VOLUME}:/data:ro" \
    redis:7-alpine \
    redis-check-aof "$manifest"

  echo "==> Starting Redis..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d redis
}

if [[ "$AOF_CORRUPT" == true ]]; then
  repair_aof
else
  echo ""
  echo "==> Attempting redis recreate (keeps redis-data volume)"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate redis
fi

echo ""
echo "Waiting for healthy (up to 90s)..."
TRIES=0
until redis_healthy; do
  TRIES=$((TRIES + 1))
  if [[ $TRIES -ge 18 ]]; then
    if [[ "$AOF_CORRUPT" != true ]]; then
      echo ""
      echo "Recreate did not help — trying AOF repair..."
      repair_aof
      TRIES=0
      until redis_healthy; do
        TRIES=$((TRIES + 1))
        if [[ $TRIES -ge 18 ]]; then
          break
        fi
        sleep 5
      done
    fi
    if ! redis_healthy; then
      echo ""
      echo "Redis still unhealthy. Options:"
      echo "  1. Inspect logs: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs redis --tail 50"
      echo "  2. Manual AOF fix (see recover-redis.sh comments / Redis docs)"
      echo "  3. LAST RESORT — wipe queue/cache data:"
      echo "       docker compose -f $COMPOSE_FILE --env-file $ENV_FILE stop redis"
      echo "       docker volume rm $REDIS_VOLUME"
      echo "       docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d"
      redis_logs 40
      exit 1
    fi
    break
  fi
  sleep 5
done

echo ""
echo "==> Redis healthy — starting dependent services"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend worker beat frontend caddy

echo ""
echo "Recovery complete."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
