#!/usr/bin/env bash
# Build BYOT Android release APK.
#
# Usage:
#   ./scripts/build-android-apk.sh
#   BYOT_API=https://api.aranyix.tech ./scripts/build-android-apk.sh
#   BYOT_API=http://192.168.1.42:8000 BYOT_ALLOW_CUSTOM_API=true ./scripts/build-android-apk.sh
#
# Release signing (optional — copy android/keystore.properties.example):
#   cp mobile/android/keystore.properties.example mobile/android/keystore.properties
#   # or export ANDROID_STORE_FILE, ANDROID_STORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
#
# FCM push (optional):
#   cp mobile/android/app/google-services.json.example mobile/android/app/google-services.json
#   BYOT_FCM_ENABLED=true ./scripts/build-android-apk.sh
#   BUILD_AAB=1 ./scripts/build-android-apk.sh   # also build Play Store AAB
#
# Output: mobile/build/app/outputs/flutter-apk/app-release.apk
#         mobile/build/app/outputs/bundle/release/app-release.aab (when BUILD_AAB=1)
#
# Prerequisites: Flutter 3.22+, Android SDK (Android Studio or cmdline-tools)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
BYOT_API="${BYOT_API:-https://api.aranyix.tech}"
BYOT_ALLOW_CUSTOM_API="${BYOT_ALLOW_CUSTOM_API:-false}"
BYOT_FCM_ENABLED="${BYOT_FCM_ENABLED:-false}"
BUILD_AAB="${BUILD_AAB:-false}"

if ! command -v flutter >/dev/null 2>&1; then
  echo "ERROR: Flutter not found. Install from https://docs.flutter.dev/get-started/install"
  echo "  macOS: brew install --cask flutter"
  exit 1
fi

echo "==> Flutter $(flutter --version | head -1)"
echo "==> API base URL baked into APK: $BYOT_API"
echo "==> BYOT_ALLOW_CUSTOM_API=$BYOT_ALLOW_CUSTOM_API"
echo "==> BYOT_FCM_ENABLED=$BYOT_FCM_ENABLED"
echo "==> BUILD_AAB=$BUILD_AAB"

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

DART_DEFINES=(
  --dart-define="BYOT_API=$BYOT_API"
  --dart-define="BYOT_ALLOW_CUSTOM_API=$BYOT_ALLOW_CUSTOM_API"
)
if [[ "$BYOT_FCM_ENABLED" == "true" ]]; then
  if [[ ! -f android/app/google-services.json ]]; then
    echo "ERROR: BYOT_FCM_ENABLED=true requires android/app/google-services.json"
    echo "  Copy android/app/google-services.json.example and fill in your Firebase project."
    exit 1
  fi
  DART_DEFINES+=(--dart-define=BYOT_FCM_ENABLED=true)
fi

echo "==> Building release APK..."
flutter build apk --release "${DART_DEFINES[@]}"

APK="$MOBILE/build/app/outputs/flutter-apk/app-release.apk"
VERSION=$(grep '^version:' "$MOBILE/pubspec.yaml" | awk '{print $2}' | cut -d+ -f1)
NAMED_APK="$MOBILE/build/app/outputs/flutter-apk/aranyix-android-${VERSION}.apk"
if [[ -f "$APK" ]]; then
  cp "$APK" "$ROOT/byot-release.apk"
  cp "$APK" "$ROOT/aranyix-android-${VERSION}.apk"
  cp "$APK" "$NAMED_APK"
  echo ""
  echo "SUCCESS — Aranyix Android v${VERSION}"
  echo "  APK: $APK"
  echo "  Copy: $ROOT/aranyix-android-${VERSION}.apk"
  echo "  API:  $BYOT_API"
  ls -lh "$APK"
else
  echo "ERROR: APK not found at $APK"
  exit 1
fi

if [[ "$BUILD_AAB" == "true" || "$BUILD_AAB" == "1" ]]; then
  echo "==> Building release AAB (Play Store)..."
  flutter build appbundle --release "${DART_DEFINES[@]}"
  AAB="$MOBILE/build/app/outputs/bundle/release/app-release.aab"
  NAMED_AAB="$MOBILE/build/app/outputs/bundle/release/aranyix-android-${VERSION}.aab"
  if [[ -f "$AAB" ]]; then
    cp "$AAB" "$ROOT/aranyix-android-${VERSION}.aab"
    cp "$AAB" "$NAMED_AAB"
    echo "  AAB: $AAB"
    echo "  Copy: $ROOT/aranyix-android-${VERSION}.aab"
    ls -lh "$AAB"
  else
    echo "ERROR: AAB not found at $AAB"
    exit 1
  fi
fi
