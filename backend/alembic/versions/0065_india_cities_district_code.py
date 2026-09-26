"""Add district_code to india_cities for district-scoped urban lookups."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0065_india_cities_district_code"
down_revision = "0064_phase4_integrity_registry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("india_cities", sa.Column("district_code", sa.String(length=16), nullable=True))
    op.create_index("india_cities_state_district_idx", "india_cities", ["state_code", "district_code"])
    op.create_foreign_key(
        "india_cities_district_code_fkey",
        "india_cities",
        "india_districts",
        ["district_code"],
        ["code"],
        ondelete="CASCADE",
    )
    op.drop_constraint("india_cities_state_name_uq", "india_cities", type_="unique")
    op.execute("DELETE FROM india_cities")
    op.alter_column("india_cities", "district_code", nullable=False)
    op.create_unique_constraint(
        "india_cities_state_district_name_uq",
        "india_cities",
        ["state_code", "district_code", "name"],
    )


def downgrade() -> None:
    op.drop_constraint("india_cities_state_district_name_uq", "india_cities", type_="unique")
    op.drop_constraint("india_cities_district_code_fkey", "india_cities", type_="foreignkey")
    op.drop_index("india_cities_state_district_idx", table_name="india_cities")
    op.drop_column("india_cities", "district_code")
    op.create_unique_constraint("india_cities_state_name_uq", "india_cities", ["state_code", "name"])
