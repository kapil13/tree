"""Frozen export artifacts and verification records (Wave D)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, LargeBinary, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class AuditExportArtifact(UUIDPKMixin, Base):
    """Immutable zip bytes for a persisted export package."""

    __tablename__ = "audit_export_artifacts"

    export_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_exports.id", ondelete="CASCADE"), nullable=False
    )
    zip_bytes: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    stored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    export = relationship("AuditExport", backref="artifact")

    __table_args__ = (UniqueConstraint("export_id", name="audit_export_artifacts_export_uq"),)


class AuditExportVerification(UUIDPKMixin, Base):
    """Signature verification result for a frozen export."""

    __tablename__ = "audit_export_verifications"

    export_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_exports.id", ondelete="CASCADE"), nullable=False
    )
    valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    export = relationship("AuditExport", backref="verifications")

    __table_args__ = (
        Index("audit_export_verifications_export_idx", "export_id", "verified_at"),
    )
