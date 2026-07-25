"""Pending organization member invitations."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class OrganizationInvite(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "organization_invites"
    __table_args__ = (
        UniqueConstraint("invite_token", name="organization_invites_token_uq"),
        Index("organization_invites_org_idx", "organization_id"),
        Index("organization_invites_email_idx", "email"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(32))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    org_role: Mapped[str] = mapped_column(String(32), nullable=False)
    platform_role: Mapped[str] = mapped_column(String(32), nullable=False)
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    invite_token: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    organization = relationship("Organization", back_populates="invites")
    inviter = relationship("User", foreign_keys=[invited_by])
