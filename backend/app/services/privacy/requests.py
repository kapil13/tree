"""Data subject requests and grievance tickets."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.privacy import DataSubjectRequest, GrievanceTicket
from app.models.user import User
from app.schemas.privacy import DataSubjectRequestOut, GrievanceOut


async def create_data_request(
    db: AsyncSession,
    *,
    user: User,
    request_type: str,
    notes: str | None = None,
) -> DataSubjectRequestOut:
    row = DataSubjectRequest(
        user_id=user.id,
        request_type=request_type,
        status="pending",
        notes=notes,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(row)
    await db.flush()
    return DataSubjectRequestOut.model_validate(row)


async def list_data_requests(
    db: AsyncSession, user_id: uuid.UUID, *, limit: int = 20
) -> list[DataSubjectRequestOut]:
    res = await db.execute(
        select(DataSubjectRequest)
        .where(DataSubjectRequest.user_id == user_id)
        .order_by(DataSubjectRequest.created_at.desc())
        .limit(limit)
    )
    return [DataSubjectRequestOut.model_validate(r) for r in res.scalars().all()]


async def create_grievance(
    db: AsyncSession,
    *,
    user: User,
    subject: str,
    body: str,
) -> GrievanceOut:
    row = GrievanceTicket(
        user_id=user.id,
        subject=subject,
        body=body,
        status="open",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(row)
    await db.flush()
    return GrievanceOut.model_validate(row)


async def list_grievances(
    db: AsyncSession, user_id: uuid.UUID, *, limit: int = 20
) -> list[GrievanceOut]:
    res = await db.execute(
        select(GrievanceTicket)
        .where(GrievanceTicket.user_id == user_id)
        .order_by(GrievanceTicket.created_at.desc())
        .limit(limit)
    )
    return [GrievanceOut.model_validate(r) for r in res.scalars().all()]
