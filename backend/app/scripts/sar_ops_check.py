"""SAR production readiness check (GEE or Copernicus Sentinel Hub).

Run inside the backend or worker container:

    python -m app.scripts.sar_ops_check
    python -m app.scripts.sar_ops_check --sample 28.61 77.21
    python -m app.scripts.sar_ops_check --list-fences
"""

from __future__ import annotations

import argparse
import asyncio
import json

from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.services.satellite.gee_sar_sampler import _initialize_gee, gee_python_available
from app.services.satellite.plantation import has_sentinel_credentials
from app.services.satellite.sar_service import (
    get_sar_service,
    has_sar_credentials,
    is_sar_provider_record,
    live_sar_provider_name,
)


def _print_section(title: str) -> None:
    print(f"\n== {title} ==")


def check_config() -> bool:
    _print_section("Configuration")
    ok = True
    print(f"SAR_ENABLED={settings.sar_enabled}")
    print(f"SAR_PROVIDER={settings.sar_provider}")
    print(f"live_data_provider={live_sar_provider_name()}")
    print(f"SENTINEL_HUB_CLIENT_ID={'set' if settings.sentinel_hub_client_id else 'missing'}")
    print(f"GEE_SERVICE_ACCOUNT_JSON={'set' if settings.gee_service_account_json else 'missing'}")
    if settings.sar_provider == "sentinel_hub" and not has_sentinel_credentials():
        print("FAIL: SAR_PROVIDER=sentinel_hub but Sentinel Hub credentials are missing")
        ok = False
    if settings.sar_provider == "gee" and not settings.gee_service_account_json:
        print("FAIL: SAR_PROVIDER=gee but GEE_SERVICE_ACCOUNT_JSON is empty")
        ok = False
    if not settings.sar_enabled:
        print("WARN: SAR_ENABLED=false — scans disabled at config level")
    return ok


def check_live_provider() -> bool:
    if settings.sar_provider == "sentinel_hub":
        _print_section("Copernicus Sentinel Hub")
        sh_ok = has_sentinel_credentials()
        print(f"Sentinel Hub credentials: {sh_ok}")
        if not sh_ok:
            print("FAIL: set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET")
            return False
        print(f"has_sar_credentials(): {has_sar_credentials()}")
        return has_sar_credentials()

    if settings.sar_provider == "gee":
        _print_section("Earth Engine")
        pkg = gee_python_available()
        print(f"earthengine-api import: {pkg}")
        if not pkg:
            print("FAIL: pip package earthengine-api not installed")
            return False
        init = _initialize_gee()
        print(f"GEE initialize: {init}")
        if not init:
            print("FAIL: GEE init failed — register GCP project at Earth Engine signup")
            return False
        print(f"has_sar_credentials(): {has_sar_credentials()}")
        return has_sar_credentials()

    _print_section("Live provider")
    print("SAR_PROVIDER=stub — using deterministic stub (no live credentials required)")
    return True


async def check_providers() -> None:
    _print_section("Recent SAR records by provider")
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(PlantationSatelliteRecord.provider, func.count())
            .where(PlantationSatelliteRecord.provider.isnot(None))
            .group_by(PlantationSatelliteRecord.provider)
            .order_by(func.count().desc())
            .limit(10)
        )
        rows = res.all()
        if not rows:
            print("No plantation SAR records yet.")
            return
        for provider, count in rows:
            live = "live" if is_sar_provider_record(provider) and "stub" not in provider else "stub/other"
            print(f"  {provider}: {count} ({live})")


async def list_fences(limit: int) -> None:
    _print_section(f"Plantation fences (max {limit})")
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(PlantationFence).limit(limit))).scalars().all()
        for fence in rows:
            print(f"  {fence.id}  {fence.name}")


async def sample_point(lat: float, lon: float) -> bool:
    _print_section(f"Live sample @ {lat}, {lon}")
    svc = get_sar_service()
    print(f"service: {svc.name}")
    sample = await svc.sample_point(lat, lon)
    print(json.dumps(
        {
            "provider": sample.provider,
            "scene_id": sample.scene_id,
            "pipeline": sample.pipeline,
            "wetland_probability": sample.wetland_probability,
            "ground_moisture_index": sample.ground_moisture_index,
        },
        indent=2,
        default=str,
    ))
    live = sample.provider not in ("nisar-sar-stub",) and "stub" not in sample.provider
    if settings.sar_provider in {"gee", "sentinel_hub"} and not live:
        print(f"WARN: {settings.sar_provider} configured but sample fell back to stub")
        return False
    print("OK: sample complete")
    return True


async def async_main(args: argparse.Namespace) -> int:
    ok = check_config() and check_live_provider()
    await check_providers()
    if args.list_fences:
        await list_fences(args.list_fences)
    if args.sample:
        lat, lon = args.sample
        ok = await sample_point(lat, lon) and ok
    _print_section("Summary")
    if ok:
        print("SAR ops check PASSED")
        return 0
    print("SAR ops check FAILED — see messages above")
    return 1


def main() -> None:
    parser = argparse.ArgumentParser(description="SAR production readiness check")
    parser.add_argument("--list-fences", type=int, metavar="N", help="List up to N fence IDs")
    parser.add_argument("--sample", nargs=2, type=float, metavar=("LAT", "LON"), help="Run a live SAR sample")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(async_main(args)))


if __name__ == "__main__":
    main()
