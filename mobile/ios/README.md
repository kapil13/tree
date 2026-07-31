# iOS — deferred

The iOS target is intentionally **not scaffolded** until the Android app is complete and frozen.

See [ANDROID_FREEZE_IOS_ROADMAP.md](ANDROID_FREEZE_IOS_ROADMAP.md) for the release gate and migration steps.

When ready:

```bash
cd mobile
flutter create --platforms=ios .
```

Then configure signing, `Runner/Info.plist` URL schemes, and APNs for the shared `POST /api/v1/devices/register` endpoint.
