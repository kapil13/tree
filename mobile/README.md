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

### 3. iOS uses CocoaPods (not Swift Package Manager)

This project disables Flutter's Swift Package Manager integration to avoid an Xcode 26 SPM crash when resolving plugin dependencies.

```bash
flutter config --no-enable-swift-package-manager
cd mobile
flutter pub get
cd ios && pod install && cd ..
```

If you previously opened the project in Xcode and hit an SPM error, clean stale artifacts first:

```bash
cd mobile
flutter clean
rm -rf ios/Pods ios/Podfile.lock ios/.symlinks ios/Flutter/ephemeral
rm -rf ~/Library/Developer/Xcode/DerivedData/*
flutter pub get
cd ios && pod install && cd ..
```

Always build with `flutter run` (or open `ios/Runner.xcworkspace` after `pod install`), not `Runner.xcodeproj` alone.

`ios/Runner/Info.plist` includes location, camera, and photo usage descriptions required by geolocator and image capture plugins.

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

The demo user is created by `make seed` (run once after `make up`).

### 6. HTTP 401 on the simulator

| Cause | Fix |
|-------|-----|
| Backend not running | `cd tree && make up` |
| Demo user missing | `make seed` |
| Stale saved token | **Profile → Sign out**, or delete the app from the simulator and reinstall |
| Wrong API URL | `flutter run --dart-define=BYOT_API=http://localhost:8000` |

Quick check from your Mac terminal:

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@byot.earth","password":"byotdemo1234!"}'
```

You should get JSON with `access_token`. If not, fix the backend before debugging the app.

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

* Flutter 3.22+ (Material 3), CocoaPods for iOS
* Riverpod, go_router, dio, geolocator, image_picker

## Screens

splash · login · home · trees · add-tree (GPS + photos) · tree-detail · map · assistant · notifications · profile
