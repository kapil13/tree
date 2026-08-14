"""Personal data export for DPDP access/portability requests."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.privacy import ConsentRecord, DataSubjectRequest, GrievanceTicket
from app.models.tree import Tree
from app.models.user import User


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


async def build_user_data_export(db: AsyncSession, user: User) -> dict[str, Any]:
    trees_res = await db.execute(select(Tree).where(Tree.owner_user_id == user.id).limit(500))
    trees = trees_res.scalars().all()

    consents_res = await db.execute(
        select(ConsentRecord).where(ConsentRecord.user_id == user.id)
    )
    consents = consents_res.scalars().all()

    dsr_res = await db.execute(
        select(DataSubjectRequest).where(DataSubjectRequest.user_id == user.id)
    )
    dsrs = dsr_res.scalars().all()

    grievance_res = await db.execute(
        select(GrievanceTicket).where(GrievanceTicket.user_id == user.id)
    )
    grievances = grievance_res.scalars().all()

    return {
        "export_version": "1.0",
        "exported_at": datetime.now(UTC).isoformat(),
        "profile": {
            "id": str(user.id),
            "email": user.email,
            "phone": user.phone,
            "full_name": user.full_name,
            "role": user.role,
            "org_role": user.org_role,
            "organization_id": str(user.organization_id) if user.organization_id else None,
            "created_at": _serialize(user.created_at),
            "notification_preferences": user.notification_preferences,
        },
        "consents": [
            {
                "purpose": c.purpose,
                "policy_version": c.policy_version,
                "granted_at": _serialize(c.granted_at),
                "withdrawn_at": _serialize(c.withdrawn_at),
            }
            for c in consents
        ],
        "trees": [
            {
                "id": str(t.id),
                "public_code": t.public_code,
                "species_text": t.species_text,
                "planted_at": _serialize(t.planted_at),
                "status": t.status,
                "current_carbon_kg": float(t.current_carbon_kg or 0),
            }
            for t in trees
        ],
        "data_subject_requests": [
            {
                "id": str(r.id),
                "request_type": r.request_type,
                "status": r.status,
                "created_at": _serialize(r.created_at),
            }
            for r in dsrs
        ],
        "grievances": [
            {
                "id": str(g.id),
                "subject": g.subject,
                "status": g.status,
                "created_at": _serialize(g.created_at),
            }
            for g in grievances
        ],
    }


def export_as_json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, indent=2, default=str).encode("utf-8")
