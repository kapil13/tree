#!/usr/bin/env bash
# Platform Foundation E1 — nightly backup entrypoint (cron on VPS).
# Example crontab (02:30 UTC daily):
#   30 2 * * * /opt/aranyix/tree/scripts/backup/nightly-backup.sh >> /var/log/byot-backup.log 2>&1
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "=== BYOT nightly backup $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
"${ROOT}/scripts/backup/pg-dump.sh"
"${ROOT}/scripts/backup/mirror-minio.sh"
echo "=== done ==="
