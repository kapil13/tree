from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int = 1
    page_size: int = 50
    total: int = 0


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict | None = None
    trace_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    env: str
    db: str = "unknown"


class LivenessResponse(BaseModel):
    status: str = "ok"
    version: str


class WorkerHealthResponse(BaseModel):
    status: str
    celery: dict
    recent_jobs: list[dict]
    failed_job_count: int


class IDResponse(BaseModel):
    id: str = Field(..., description="Resource identifier")
