"""Scheme-driven bioacoustic monitoring plan lifecycle."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_monitoring_plan import BioacousticMonitoringPlan
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.services.bioacoustic.bio_monitoring_protocols import protocol_for_scheme


def _plan_status(next_due_at: datetime, recordings_in_cycle: int, min_required: int) -> str:
    now = datetime.now(UTC)
    if recordings_in_cycle >= min_required and next_due_at > now:
        return "on_track"
    if next_due_at < now:
        return "overdue"
    if next_due_at <= now + timedelta(days=7):
        return "due_soon"
    return "on_track"


async def ensure_monitoring_plans_for_project(
    db: AsyncSession,
    project: PlantingProject,
) -> list[BioacousticMonitoringPlan]:
    protocol = protocol_for_scheme(project.scheme_code)
    fences = list(
        (
            await db.execute(select(PlantationFence).where(PlantationFence.project_id == project.id))
        ).scalars().all()
    )
    targets: list[PlantationFence | None] = [None]
    targets.extend(fences)

    created: list[BioacousticMonitoringPlan] = []
    now = datetime.now(UTC)
    for fence in targets:
        fence_id = fence.id if fence else None
        existing = (
            await db.execute(
                select(BioacousticMonitoringPlan).where(
                    BioacousticMonitoringPlan.project_id == project.id,
                    BioacousticMonitoringPlan.fence_id == fence_id,
                )
            )
        ).scalar_one_or_none()
        if existing:
            continue
        plan = BioacousticMonitoringPlan(
            project_id=project.id,
            fence_id=fence_id,
            scheme_code=project.scheme_code,
            protocol_key=protocol["protocol_key"],
            label=protocol["label"] if fence is None else f"{protocol['label']} — {fence.name}",
            cadence_days=int(protocol["cadence_days"]),
            min_recordings_per_cycle=int(protocol["min_recordings_per_cycle"]),
            season_class=str(protocol.get("season_class") or "unspecified"),
            next_due_at=now + timedelta(days=int(protocol["cadence_days"])),
            status="on_track",
            metadata_={
                "guidance": protocol.get("guidance"),
                "duration_min_seconds": protocol.get("duration_min_seconds"),
                "duration_max_seconds": protocol.get("duration_max_seconds"),
            },
        )
        db.add(plan)
        created.append(plan)
    if created:
        await db.flush()
    return created


async def list_monitoring_plans(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> list[dict[str, Any]]:
    plans = list(
        (
            await db.execute(
                select(BioacousticMonitoringPlan)
                .where(BioacousticMonitoringPlan.project_id == project_id)
                .order_by(BioacousticMonitoringPlan.next_due_at.asc())
            )
        ).scalars().all()
    )
    out: list[dict[str, Any]] = []
    for plan in plans:
        cycle_start = plan.last_completed_at or (plan.next_due_at - timedelta(days=plan.cadence_days))
        rec_stmt = select(BioacousticRecording).where(
            BioacousticRecording.status == "analyzed",
            BioacousticRecording.recorded_at >= cycle_start,
        )
        if plan.fence_id:
            rec_stmt = rec_stmt.where(BioacousticRecording.plantation_fence_id == plan.fence_id)
        else:
            rec_stmt = rec_stmt.join(
                PlantationFence, PlantationFence.id == BioacousticRecording.plantation_fence_id
            ).where(PlantationFence.project_id == plan.project_id)
        recordings_in_cycle = len(list((await db.execute(rec_stmt)).scalars().all()))
        status = _plan_status(plan.next_due_at, recordings_in_cycle, plan.min_recordings_per_cycle)
        plan.status = status
        out.append(
            {
                "id": str(plan.id),
                "project_id": str(plan.project_id),
                "fence_id": str(plan.fence_id) if plan.fence_id else None,
                "scheme_code": plan.scheme_code,
                "protocol_key": plan.protocol_key,
                "label": plan.label,
                "cadence_days": plan.cadence_days,
                "min_recordings_per_cycle": plan.min_recordings_per_cycle,
                "season_class": plan.season_class,
                "next_due_at": plan.next_due_at.isoformat(),
                "last_completed_at": plan.last_completed_at.isoformat() if plan.last_completed_at else None,
                "status": status,
                "recordings_in_cycle": recordings_in_cycle,
                "guidance": (plan.metadata_ or {}).get("guidance"),
            }
        )
    await db.flush()
    return out


async def complete_monitoring_cycle(
    db: AsyncSession,
    plan: BioacousticMonitoringPlan,
) -> BioacousticMonitoringPlan:
    now = datetime.now(UTC)
    plan.last_completed_at = now
    plan.next_due_at = now + timedelta(days=plan.cadence_days)
    plan.status = "on_track"
    await db.flush()
    return plan
