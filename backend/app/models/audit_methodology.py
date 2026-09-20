"""Estate Watch methodology registry (Wave A / P17 partial)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditMethodology(Base):
    """Versioned Estate Watch audit methodology."""

    __tablename__ = "audit_methodologies"

    version: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    effective_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditRuleVersion(UUIDPKMixin, TimestampMixin, Base):
    """Deterministic rule definition bound to a methodology version."""

    __tablename__ = "audit_rule_versions"

    methodology_version: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("audit_methodologies.version", ondelete="RESTRICT"),
        nullable=False,
    )
    rule_code: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint(
            "methodology_version",
            "rule_code",
            name="audit_rule_versions_methodology_rule_uq",
        ),
        Index("audit_rule_versions_methodology_idx", "methodology_version"),
    )


class AuditThresholdSet(UUIDPKMixin, TimestampMixin, Base):
    """Named threshold bundle for a methodology version."""

    __tablename__ = "audit_threshold_sets"

    methodology_version: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("audit_methodologies.version", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    thresholds: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint(
            "methodology_version",
            "name",
            name="audit_threshold_sets_methodology_name_uq",
        ),
        Index("audit_threshold_sets_methodology_idx", "methodology_version"),
    )
