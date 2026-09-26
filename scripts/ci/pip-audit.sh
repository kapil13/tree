#!/usr/bin/env bash
# Audit backend dependencies; ignore vulns pending major framework upgrades.
set -euo pipefail
cd "$(dirname "$0")/../../backend"

pip install pip-audit
# Remaining ignores: ecdsa (python-jose), starlette 1.x (needs FastAPI 0.140+),
# pyasn1 (python-jose transitive) — tracked for a dedicated dependency upgrade.
pip-audit -r requirements.txt \
  --ignore-vuln PYSEC-2026-1325 \
  --ignore-vuln PYSEC-2025-185 \
  --ignore-vuln PYSEC-2026-161 \
  --ignore-vuln PYSEC-2026-1942 \
  --ignore-vuln PYSEC-2026-2280 \
  --ignore-vuln PYSEC-2026-2281 \
  --ignore-vuln PYSEC-2026-248 \
  --ignore-vuln PYSEC-2026-249 \
  --ignore-vuln PYSEC-2026-2263 \
  --ignore-vuln PYSEC-2026-3455 \
  --ignore-vuln PYSEC-2026-3456 \
  --ignore-vuln PYSEC-2026-3457
