#!/usr/bin/env bash
# Build BYOT Android release APK.
#
# Usage:
#   ./scripts/build-android-apk.sh
#   BYOT_API=http://192.168.1.42:8000 ./scripts/build-android-apk.sh
#
# Output: mobile/build/app/outputs/flutter-apk/app-release.apk
#
# Prerequisites: Flutter 3.22+, Android SDK (Android Studio or cmdline-tools)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
BYOT_API="${BYOT_API:-http://10.0.2.2:8000}"

if ! command -v flutter >/dev/null 2>&1; then
  echo "ERROR: Flutter not found. Install from https://docs.flutter.dev/get-started/install"
  echo "  macOS: brew install --cask flutter"
  exit 1
fi

echo "==> Flutter $(flutter --version | head -1)"
echo "==> API base URL baked into APK: $BYOT_API"
echo "    (Physical phone on same Wi-Fi: use your Mac LAN IP, e.g. http://192.168.1.x:8000)"

cd "$MOBILE"

# Generate android/ + ios/ if missing (not committed to git)
if [[ ! -d android ]]; then
  echo "==> Generating Android project (flutter create)..."
  flutter create . --platforms=android,ios --org earth.byot
fi

# Allow HTTP API for local dev (Android 9+ blocks cleartext by default)
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [[ -f "$MANIFEST" ]]; then
  if ! grep -q 'usesCleartextTraffic' "$MANIFEST"; then
    echo "==> Enabling cleartext HTTP for local API..."
    sed -i.bak 's/<application/<application android:usesCleartextTraffic="true"/' "$MANIFEST"
    rm -f "${MANIFEST}.bak"
  fi
  if ! grep -q 'ACCESS_FINE_LOCATION' "$MANIFEST"; then
    echo "==> Adding location + camera permissions..."
    sed -i.bak 's|<manifest xmlns:android="http://schemas.android.com/apk/res/android">|<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET"/>\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n    <uses-permission android:name="android.permission.CAMERA"/>|' "$MANIFEST"
    rm -f "${MANIFEST}.bak"
  fi
fi

flutter pub get

echo "==> Building release APK..."
flutter build apk --release \
  --dart-define="BYOT_API=$BYOT_API"

APK="$MOBILE/build/app/outputs/flutter-apk/app-release.apk"
if [[ -f "$APK" ]]; then
  cp "$APK" "$ROOT/byot-release.apk"
  echo ""
  echo "SUCCESS"
  echo "  APK: $APK"
  echo "  Copy: $ROOT/byot-release.apk"
  ls -lh "$APK"
else
  echo "ERROR: APK not found at $APK"
  exit 1
fi
