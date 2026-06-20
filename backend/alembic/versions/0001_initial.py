"""Initial schema (extensions + all tables).

The DDL here mirrors `docs/DATABASE_SCHEMA.md` and the SQLAlchemy models.
We write it by hand (not via --autogenerate) so the file is reviewable and
stays close to the schema document.

Revision ID: 0001_initial
Revises:
Create Date: 2025-01-01
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # organizations
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False, unique=True),
        sa.Column("type", sa.String(32), nullable=False, server_default="individual"),
        sa.Column("country_code", sa.String(2)),
        sa.Column("metadata", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("organizations_type_idx", "organizations", ["type"])

    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL")),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("phone", sa.String(32), unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255)),
        sa.Column("google_sub", sa.String(255), unique=True),
        sa.Column("role", sa.String(32), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("users_org_idx", "users", ["organization_id"])

    # species
    op.create_table(
        "species",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("scientific_name", sa.String(255), nullable=False, unique=True),
        sa.Column("common_name", sa.String(255), nullable=False),
        sa.Column("family", sa.String(120)),
        sa.Column("native_regions", postgresql.ARRAY(sa.String)),
        sa.Column("agb_coef_a", sa.Numeric(10, 4)),
        sa.Column("agb_coef_b", sa.Numeric(6, 3)),
        sa.Column("wood_density", sa.Numeric(6, 3)),
        sa.Column("root_shoot_ratio", sa.Numeric(5, 3)),
        sa.Column("carbon_fraction", sa.Numeric(5, 3), server_default="0.47"),
        sa.Column("max_height_m", sa.Numeric(6, 2)),
        sa.Column("max_dbh_cm", sa.Numeric(6, 2)),
        sa.Column("growth_curve", postgresql.JSONB),
        sa.Column("metadata", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.execute("CREATE INDEX species_common_trgm ON species USING gin (common_name gin_trgm_ops);")

    # trees
    op.create_table(
        "trees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("public_code", sa.String(64), nullable=False, unique=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL")),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("species_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("species.id")),
        sa.Column("species_text", sa.String(255)),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("planted_at", sa.Date()),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("altitude_m", sa.Numeric(8, 2)),
        sa.Column("accuracy_m", sa.Numeric(8, 2)),
        sa.Column("plantation_id", postgresql.UUID(as_uuid=True)),
        sa.Column("current_height_m", sa.Numeric(6, 2)),
        sa.Column("current_dbh_cm", sa.Numeric(6, 2)),
        sa.Column("current_canopy_m", sa.Numeric(6, 2)),
        sa.Column("current_health", sa.String(32), server_default="unknown"),
        sa.Column("current_carbon_kg", sa.Numeric(12, 2), server_default="0"),
        sa.Column("satellite_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("last_satellite_at", sa.DateTime(timezone=True)),
        sa.Column("last_analysis_at", sa.DateTime(timezone=True)),
        sa.Column("metadata", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.execute("CREATE INDEX trees_location_gix ON trees USING GIST (location);")
    op.create_index("trees_owner_idx", "trees", ["owner_user_id"])
    op.create_index("trees_org_idx", "trees", ["organization_id"])
    op.create_index("trees_species_idx", "trees", ["species_id"])
    op.create_index("trees_status_idx", "trees", ["status"])
    op.create_index("trees_health_idx", "trees", ["current_health"])

    # tree_images
    op.create_table(
        "tree_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("s3_key", sa.String(1024), nullable=False),
        sa.Column("cdn_url", sa.String(1024)),
        sa.Column("taken_at", sa.DateTime(timezone=True)),
        sa.Column("taken_location", Geography(geometry_type="POINT", srid=4326)),
        sa.Column("width_px", sa.Integer),
        sa.Column("height_px", sa.Integer),
        sa.Column("size_bytes", sa.BigInteger),
        sa.Column("exif", postgresql.JSONB),
        sa.Column("is_primary", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("tree_images_tree_idx", "tree_images", ["tree_id"])

    # tree_analysis
    op.create_table(
        "tree_analysis",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("triggered_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("model_pipeline", sa.String(255), nullable=False),
        sa.Column("model_versions", postgresql.JSONB, nullable=False),
        sa.Column("species_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("species.id")),
        sa.Column("species_confidence", sa.Numeric(5, 4)),
        sa.Column("species_topk", postgresql.JSONB),
        sa.Column("health", sa.String(32)),
        sa.Column("health_confidence", sa.Numeric(5, 4)),
        sa.Column("diseases_detected", postgresql.JSONB),
        sa.Column("estimated_height_m", sa.Numeric(6, 2)),
        sa.Column("estimated_dbh_cm", sa.Numeric(6, 2)),
        sa.Column("estimated_canopy_m", sa.Numeric(6, 2)),
        sa.Column("estimated_biomass_kg", sa.Numeric(12, 2)),
        sa.Column("recommendations", postgresql.JSONB),
        sa.Column("overall_confidence", sa.Numeric(5, 4)),
        sa.Column("raw_output", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("tree_analysis_tree_idx", "tree_analysis", ["tree_id", "created_at"])

    # carbon_calculations
    op.create_table(
        "carbon_calculations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("methodology", sa.String(64), nullable=False, server_default="IPCC_AR6"),
        sa.Column("inputs", postgresql.JSONB, nullable=False),
        sa.Column("agb_kg", sa.Numeric(12, 2), nullable=False),
        sa.Column("bgb_kg", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_biomass_kg", sa.Numeric(12, 2), nullable=False),
        sa.Column("carbon_kg", sa.Numeric(12, 2), nullable=False),
        sa.Column("co2e_kg", sa.Numeric(12, 2), nullable=False),
        sa.Column("annual_sequestration_kg", sa.Numeric(12, 2)),
        sa.Column("lifetime_credits_tco2e", sa.Numeric(12, 3)),
        sa.Column("estimated_revenue_usd", sa.Numeric(12, 2)),
        sa.Column("price_assumption_usd", sa.Numeric(8, 2)),
        sa.Column("confidence", sa.Numeric(5, 4)),
        sa.Column("engine_version", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("carbon_tree_idx", "carbon_calculations", ["tree_id", "created_at"])

    # satellite_records
    op.create_table(
        "satellite_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(64), nullable=False),
        sa.Column("scene_id", sa.String(255), nullable=False),
        sa.Column("scene_acquired_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cloud_cover_pct", sa.Numeric(5, 2)),
        sa.Column("ndvi_mean", sa.Numeric(6, 4)),
        sa.Column("ndvi_max", sa.Numeric(6, 4)),
        sa.Column("ndvi_min", sa.Numeric(6, 4)),
        sa.Column("evi_mean", sa.Numeric(6, 4)),
        sa.Column("presence_confirmed", sa.Boolean),
        sa.Column("change_vs_baseline", sa.Numeric(6, 4)),
        sa.Column("thumbnail_s3_key", sa.String(1024)),
        sa.Column("raw_metadata", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("sat_tree_time_idx", "satellite_records", ["tree_id", "scene_acquired_at"])

    # alerts
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trees.id", ondelete="CASCADE")),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(32), nullable=False, server_default="info"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("channels", postgresql.ARRAY(sa.String), nullable=False, server_default=sa.text("ARRAY['in_app']::varchar[]")),
        sa.Column("delivered", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("payload", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("alerts_user_idx", "alerts", ["user_id", "created_at"])

    # reports
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE")),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("format", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="queued"),
        sa.Column("s3_key", sa.String(1024)),
        sa.Column("filters", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("error", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("reports_org_idx", "reports", ["organization_id", "created_at"])

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(120), nullable=False),
        sa.Column("resource_type", sa.String(64)),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True)),
        sa.Column("ip", postgresql.INET),
        sa.Column("user_agent", sa.Text),
        sa.Column("diff", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("audit_resource_idx", "audit_logs", ["resource_type", "resource_id", "created_at"])


def downgrade() -> None:
    for tbl in [
        "audit_logs",
        "reports",
        "alerts",
        "satellite_records",
        "carbon_calculations",
        "tree_analysis",
        "tree_images",
        "trees",
        "species",
        "users",
        "organizations",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE;")
