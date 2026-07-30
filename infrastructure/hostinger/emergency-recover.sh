#!/usr/bin/env bash
# EMERGENCY: diagnose + reclaim disk + bring aranyix.tech back up.
# Safe for data: NEVER uses docker volume prune / compose down -v.
#
# Run on VPS as root:
#   cd /opt/aranyix/infrastructure/hostinger
#   chmod +x emergency-recover.sh
#   ./emergency-recover.sh
#
# Optional flags:
#   ./emergency-recover.sh --diagnose-only
#   ./emergency-recover.sh --yes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
DIAGNOSE_ONLY=0
ASSUME_YES=0

for arg in "$@"; do
  case "$arg" in
    --diagnose-only) DIAGNOSE_ONLY=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
  esac
done

hr() { echo "────────────────────────────────────────────────────────────"; }
section() { echo ""; hr; echo " $1"; hr; }

section "1) HOST DISK / RAM"
df -h /
df -i / || true
free -h || true

section "2) /var/lib/docker BREAKDOWN (this is where 90%+ of space usually is)"
if [[ -d /var/lib/docker ]]; then
  du -sh /var/lib/docker 2>/dev/null || sudo du -sh /var/lib/docker
  du -sh /var/lib/docker/* 2>/dev/null | sort -h || sudo du -sh /var/lib/docker/* | sort -h
else
  echo "No /var/lib/docker directory"
fi

section "3) CONTAINER LOG FILES (common silent 50–150 GB leak)"
if [[ -d /var/lib/docker/containers ]]; then
  echo "Top *-json.log by size:"
  find /var/lib/docker/containers -name '*-json.log' -printf '%s\t%p\n' 2>/dev/null \
    | sort -n \
    | tail -20 \
    | while IFS=$'\t' read -r size path; do
        id=$(basename "$(dirname "$path")")
        name=$(docker inspect --format '{{.Name}}' "$id" 2>/dev/null | sed 's#^/##' || echo "$id")
        gb=$(awk -v s="$size" 'BEGIN { printf "%.2f", s/1073741824 }')
        echo "  ${gb} GB  ${name}"
      done
  echo ""
  echo "Total container logs:"
  find /var/lib/docker/containers -name '*-json.log' -printf '%s\n' 2>/dev/null \
    | awk '{t+=$1} END {printf "  %.2f GB\n", t/1073741824}'
else
  echo "No containers log directory"
fi

section "4) DOCKER SYSTEM DF"
docker system df || true
echo ""
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.ID}}' || true

section "5) STACK STATUS"
if [[ -f "$ENV_FILE" ]]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -a || true
else
  docker ps -a || true
fi
echo ""
echo "Listening on 80/443:"
ss -tlnp 2>/dev/null | grep -E ':80|:443' || netstat -tlnp 2>/dev/null | grep -E ':80|:443' || true

section "6) WHY prune OFTEN DOES NOTHING"
cat <<'EOF'
  docker image prune -a only deletes images NOT used by any container.
  While your stack is UP, almost every image is "in use" → prune frees ~0 GB.
  Space usually lives in:
    A) /var/lib/docker/containers/*/...-json.log  (unbounded stdout logs)
    B) /var/lib/docker/overlay2                  (layers from failed/partial builds)
    C) /var/lib/docker/buildkit                  (build cache Docker sometimes hides)
  Fix = truncate logs + stop stack + docker system prune -a (keeps volumes).
EOF

if [[ "$DIAGNOSE_ONLY" == "1" ]]; then
  section "DIAGNOSE-ONLY — no changes made"
  echo "Re-run without --diagnose-only to reclaim + restart."
  exit 0
fi

section "7) CONFIRM RECOVERY"
if [[ "$ASSUME_YES" != "1" ]]; then
  read -r -p "Truncate logs, prune Docker images (KEEP volumes), restart stack? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

section "8) TRUNCATE ALL CONTAINER LOGS (instant free space, no data loss)"
if [[ -d /var/lib/docker/containers ]]; then
  find /var/lib/docker/containers -name '*-json.log' -exec truncate -s 0 {} \;
  echo "Truncated all *-json.log files."
else
  echo "Skipped (no containers dir)."
fi
df -h /

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE — cannot restart stack safely." >&2
  exit 1
fi

section "9) STOP STACK (volumes KEPT — postgres/minio NOT deleted)"
# Prefer profile-aware down so bioacoustic is included if present
COMPOSE_PROFILES="${COMPOSE_PROFILES:-bioacoustic}" \
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans || \
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans

section "10) PRUNE ALL UNUSED IMAGES / BUILD CACHE / STOPPED CONTAINERS"
# With stack down, ALL app images become unused and can be deleted.
docker container prune -f || true
docker image prune -a -f || true
docker builder prune -af || true
docker system prune -a -f || true
# Do NOT run: docker volume prune  (would wipe DB / MinIO)

section "11) DISK AFTER PRUNE"
df -h /
du -sh /var/lib/docker 2>/dev/null || sudo du -sh /var/lib/docker
docker system df || true

AVAIL_GB=$(df -P / | awk 'NR==2 {printf "%d", $4/1024/1024}')
if [[ "$AVAIL_GB" -lt 8 ]]; then
  echo ""
  echo "WARNING: only ~${AVAIL_GB} GB free. Build may fail again."
  echo "Check leftover paths:"
  du -sh /var/lib/docker/* 2>/dev/null | sort -h || true
fi

section "12) START CORE STACK (skip bioacoustic to save ~5 GB + RAM)"
# Start without bioacoustic profile — site recovery first
unset COMPOSE_PROFILES || true
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build \
  postgres redis minio minio-init backend frontend caddy worker beat

section "13) WAIT FOR API + MIGRATE"
TRIES=0
until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  curl -fsS http://localhost:8000/health/live >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [[ $TRIES -ge 60 ]]; then
    echo "Backend still unhealthy. Logs:"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail 80 backend || true
    exit 1
  fi
  sleep 3
done

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend alembic upgrade head

section "14) VERIFY"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -a
df -h /
echo ""
echo "Local health:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
  curl -fsS http://localhost:8000/health/live && echo " backend OK" || echo " backend FAIL"
curl -fsS -o /dev/null -w "caddy HTTP %{http_code}\n" http://127.0.0.1/ || true

section "DONE"
cat <<'EOF'
Expected after success:
  - /var/lib/docker roughly 15–30 GB (not 95–160 GB)
  - https://aranyix.tech responds again

If still full:
  du -sh /var/lib/docker/*
  # If overlay2 still huge after prune+down, reboot once then prune again:
  #   reboot
  #   docker system prune -a -f

Bioacoustic (optional, large image) — only when needed:
  COMPOSE_PROFILES=bioacoustic docker compose -f docker-compose.prod.yml --env-file .env.production up -d bioacoustic-worker
EOF
