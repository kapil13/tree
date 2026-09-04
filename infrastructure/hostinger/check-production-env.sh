#!/usr/bin/env bash
# Validate .env.production before deploy — catches P0 boot-guard failures early.
# Source after loading ENV_FILE (set -a; source .env.production; set +a).
set -euo pipefail

_fail=0

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]] || [[ "$value" == CHANGE_ME* ]]; then
    echo "  MISSING: $name"
    _fail=1
  else
    echo "  OK: $name"
  fi
}

echo "==> Required production env vars"
for var in \
  POSTGRES_PASSWORD JWT_SECRET SESSION_COOKIE_SECRET MINIO_ROOT_PASSWORD \
  APP_DOMAIN API_DOMAIN CORS_ORIGINS REDIS_PASSWORD \
  EVIDENCE_SIGNING_KEY TURNSTILE_SITE_KEY TURNSTILE_SECRET_KEY; do
  require_var "$var"
done

if [[ "${AUTH_ALLOW_DEV_OTP:-false}" == "true" ]]; then
  echo "  INVALID: AUTH_ALLOW_DEV_OTP=true (backend refuses to start in production)"
  _fail=1
else
  echo "  OK: AUTH_ALLOW_DEV_OTP not enabled"
fi

if [[ -n "${JWT_SECRET:-}" ]] && [[ ${#JWT_SECRET} -lt 32 ]]; then
  echo "  INVALID: JWT_SECRET must be at least 32 characters"
  _fail=1
fi

if [[ -n "${REDIS_PASSWORD:-}" ]] && [[ "$REDIS_PASSWORD" == *'$('* ]]; then
  echo "  INVALID: REDIS_PASSWORD contains shell substitution — use a literal hex value"
  echo "           Generate: openssl rand -hex 32"
  _fail=1
fi

if [[ -n "${EVIDENCE_SIGNING_KEY:-}" ]] && [[ "$EVIDENCE_SIGNING_KEY" != CHANGE_ME* ]]; then
  if ! python3 -c "
import base64, os, sys
raw = os.environ.get('EVIDENCE_SIGNING_KEY', '').strip()
try:
    seed = base64.b64decode(raw)
except Exception:
    sys.exit(1)
sys.exit(0 if len(seed) >= 32 else 1)
" 2>/dev/null; then
    echo "  INVALID: EVIDENCE_SIGNING_KEY must be base64 encoding a 32-byte Ed25519 seed"
    echo "           Generate: python3 -c \"import os,base64; print(base64.b64encode(os.urandom(32)).decode())\""
    _fail=1
  else
    echo "  OK: EVIDENCE_SIGNING_KEY format"
  fi
fi

razorpay_on=false
if [[ -n "${RAZORPAY_KEY_ID:-}" && -n "${RAZORPAY_KEY_SECRET:-}" ]]; then
  razorpay_on=true
fi
if [[ "$razorpay_on" == true ]] && [[ -z "${RAZORPAY_WEBHOOK_SECRET:-}" ]]; then
  echo "  MISSING: RAZORPAY_WEBHOOK_SECRET (required when Razorpay keys are set)"
  _fail=1
elif [[ "$razorpay_on" == true ]]; then
  echo "  OK: Razorpay webhook secret"
fi

if [[ $_fail -ne 0 ]]; then
  echo ""
  echo "Fix .env.production, then redeploy. Backend boot guards (P0) exit before /health/live responds."
  exit 1
fi

echo "==> Production env preflight passed"
