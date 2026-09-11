"""Estate Watch Phase 5 — risk-driven field sampling."""

from __future__ import annotations

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0071_audit_sampling_phase5"
down_revision = "0070_audit_risk_phase4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_sampling_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stratification", sa.String(32), nullable=False, server_default="risk_weighted"),
        sa.Column("plots_per_critical", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("plots_per_high", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("plots_per_medium", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("plots_per_low", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("layout_seed", sa.Integer(), nullable=True),
        sa.Column("total_plots", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="ESTIMATION"),
        sa.Column("planned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("engagement_id", name="audit_sampling_plans_engagement_uq"),
    )
    op.create_index("audit_sampling_plans_engagement_idx", "audit_sampling_plans", ["engagement_id"])

    op.create_table(
        "audit_field_plots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "plan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_sampling_plans.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "boundary_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("boundary_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "risk_assessment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_risk_assessments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("plot_code", sa.String(64), nullable=False),
        sa.Column("center", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("risk_level", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("priority_rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="planned"),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("plan_id", "plot_code", name="audit_field_plots_code_uq"),
    )
    op.create_index("audit_field_plots_engagement_idx", "audit_field_plots", ["engagement_id"])
    op.create_index("audit_field_plots_plan_idx", "audit_field_plots", ["plan_id"])
    op.create_index(
        "audit_field_plots_center_gix",
        "audit_field_plots",
        ["center"],
        postgresql_using="gist",
    )

    op.create_table(
        "audit_field_visits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plot_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_field_plots.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("visited_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "visitor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("trees_observed", sa.Integer(), nullable=True),
        sa.Column("trees_alive", sa.Integer(), nullable=True),
        sa.Column("canopy_cover_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column(
            "verification_outcome",
            sa.String(32),
            nullable=False,
            server_default="inconclusive",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="OBSERVATION"),
        sa.Column("signals", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("audit_field_visits_plot_idx", "audit_field_visits", ["plot_id", "visited_at"])


def downgrade() -> None:
    op.drop_index("audit_field_visits_plot_idx", table_name="audit_field_visits")
    op.drop_table("audit_field_visits")
    op.drop_index("audit_field_plots_center_gix", table_name="audit_field_plots")
    op.drop_index("audit_field_plots_plan_idx", table_name="audit_field_plots")
    op.drop_index("audit_field_plots_engagement_idx", table_name="audit_field_plots")
    op.drop_table("audit_field_plots")
    op.drop_index("audit_sampling_plans_engagement_idx", table_name="audit_sampling_plans")
    op.drop_table("audit_sampling_plans")
