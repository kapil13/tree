from __future__ import annotations

from typing import Any

from sqlalchemy import Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class Species(UUIDPKMixin, Base):
    __tablename__ = "species"

    scientific_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    common_name: Mapped[str] = mapped_column(String(255), nullable=False)
    family: Mapped[str | None] = mapped_column(String(120))
    native_regions: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    # Allometric: AGB_kg = a * DBH_cm^b
    agb_coef_a: Mapped[float | None] = mapped_column(Numeric(10, 4))
    agb_coef_b: Mapped[float | None] = mapped_column(Numeric(6, 3))
    wood_density: Mapped[float | None] = mapped_column(Numeric(6, 3))
    root_shoot_ratio: Mapped[float | None] = mapped_column(Numeric(5, 3))
    carbon_fraction: Mapped[float] = mapped_column(Numeric(5, 3), default=0.47)
    max_height_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    max_dbh_cm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    growth_curve: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
