"""Platform admin CSV exports."""

from __future__ import annotations

import csv
import io
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.services.platform.admin import query_org_members_for_admin, query_platform_users
from app.services.platform.billing import query_payment_orders

MAX_EXPORT_ROWS = 5000


async def export_platform_users_csv(
    db: AsyncSession,
    *,
    search: str = "",
    role: str | None = None,
    is_active: bool | None = None,
) -> str:
    items, _ = await query_platform_users(
        db,
        search=search,
        role=role,
        is_active=is_active,
        page=1,
        page_size=MAX_EXPORT_ROWS,
        max_page_size=MAX_EXPORT_ROWS,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "email",
            "full_name",
            "role",
            "organization_name",
            "org_role",
            "is_org_admin",
            "is_active",
            "is_verified",
            "last_login_at",
            "created_at",
            "enrolled_program_codes",
        ]
    )
    for row in items:
        writer.writerow(
            [
                str(row["id"]),
                row["email"],
                row["full_name"],
                row["role"],
                row.get("organization_name") or "",
                row.get("org_role") or "",
                row.get("is_org_admin", False),
                row["is_active"],
                row["is_verified"],
                row["last_login_at"].isoformat() if row.get("last_login_at") else "",
                row["created_at"].isoformat(),
                ",".join(row.get("enrolled_program_codes") or []),
            ]
        )
    return buf.getvalue()


async def export_platform_organizations_csv(
    db: AsyncSession,
    *,
    search: str = "",
    is_active: bool | None = None,
) -> str:
    stmt = select(Organization).order_by(Organization.name)
    if search.strip():
        q = f"%{search.strip()}%"
        stmt = stmt.where(Organization.name.ilike(q) | Organization.slug.ilike(q))
    if is_active is not None:
        stmt = stmt.where(Organization.is_active.is_(is_active))
    stmt = stmt.limit(MAX_EXPORT_ROWS)
    orgs = (await db.execute(stmt)).scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "name", "slug", "type", "is_active", "owner_user_id", "created_at"])
    for org in orgs:
        writer.writerow(
            [
                str(org.id),
                org.name,
                org.slug,
                org.type,
                org.is_active,
                str(org.owner_user_id) if org.owner_user_id else "",
                org.created_at.isoformat(),
            ]
        )
    return buf.getvalue()


async def export_platform_org_members_csv(db: AsyncSession, org_id: uuid.UUID) -> str:
    members, _ = await query_org_members_for_admin(
        db, org_id, page=1, page_size=MAX_EXPORT_ROWS, max_page_size=MAX_EXPORT_ROWS
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "email",
            "full_name",
            "role",
            "org_role",
            "is_org_admin",
            "is_active",
            "last_login_at",
            "created_at",
        ]
    )
    for member in members:
        writer.writerow(
            [
                str(member["id"]),
                member["email"],
                member["full_name"],
                member["role"],
                member.get("org_role") or "",
                member.get("is_org_admin", False),
                member["is_active"],
                member["last_login_at"].isoformat() if member.get("last_login_at") else "",
                member["created_at"].isoformat(),
            ]
        )
    return buf.getvalue()


async def export_platform_orders_csv(
    db: AsyncSession,
    *,
    status: str | None = None,
) -> str:
    items, _ = await query_payment_orders(
        db,
        status=status,
        page=1,
        page_size=MAX_EXPORT_ROWS,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "user_id",
            "user_email",
            "user_full_name",
            "sku",
            "credits_granted",
            "amount_paise",
            "currency",
            "status",
            "razorpay_order_id",
            "razorpay_payment_id",
            "paid_at",
            "created_at",
        ]
    )
    for row in items:
        writer.writerow(
            [
                str(row["id"]),
                str(row["user_id"]),
                row["user_email"],
                row["user_full_name"],
                row["sku"],
                row["credits_granted"],
                row["amount_paise"],
                row["currency"],
                row["status"],
                row.get("razorpay_order_id") or "",
                row.get("razorpay_payment_id") or "",
                row["paid_at"].isoformat() if row.get("paid_at") else "",
                row["created_at"].isoformat(),
            ]
        )
    return buf.getvalue()
