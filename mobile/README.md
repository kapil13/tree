# BYOT Mobile (Flutter)

Field-first app for tree registration with offline-friendly capture.

## Mac setup (quick start)

### 1. Install Flutter

```bash
brew install --cask flutter
flutter doctor
```

### 2. Start the backend (repo root)

```bash
make up
make seed
curl http://localhost:8000/health
```

### 3. Pick a target

#### Option A — iOS Simulator (needs Xcode)

```bash
# Install Xcode from App Store, then:
sudo xcodebuild -license accept
open -a Simulator

cd mobile
flutter pub get
flutter run --dart-define=BYOT_API=http://localhost:8000
```

#### Option B — Android Emulator (no Xcode)

1. Install [Android Studio](https://developer.android.com/studio)
2. **Device Manager** → create a virtual device → start it
3. Run:

```bash
cd mobile
flutter pub get
flutter run --dart-define=BYOT_API=http://10.0.2.2:8000
```

(`10.0.2.2` is how the Android emulator reaches your Mac's `localhost`.)

### 4. Log in

After `make seed`:

- Email: `demo@byot.earth`
- Password: `byotdemo1234!`

## API URL reference

| Where you run the app | `BYOT_API` value |
|-----------------------|------------------|
| iOS Simulator on Mac | `http://localhost:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical phone (same Wi‑Fi) | `http://<your-mac-ip>:8000` |

Find Mac IP: `ipconfig getifaddr en0`

## Stack

* Flutter 3.22+ (Material 3)
* Riverpod (state), go_router (nav)
* dio + shared_preferences (network + token storage)
* geolocator (GPS), camera/image_picker (photos)
* mapbox_maps_flutter (maps), fl_chart (charts), qr_flutter (passports)

## Screens

splash · login · home (KPIs) · trees · add-tree · tree-detail · map ·
assistant · notifications · profile
