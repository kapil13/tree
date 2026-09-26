from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class SiteVisit(UUIDPKMixin, Base):
    __tablename__ = "site_visits"

    visitor_id: Mapped[str] = mapped_column(String(36), nullable=False)
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    ip: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    referrer: Mapped[str | None] = mapped_column(String(1024))
    locale: Mapped[str | None] = mapped_column(String(8))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("site_visits_created_at_idx", "created_at"),
        Index("site_visits_ip_created_idx", "ip", "created_at"),
        Index("site_visits_path_created_idx", "path", "created_at"),
        Index("site_visits_visitor_created_idx", "visitor_id", "created_at"),
    )
