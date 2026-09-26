"""Platform Foundation E2 — PostgreSQL row-level security on tenant tables."""

from __future__ import annotations

from alembic import op

revision = "0087_platform_rls_policies"
down_revision = "0086_audit_wave_e_explain"
branch_labels = None
depends_on = None

_BYPASS = "current_setting('byot.current_role', true) IN ('admin', 'service')"

_ORG_MATCH = (
    "organization_id IS NOT NULL "
    "AND organization_id::text = current_setting('byot.current_org_id', true) "
    "AND current_setting('byot.current_org_id', true) <> '00000000-0000-0000-0000-000000000000'"
)

_USER_MATCH = (
    "owner_user_id::text = current_setting('byot.current_user_id', true) "
    "AND current_setting('byot.current_user_id', true) <> '00000000-0000-0000-0000-000000000000'"
)

_PAYMENT_USER = (
    "user_id::text = current_setting('byot.current_user_id', true) "
    "AND current_setting('byot.current_user_id', true) <> '00000000-0000-0000-0000-000000000000'"
)


def _enable_tenant_policy(table: str, using_expr: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}")
    op.execute(
        f"CREATE POLICY {table}_tenant_isolation ON {table} "
        f"USING ({_BYPASS} OR {using_expr}) "
        f"WITH CHECK ({_BYPASS} OR {using_expr})"
    )


def upgrade() -> None:
    _enable_tenant_policy("trees", f"({_ORG_MATCH}) OR ({_USER_MATCH})")
    _enable_tenant_policy("planting_projects", f"({_ORG_MATCH}) OR ({_USER_MATCH})")
    _enable_tenant_policy("organization_webhooks", _ORG_MATCH)
    _enable_tenant_policy("payment_orders", _PAYMENT_USER)
    _enable_tenant_policy("audit_logs", _ORG_MATCH)
    _enable_tenant_policy("audit_engagements", _ORG_MATCH)

    op.execute("ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS webhook_deliveries_tenant_isolation ON webhook_deliveries")
    op.execute(
        f"""
        CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
        USING (
          {_BYPASS}
          OR EXISTS (
            SELECT 1 FROM organization_webhooks w
            WHERE w.id = webhook_deliveries.webhook_id
              AND w.organization_id IS NOT NULL
              AND w.organization_id::text = current_setting('byot.current_org_id', true)
              AND current_setting('byot.current_org_id', true)
                  <> '00000000-0000-0000-0000-000000000000'
          )
        )
        WITH CHECK (
          {_BYPASS}
          OR EXISTS (
            SELECT 1 FROM organization_webhooks w
            WHERE w.id = webhook_deliveries.webhook_id
              AND w.organization_id IS NOT NULL
              AND w.organization_id::text = current_setting('byot.current_org_id', true)
              AND current_setting('byot.current_org_id', true)
                  <> '00000000-0000-0000-0000-000000000000'
          )
        )
        """
    )


def downgrade() -> None:
    for table in (
        "webhook_deliveries",
        "audit_engagements",
        "audit_logs",
        "payment_orders",
        "organization_webhooks",
        "planting_projects",
        "trees",
    ):
        op.execute(f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
