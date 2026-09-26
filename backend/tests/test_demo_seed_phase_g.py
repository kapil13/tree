"""Phase G demo seed completeness."""

from __future__ import annotations

import inspect

from app.scripts import seed_demo
from app.scripts.seed_helpers import DEMO_SCHEME_SPECS, SHOWCASE_PROJECT_CODE


def test_phase_g_scheme_matrix_covers_thirteen_schemes():
    codes = {spec["scheme_code"] for spec in DEMO_SCHEME_SPECS}
    expected = {
        "nagar_van",
        "sahakar_van",
        "campa_ca",
        "nhai_highway",
        "mining_reclamation",
        "green_credit_india",
        "gim_restoration",
        "mishti_mangrove",
        "mgnrega_convergence",
        "jal_shakti_riparian",
        "dfi_green_corridor",
        "estate_monitoring",
        "raj_amrit_poshan_vatika",
    }
    assert codes == expected
    assert all(spec.get("location") for spec in DEMO_SCHEME_SPECS)
    assert all(spec.get("scheme_refs") for spec in DEMO_SCHEME_SPECS)


def test_phase_g_role_matrix_emails_defined():
    source = inspect.getsource(seed_demo)
    for email in (
        "fieldworker@byot.earth",
        "supervisor@byot.earth",
        "corporate@byot.earth",
        "ngo@byot.earth",
    ):
        assert email in source


def test_phase_g_workflow_showcase_project():
    showcase = next(s for s in DEMO_SCHEME_SPECS if s["code"] == SHOWCASE_PROJECT_CODE)
    assert showcase["scheme_code"] == "estate_monitoring"
