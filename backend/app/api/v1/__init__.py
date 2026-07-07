"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import alerts, analysis, auth, carbon, dashboard, plantation_fences, reports, satellite, trees

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(trees.router)
api_router.include_router(analysis.router)
api_router.include_router(satellite.router)
api_router.include_router(plantation_fences.router)
api_router.include_router(carbon.router)
api_router.include_router(dashboard.router)
api_router.include_router(alerts.router)
api_router.include_router(reports.router)
