"""Tests for Estate Watch audit intake (Phase 1)."""

from __future__ import annotations

from app.services.audit_intake.claim_snapshot import content_hash
from app.services.audit_intake.gis_validation import validate_boundaries
from app.services.audit_intake.intake_gate import evaluate_intake_gate
from app.services.audit_intake.kml_import import parse_kml_bytes
from app.services.audit_intake.plausibility import assess_block_plausibility

SAMPLE_KML = b"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Block A</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              77.0,28.0,0 77.01,28.0,0 77.01,28.01,0 77.0,28.01,0 77.0,28.0,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
"""


def test_parse_kml_placemarks():
    placemarks = parse_kml_bytes(SAMPLE_KML)
    assert len(placemarks) == 1
    assert placemarks[0]["name"] == "Block A"
    assert placemarks[0]["geometry"]["type"] == "Polygon"


def test_content_hash_stable():
    data = {"trees_claimed": 1000, "area_ha_claimed": 50.0}
    h1 = content_hash(data)
    h2 = content_hash(data)
    assert h1 == h2
    assert len(h1) == 64


def test_plausibility_plausible_block():
    result = assess_block_plausibility(
        block_name="Compartment 1",
        area_ha_measured=100.0,
        area_ha_claimed=98.0,
        trees_claimed=50000,
        density_per_ha=500.0,
        template_code="estate_monitoring_v1",
    )
    assert result["verdict"] in {"plausible", "unusual", "cannot_assess"}
    assert result["epistemic_label"] == "ESTIMATION"


def test_plausibility_area_mismatch():
    result = assess_block_plausibility(
        block_name="Block X",
        area_ha_measured=200.0,
        area_ha_claimed=50.0,
        trees_claimed=10000,
        density_per_ha=None,
        template_code="estate_monitoring_v1",
    )
    assert result["verdict"] in {"unusual", "inconsistent"}


def test_gis_validation_overlap():
    poly = {
        "type": "Polygon",
        "coordinates": [[[77.0, 28.0], [77.01, 28.0], [77.01, 28.01], [77.0, 28.01], [77.0, 28.0]]],
    }
    boundaries = [
        {"id": "a", "name": "A", "geometry": poly, "area_ha_claimed": 100, "area_ha_measured": 100},
        {
            "id": "b",
            "name": "B",
            "geometry": poly,
            "area_ha_claimed": 100,
            "area_ha_measured": 100,
        },
    ]
    result = validate_boundaries(boundaries)
    assert result["checks"]["overlaps"] >= 1
    assert result["status"] in {"warn", "fail"}


def test_intake_gate_not_ready():
    from types import SimpleNamespace

    engagement = SimpleNamespace(status="draft")
    gate = evaluate_intake_gate(
        engagement,
        boundary_count=0,
        document_count=0,
        has_frozen_snapshot=False,
        gis_status=None,
        plausibility_assessed=0,
    )
    assert gate["ready"] is False
    assert any(r["id"] == "frozen_claim" and not r["met"] for r in gate["requirements"])


def test_intake_gate_ready():
    from types import SimpleNamespace

    engagement = SimpleNamespace(status="draft")
    gate = evaluate_intake_gate(
        engagement,
        boundary_count=2,
        document_count=1,
        has_frozen_snapshot=True,
        gis_status="pass",
        plausibility_assessed=2,
    )
    assert gate["ready"] is True
