# BYOT Mobile (Flutter)

Field-first app for tree registration with offline-friendly capture.

## Mac setup (quick start)

### 1. Install Flutter + Xcode

```bash
# Flutter (Homebrew or https://docs.flutter.dev/get-started/install/macos)
flutter doctor
```

- Install **Xcode** from App Store
- **Xcode → Settings → Platforms** → download **iOS**
- `sudo xcodebuild -license accept`
- `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`

### 2. Pull the repo (includes `ios/` + `android/`)

This repo **includes** `ios/` and `android/` — you do **not** need `flutter create`.

```bash
git pull
cd mobile
flutter pub get
```

### 3. No Podfile? That is normal

**Flutter 3.22+** often uses **Swift Package Manager** and does **not** ship a `Podfile` until some plugins need CocoaPods.

- Do **not** run `pod install` if `ios/Podfile` is missing
- Run `flutter run` — Flutter creates `Podfile` automatically if needed

### 4. Start backend + run app

```bash
# Terminal 1 — repo root
make up && make seed

# Terminal 2
open -a Simulator
cd mobile
flutter devices
flutter run -d "iPhone 17" --dart-define=BYOT_API=http://localhost:8000
```

Use the exact simulator name from `flutter devices`.

### 5. Log in

- Email: `demo@byot.earth`
- Password: `byotdemo1234!`

## API URL reference

| Target | `BYOT_API` |
|--------|------------|
| iOS Simulator | `http://localhost:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical phone | `http://<mac-ip>:8000` |

## If `flutter create` says "Wrote 0 files"

Your `ios/` folder already exists. Skip `flutter create` and run:

```bash
cd mobile
flutter pub get
flutter run -d "iPhone 17" --dart-define=BYOT_API=http://localhost:8000
```

## Stack

* Flutter 3.22+ (Material 3)
* Riverpod, go_router, dio, geolocator, image_picker, mapbox_maps_flutter

## Screens

splash · login · home · trees · add-tree · tree-detail · map · assistant · notifications · profile
