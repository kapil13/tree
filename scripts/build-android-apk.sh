#!/usr/bin/env bash
# Build BYOT Android release APK.
#
# Usage:
#   ./scripts/build-android-apk.sh
#   BYOT_API=https://api.aranyix.tech ./scripts/build-android-apk.sh
#   BYOT_API=http://192.168.1.42:8000 BYOT_ALLOW_CUSTOM_API=true ./scripts/build-android-apk.sh
#
# Output: mobile/build/app/outputs/flutter-apk/app-release.apk
#
# Prerequisites: Flutter 3.22+, Android SDK (Android Studio or cmdline-tools)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
BYOT_API="${BYOT_API:-https://api.aranyix.tech}"
BYOT_ALLOW_CUSTOM_API="${BYOT_ALLOW_CUSTOM_API:-false}"

if ! command -v flutter >/dev/null 2>&1; then
  echo "ERROR: Flutter not found. Install from https://docs.flutter.dev/get-started/install"
  echo "  macOS: brew install --cask flutter"
  exit 1
fi

echo "==> Flutter $(flutter --version | head -1)"
echo "==> API base URL baked into APK: $BYOT_API"
echo "==> BYOT_ALLOW_CUSTOM_API=$BYOT_ALLOW_CUSTOM_API"

cd "$MOBILE"

# Generate android/ + ios/ if missing (not committed to git)
if [[ ! -d android ]]; then
  echo "==> Generating Android project (flutter create)..."
  flutter create . --platforms=android,ios --org earth.byot
fi

# Cleartext HTTP is only needed for local http:// API targets.
# Release manifests keep usesCleartextTraffic=false; debug overlay enables it.
# Do not force cleartext onto the main (release) manifest.
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [[ -f "$MANIFEST" ]]; then
  if ! grep -q 'ACCESS_FINE_LOCATION' "$MANIFEST"; then
    echo "==> Adding location + camera permissions..."
    sed -i.bak 's|<manifest xmlns:android="http://schemas.android.com/apk/res/android">|<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET"/>\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n    <uses-permission android:name="android.permission.CAMERA"/>|' "$MANIFEST"
    rm -f "${MANIFEST}.bak"
  fi
fi

if [[ "$BYOT_API" == http://* ]]; then
  echo "==> Note: BYOT_API uses http — release cleartext remains disabled."
  echo "    Use a debug build, or https, for local HTTP APIs."
fi

flutter pub get

echo "==> Building release APK..."
flutter build apk --release \
  --dart-define="BYOT_API=$BYOT_API" \
  --dart-define="BYOT_ALLOW_CUSTOM_API=$BYOT_ALLOW_CUSTOM_API"

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
