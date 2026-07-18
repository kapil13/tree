# BYOT Mobile (Flutter) — Android APK

Field app for tree registration on Android (and iOS).

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

## Demo login

After `make seed-native`:

- Email: `demo@byot.earth`
- Password: `byotdemo1234!`

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
