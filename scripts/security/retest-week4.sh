#!/usr/bin/env bash
# Week 4 security regression — automated + production smoke checks.
# Usage: ./scripts/security/retest-week4.sh [APP_DOMAIN] [API_DOMAIN]
set -euo pipefail

APP_DOMAIN="${1:-aranyix.tech}"
API_DOMAIN="${2:-api.aranyix.tech}"
APP_URL="https://${APP_DOMAIN}"
API_URL="https://${API_DOMAIN}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0
FAIL=0
SKIP=0

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; FAIL=$((FAIL + 1)); }
skip() { echo "  SKIP  $1"; SKIP=$((SKIP + 1)); }

echo "=== Security retest — ${APP_DOMAIN} / ${API_DOMAIN} ==="
echo

echo "--- Backend unit tests (authz, scope, CMS helpers) ---"
cd "${ROOT}/backend"
if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi
pytest -q \
  tests/test_launch_security.py \
  tests/test_week1_security.py \
  tests/test_s3_key_ownership.py \
  tests/test_data_scope.py \
  tests/test_mvt_scope.py \
  tests/test_p0_security.py \
  tests/test_gmail_email_otp.py \
  && pass "Backend security pytest suite" || fail "Backend security pytest suite"

echo
echo "--- Frontend CMS sanitize tests (H7) ---"
cd "${ROOT}/frontend"
npm test -- --run lib/cms-sanitize.test.ts >/dev/null 2>&1 \
  && pass "CMS sanitize unit tests" || fail "CMS sanitize unit tests"

echo
echo "--- Production smoke (curl) ---"

# H6 — dashboard gated without session cookie
dash_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-redirs 0 "${APP_URL}/dashboard" 2>/dev/null || true)"
dash_code="${dash_code:-000}"
if [[ "${dash_code}" == "307" || "${dash_code}" == "302" || "${dash_code}" == "308" ]]; then
  pass "H6 dashboard redirects when logged out (${dash_code})"
else
  fail "H6 dashboard redirects when logged out (got ${dash_code})"
fi

# M10 — HSTS + CSP
headers="$(curl -sSI "${APP_URL}" 2>/dev/null || true)"
if echo "${headers}" | grep -qi "strict-transport-security"; then
  pass "M10 HSTS header present"
else
  fail "M10 HSTS header missing"
fi
if echo "${headers}" | grep -qi "content-security-policy"; then
  pass "M10 CSP header present"
else
  fail "M10 CSP header missing"
fi

# L7 — integrations health requires auth (401, not 500)
int_code="$(curl -sS -o /dev/null -w '%{http_code}' "${API_URL}/health/integrations" 2>/dev/null || echo "000")"
if [[ "${int_code}" == "401" ]]; then
  pass "L7 /health/integrations returns 401 without token (${int_code})"
elif [[ "${int_code}" == "500" ]]; then
  fail "L7 /health/integrations returns 500 (deploy fix for get_current_user Request arg)"
else
  fail "L7 /health/integrations unexpected status ${int_code}"
fi

# M9 — Redis not exposed publicly
redis_code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 "http://${APP_DOMAIN}:6379/" 2>/dev/null || true)"
redis_code="${redis_code:-000}"
if [[ "${redis_code}" == "000" ]]; then
  pass "M9 Redis port not reachable from outside (connection refused/timeout)"
else
  fail "M9 Redis may be exposed (HTTP ${redis_code} on :6379)"
fi

# Public health live
live_code="$(curl -sS -o /dev/null -w '%{http_code}' "${API_URL}/health/live" 2>/dev/null || echo "000")"
if [[ "${live_code}" == "200" ]]; then
  pass "API /health/live returns 200"
else
  fail "API /health/live returns ${live_code}"
fi

echo
echo "--- Code inspection (static) ---"

# H8 — mobile release API host + cleartext
if grep -q "defaultValue: 'https://api.aranyix.tech'" "${ROOT}/mobile/lib/src/api/api_base_url.dart"; then
  pass "H8 mobile default API host is api.aranyix.tech"
else
  fail "H8 mobile default API host not production"
fi
if grep -q 'usesCleartextTraffic="false"' "${ROOT}/mobile/android/app/src/main/AndroidManifest.xml"; then
  pass "H8 mobile release cleartext disabled"
else
  fail "H8 mobile release cleartext not disabled"
fi

# H9 — mobile logout calls API
if grep -q "'/auth/logout'" "${ROOT}/mobile/lib/src/api/api_client.dart"; then
  pass "H9 mobile logout POST /auth/logout"
else
  fail "H9 mobile logout endpoint missing"
fi

# L1 web — bbox + page_size cap
if grep -q "page_size: 150" "${ROOT}/frontend/components/trees-map.tsx" \
  && grep -q "bbox:" "${ROOT}/frontend/components/trees-map.tsx"; then
  pass "L1 web map uses bbox + page_size 150"
else
  fail "L1 web map bbox/page_size"
fi

# L1 mobile — bbox in map fetch (updated in security signoff)
if grep -q "bbox" "${ROOT}/mobile/lib/src/screens/map_screen.dart" \
  || grep -q "mapTreesProvider\|listTrees.*bbox" "${ROOT}/mobile/lib/src/providers.dart"; then
  pass "L1 mobile map uses viewport bbox"
else
  fail "L1 mobile map viewport bbox not wired"
fi

echo
echo "=== Summary: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped ==="
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
