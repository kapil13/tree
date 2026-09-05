# BYOT — Satellite Monitoring Architecture

## Implementation status (backend)

| Component | Status |
|-----------|--------|
| `StubSatelliteService` | ✅ default when no credentials |
| `SentinelHubSatelliteService` | ✅ Copernicus Data Space Statistical API |
| `POST /api/v1/satellite/scan` | ✅ on-demand NDVI sample |
| `GET /api/v1/satellite-monitoring/{tree_id}` | ✅ monthly NDVI series |
| Celery `run_satellite_scan` | ✅ called after tree registration |
| Google Earth Engine adapter | 🔜 planned |

Enable real Sentinel-2 data in `backend/.env`:

```bash
SENTINEL_HUB_CLIENT_ID=<from CDSE dashboard → User settings → OAuth clients>
SENTINEL_HUB_CLIENT_SECRET=<secret>
```

Register at [Copernicus Data Space](https://dataspace.copernicus.eu/), create an OAuth client, then restart the API and Celery worker.

---

## 1. Goals

* Independently verify each registered tree exists and is growing.
* Detect tree loss, deforestation, canopy degradation at plantation scale.
* Build a monthly NDVI / EVI time-series per tree, attributable to a scene.

## 2. Data sources

| Provider | Resolution | Revisit | Use |
|---|---|---|---|
| Sentinel-2 (ESA Copernicus) | 10 m (B2/B3/B4/B8) | ~5 days | Primary NDVI / EVI |
| Landsat 8 / 9 (USGS) | 30 m | ~16 days | Long historical baseline (since 2013) |
| Google Earth Engine | aggregator | n/a | Server-side processing without raw downloads |
| Planet Labs (optional) | 3 m | daily | Premium tier (corporates) |

## 3. Pipeline overview

```
                 ┌────────────────────────────┐
                 │  Celery beat (monthly cron)│
                 └─────────────┬──────────────┘
                               ▼
            ┌─────────────────────────────────────┐
            │ Group trees by Sentinel-2 MGRS tile │
            └─────────────────────────────────────┘
                               ▼
            ┌─────────────────────────────────────┐
            │ For each tile, fetch best scene     │
            │  (cloud % < 20, most recent)        │
            │  via Sentinel Hub / GEE             │
            └─────────────────────────────────────┘
                               ▼
            ┌─────────────────────────────────────┐
            │ Compute NDVI = (B8 - B4) / (B8 + B4)│
            │ Compute EVI  (full formula)         │
            └─────────────────────────────────────┘
                               ▼
            ┌─────────────────────────────────────┐
            │ For each tree in tile:              │
            │   - buffer 10..30m around point     │
            │   - sample raster                   │
            │   - persist satellite_records row   │
            │   - upsert tree_metrics_ts          │
            └─────────────────────────────────────┘
                               ▼
            ┌─────────────────────────────────────┐
            │ Change detection vs 12-mo baseline  │
            │ ΔNDVI < -0.15 → alert(degradation)  │
            │ NDVI < 0.10  → alert(possible loss) │
            └─────────────────────────────────────┘
```

## 4. Tile bucketing

To avoid one Sentinel-2 download per tree, we group trees into MGRS tiles
(Sentinel-2's native ~100 km × 100 km grid). Cost scales with **tiles
containing trees**, not number of trees.

```python
def tree_to_mgrs(lat, lon) -> str:
    # 5-char MGRS for S2 (e.g. "43PCM")
    ...
```

## 5. Tree presence validation

For a freshly registered tree:

1. Pull a 30 × 30 m chip centred on the point from the latest cloud-free
   Sentinel-2 scene.
2. If NDVI ≥ 0.25 → `presence_confirmed = True`.
3. If NDVI < 0.10 and the area is classified barren (ESA WorldCover) →
   flag as `suspect` and notify the user.

Note: a single tree often does not appear on a 10 m pixel; presence is
treated as *probabilistic*. For plantations (≥ 20 trees / 0.1 ha) the signal
is far stronger and Verra-grade.

## 6. Change detection

* Baseline = trailing 12-month mean NDVI for the pixel.
* Δ = current − baseline.
* `degradation` if −0.30 ≤ Δ < −0.15 for ≥ 2 consecutive scenes.
* `loss`        if Δ < −0.30 or NDVI < 0.10 for ≥ 2 consecutive scenes.
* Optional cross-check with Hansen Global Forest Change for plantations.

## 7. GEE adapter (preferred)

Server-side processing means we never download multi-GB rasters. Example
GEE call (executed via the `earthengine-api` Python client):

```python
img = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
       .filterBounds(geom)
       .filterDate(start, end)
       .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
       .sort('system:time_start', False)
       .first())
ndvi = img.normalizedDifference(['B8','B4']).rename('NDVI')
stats = ndvi.reduceRegion(ee.Reducer.mean(), geom, 10)
```

## 8. Vector tile overlay

Satellite NDVI rasters are converted to PNG XYZ tiles and served via
CloudFront. Per-tree NDVI samples are exposed through the same `/tiles`
endpoint as vector overlays consumed by the Mapbox client.

## 9. Cost controls

* Sentinel Hub credits are pre-purchased; per-org quotas enforced.
* GEE has generous research quotas; we cap concurrent processing units.
* Premium (Planet 3 m daily) is gated behind paid tiers.
