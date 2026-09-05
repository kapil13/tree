from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class MonitoringScanTarget(UUIDPKMixin, TimestampMixin, Base):
    """Registry of trees and work areas enrolled in scheduled satellite scans."""

    __tablename__ = "monitoring_scan_targets"

    target_type: Mapped[str] = mapped_column(String(16), nullable=False)
    tree_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=True
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="CASCADE"), nullable=True
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    program_code: Mapped[str | None] = mapped_column(String(64))
    scheme_code: Mapped[str | None] = mapped_column(String(64))
    scan_tier: Mapped[str] = mapped_column(String(64), nullable=False, default="default")
    scan_tile: Mapped[str | None] = mapped_column(String(32))
    interval_days: Mapped[int] = mapped_column(nullable=False, default=7)
    watch_enabled: Mapped[bool] = mapped_column(nullable=False, default=False)
    last_scan_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (
        UniqueConstraint("tree_id", name="monitoring_scan_targets_tree_uq"),
        UniqueConstraint("fence_id", name="monitoring_scan_targets_fence_uq"),
        Index("monitoring_scan_targets_due_idx", "next_due_at", "target_type"),
        Index("monitoring_scan_targets_tile_idx", "scan_tile"),
    )
