# BYOT Mobile (Flutter)

Field-first app for tree registration with offline-friendly capture.

```bash
flutter pub get
flutter run --dart-define=BYOT_API=http://10.0.2.2:8000  # Android emulator
# or
flutter run --dart-define=BYOT_API=http://localhost:8000 # iOS simulator
```

## Stack
* Flutter 3.22+ (Material 3)
* Riverpod (state), go_router (nav)
* dio + shared_preferences (network + token storage)
* geolocator (GPS), camera/image_picker (photos)
* mapbox_maps_flutter (maps), fl_chart (charts), qr_flutter (passports)

## Screens
splash · login · home (KPIs) · trees · add-tree · tree-detail · map ·
assistant · notifications · profile

> The mobile app talks to the same FastAPI `/api/v1/*` endpoints as the web app.
> Demo login (after `python -m app.scripts.seed_demo`):
> `demo@byot.earth / byotdemo1234!`.
