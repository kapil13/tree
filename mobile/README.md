# BYOT Mobile (Flutter) — Android APK

Field app for tree registration on **Android only** (no iOS app — see `ios/README.md`).

## Download the latest APK

**Current version:** `1.8.0+12` (see `pubspec.yaml`).

### Option A — GitHub Actions (recommended)

1. Open [Actions → Android APK](https://github.com/kapil13/tree/actions/workflows/android-apk.yml).
2. Open the latest **green** run on `main` (or click **Run workflow** to build now).
3. Scroll to **Artifacts** at the bottom of the run page.
4. Download **`aranyix-android-apk`** (zip).
5. Unzip and install **`aranyix-android-1.8.0.apk`** (or `app-release.apk`) on your phone.

Production API is baked in: `https://api.aranyix.tech`

For Google Play uploads, download **`aranyix-android-aab`** from the same run.

### Option B — Build on your machine

```bash
BYOT_API=https://api.aranyix.tech ./scripts/build-android-apk.sh
```

Output: `aranyix-android-1.8.0.apk` and `byot-release.apk` in the repo root.

## Build APK (Mac)

### 1. Install Flutter

```bash
brew install --cask flutter
flutter doctor --android-licenses   # accept all
```

Or: https://docs.flutter.dev/get-started/install/macos

### 2. Start backend

```bash
make dev-start
```

### 3. Build APK

**Android emulator** (API at host `localhost:8000`):

```bash
./scripts/build-android-apk.sh
```

**Physical phone** (replace with your Mac's LAN IP):

```bash
BYOT_API=http://192.168.1.42:8000 ./scripts/build-android-apk.sh
```

Find Mac IP: **System Settings → Network → Wi-Fi → Details**.

### 4. Install on phone

Copy `byot-release.apk` to the phone (AirDrop, USB, Google Drive) and open it.

Enable **Install unknown apps** for your file manager if prompted.

Or install via USB:

```bash
adb install -r byot-release.apk
```

## Sign in

Use your organization credentials. For local development, run `make seed-native` and see `backend/app/scripts/seed_demo.py` for seeded accounts (not shipped in release builds).

## API URL note

The API URL is **baked into the APK at build time** via `--dart-define=BYOT_API=...`.

Rebuild with a different `BYOT_API` if you change servers.

For production, use your public API:

```bash
BYOT_API=https://api.yourdomain.com ./scripts/build-android-apk.sh
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Phone can't reach API | Same Wi-Fi; use Mac LAN IP not `localhost`; backend on `0.0.0.0:8000` |
| Cleartext HTTP blocked | Build script enables `usesCleartextTraffic` for dev |
| `flutter: command not found` | Add Flutter to PATH or use `brew install --cask flutter` |
| Gradle / SDK errors | Run `flutter doctor` and install Android Studio SDK |

## Screens

splash · login · home · trees · add-tree (GPS) · tree-detail · map · assistant · notifications · profile

Uses the same FastAPI `/api/v1/*` endpoints as the web app.
