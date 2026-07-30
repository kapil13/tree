#!/usr/bin/env bash
# Find exactly what is using space under /var/lib/docker (images vs logs vs layers).
# Run on the VPS from: infrastructure/hostinger/
set -euo pipefail

echo "═══════════════════════════════════════════════════════════════"
echo " Deep disk audit — $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "==> Filesystem"
df -h /

echo ""
echo "==> /var/lib/docker breakdown"
if [[ -d /var/lib/docker ]]; then
  sudo du -sh /var/lib/docker/* 2>/dev/null | sort -h
else
  echo "No /var/lib/docker"
fi

echo ""
echo "==> Largest container log files (*-json.log) — often 50–150 GB when unlimited"
if [[ -d /var/lib/docker/containers ]]; then
  sudo find /var/lib/docker/containers -name '*-json.log' -printf '%s\t%p\n' 2>/dev/null \
    | sort -n \
    | tail -15 \
    | awk '{
        size=$1; $1=""; path=$0
        gsub(/^[ \t]+/, "", path)
        if (size > 1073741824) printf "%.1f GB\t%s\n", size/1073741824, path
        else if (size > 1048576) printf "%.1f MB\t%s\n", size/1048576, path
        else printf "%.0f KB\t%s\n", size/1024, path
      }' || true
else
  echo "(no container logs dir)"
fi

echo ""
echo "==> Map log files → container names"
for id in $(sudo ls /var/lib/docker/containers 2>/dev/null || true); do
  log="/var/lib/docker/containers/$id/${id}-json.log"
  if [[ -f "$log" ]]; then
    size=$(sudo stat -c%s "$log" 2>/dev/null || echo 0)
    name=$(docker inspect --format '{{.Name}}' "$id" 2>/dev/null | tr -d '/' || echo "unknown")
    if (( size > 10485760 )); then
      printf "%10.1f MB  %s\n" "$(echo "$size / 1048576" | bc -l)" "$name"
    fi
  fi
done | sort -rn | head -15 || true

echo ""
echo "==> Docker reported usage"
docker system df -v 2>/dev/null || docker system df

echo ""
echo "==> If logs are huge, run: ./cleanup-docker-disk.sh -y --truncate-logs"
echo "==> If overlay2 is huge after prune, run: ./cleanup-docker-disk.sh -y --full-reclaim"
