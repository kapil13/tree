"""P2 biodiversity tests — monitoring plans, baseline delta, trends, compliance links."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.services.bioacoustic.baseline_delta import _normalize_species_name
from app.services.bioacoustic.bio_monitoring_protocols import protocol_for_scheme
from app.services.bioacoustic.compliance_evidence import BIO_CHECKLIST_ITEMS
from app.services.bioacoustic.monitoring_plans import _plan_status


def test_protocol_for_nhai_scheme():
    proto = protocol_for_scheme("nhai_highway")
    assert proto["protocol_key"] == "nhai_highway"
    assert proto["cadence_days"] == 90
    assert proto["min_recordings_per_cycle"] == 2


def test_protocol_fallback_default():
    proto = protocol_for_scheme("unknown_scheme")
    assert proto["protocol_key"] == "default"
    assert proto["cadence_days"] == 90


def test_plan_status_overdue():
    past = datetime.now(UTC) - timedelta(days=1)
    assert _plan_status(past, 0, 1) == "overdue"


def test_plan_status_on_track():
    future = datetime.now(UTC) + timedelta(days=30)
    assert _plan_status(future, 1, 1) == "on_track"


def test_normalize_species_name():
    assert _normalize_species_name("Corvus splendens Vieillot, 1817") == "corvus splendens vieillot, 1817"


def test_bio_checklist_items_include_ps6():
    assert "ps6_biodiversity" in BIO_CHECKLIST_ITEMS


async def test_compute_baseline_delta_empty():
    from app.services.bioacoustic.baseline_delta import compute_baseline_delta

    class _Db:
        async def execute(self, stmt):
            class _R:
                def scalar_one_or_none(self):
                    return None

                def scalars(self):
                    class _S:
                        def all(self):
                            return []

                    return _S()

            return _R()

    data = await compute_baseline_delta(_Db(), uuid.uuid4())
    assert data["baseline_species_count"] == 0
    assert data["detected_accepted_count"] == 0
