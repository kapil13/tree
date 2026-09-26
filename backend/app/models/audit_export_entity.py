"""Persisted audit export packages (Wave A / P11 partial)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditExport(UUIDPKMixin, TimestampMixin, Base):
    """Immutable export package record for one audit cycle."""

    __tablename__ = "audit_exports"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="generated")
    export_version: Mapped[str] = mapped_column(String(64), nullable=False)
    methodology_version: Mapped[str | None] = mapped_column(String(128))
    content_manifest_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    unsigned_bundle_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    package_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    file_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    zip_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    signature_key_id: Mapped[str | None] = mapped_column(String(64))
    signature_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    frozen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    manifest_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    superseded_by_export_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_exports.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)

    files = relationship(
        "AuditExportFile",
        back_populates="export",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("audit_exports_cycle_idx", "cycle_id", "generated_at"),
        Index("audit_exports_engagement_idx", "engagement_id"),
        Index("audit_exports_package_sha256_idx", "package_sha256"),
    )


class AuditExportFile(UUIDPKMixin, Base):
    """Per-file manifest entry for an export package."""

    __tablename__ = "audit_export_files"

    export_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_exports.id", ondelete="CASCADE"), nullable=False
    )
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    export = relationship("AuditExport", back_populates="files")

    __table_args__ = (
        Index("audit_export_files_export_idx", "export_id"),
    )
