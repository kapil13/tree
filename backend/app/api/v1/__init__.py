"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import (
    ai_scans,
    alerts,
    analysis,
    audit,
    auth,
    bhoonidhi,
    bioacoustic,
    carbon,
    cms,
    compliance,
    credits,
    dashboard,
    health,
    intelligence,
    plantation_fences,
    planting_programs,
    planting_projects,
    platform,
    reporting,
    reports,
    satellite,
    satellite_health,
    trees,
    uploads,
    verification,
    weather,
    webhooks,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(audit.router)
api_router.include_router(trees.router)
api_router.include_router(analysis.router)
api_router.include_router(ai_scans.router)
api_router.include_router(satellite.router)
api_router.include_router(satellite_health.router)
api_router.include_router(plantation_fences.router)
api_router.include_router(planting_programs.router)
api_router.include_router(planting_projects.router)
api_router.include_router(weather.router)
api_router.include_router(carbon.router)
api_router.include_router(compliance.router)
api_router.include_router(cms.public_router)
api_router.include_router(cms.admin_router)
api_router.include_router(platform.router)
api_router.include_router(credits.router)
api_router.include_router(dashboard.router)
api_router.include_router(intelligence.router)
api_router.include_router(alerts.router)
api_router.include_router(uploads.router)
api_router.include_router(bioacoustic.router)
api_router.include_router(bhoonidhi.router)
api_router.include_router(reports.router)
api_router.include_router(reporting.router)
api_router.include_router(webhooks.router)
api_router.include_router(verification.router)
api_router.include_router(verification.public_router)
