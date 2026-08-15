"""Independent verifier sample workflow."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class VerificationSample(UUIDPKMixin, Base):
    __tablename__ = "verification_samples"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    sample_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(32), nullable=False, default="random")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    items = relationship(
        "VerificationItem",
        back_populates="sample",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("verification_samples_project_idx", "project_id"),)


class VerificationItem(UUIDPKMixin, Base):
    __tablename__ = "verification_items"

    sample_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("verification_samples.id", ondelete="CASCADE"), nullable=False
    )
    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    verifier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    attestation_hash: Mapped[str | None] = mapped_column(String(64))
    esign_ref: Mapped[str | None] = mapped_column(String(128))
    esign_signature_b64: Mapped[str | None] = mapped_column(Text)

    sample = relationship("VerificationSample", back_populates="items")

    __table_args__ = (Index("verification_items_sample_idx", "sample_id", "status"),)
