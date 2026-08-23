"""Darwin Core Archive (DwC-A) export for GBIF species observation publish."""

from __future__ import annotations

import csv
import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.work_area_biodiversity_snapshot import WorkAreaBiodiversitySnapshot

DARWIN_CORE_VERSION = "2024-04-24"
DWC_TERMS = [
    "occurrenceID",
    "basisOfRecord",
    "scientificName",
    "kingdom",
    "phylum",
    "class",
    "order",
    "family",
    "genus",
    "specificEpithet",
    "taxonRank",
    "decimalLatitude",
    "decimalLongitude",
    "coordinateUncertaintyInMeters",
    "eventDate",
    "occurrenceStatus",
    "individualCount",
    "organismQuantityType",
    "samplingProtocol",
    "identifiedBy",
    "identificationVerificationStatus",
    "iucnRedListCategory",
    "iucnTaxonID",
    "gbifID",
    "datasetName",
    "institutionCode",
    "collectionCode",
    "catalogNumber",
    "recordedBy",
    "occurrenceRemarks",
]


def _coords_from_point(geom: Any) -> tuple[float | None, float | None]:
    if geom is None:
        return None, None
    try:
        shape = to_shape(geom)
        return shape.y, shape.x
    except Exception:
        return None, None


async def build_darwin_occurrences(
    db: AsyncSession,
    *,
    project: PlantingProject,
    organization_name: str,
) -> list[dict[str, Any]]:
    """Collect Darwin Core occurrence rows from bioacoustic, IUCN snapshots, and trees."""
    occurrences: list[dict[str, Any]] = []
    dataset = f"BYOT — {project.name} ({project.code})"
    inst = organization_name or "BYOT"

    fences_res = await db.execute(
        select(PlantationFence).where(PlantationFence.project_id == project.id)
    )
    fence_ids = [f.id for f in fences_res.scalars().all()]

    # Bioacoustic detections
    if fence_ids:
        recs = list(
            (
                await db.execute(
                    select(BioacousticRecording).where(
                        BioacousticRecording.plantation_fence_id.in_(fence_ids),
                        BioacousticRecording.status == "analyzed",
                    )
                )
            ).scalars().all()
        )
        for rec in recs:
            lat, lon = _coords_from_point(rec.location)
            event_date = rec.recorded_at.date().isoformat() if rec.recorded_at else ""
            for idx, det in enumerate(rec.species_detections or []):
                sci = det.get("scientific_name") or det.get("species") or "Unknown"
                iucn_meta = det.get("iucn") or {}
                iucn = iucn_meta.get("category") or det.get("iucn_category") or ""
                occurrences.append(
                    {
                        "occurrenceID": f"byot-bio-{rec.id}-{idx}",
                        "basisOfRecord": "HumanObservation",
                        "scientificName": sci,
                        "kingdom": det.get("kingdom") or "Animalia",
                        "decimalLatitude": lat,
                        "decimalLongitude": lon,
                        "eventDate": event_date,
                        "occurrenceStatus": "present",
                        "individualCount": det.get("call_count") or 1,
                        "organismQuantityType": "individuals",
                        "samplingProtocol": "Bioacoustic automated detection (BirdNET/Perch)",
                        "identificationVerificationStatus": "machine_assisted",
                        "iucnRedListCategory": iucn,
                        "iucnTaxonID": iucn_meta.get("taxon_id") or det.get("iucn_taxon_id") or "",
                        "gbifID": det.get("gbif_usage_key") or "",
                        "datasetName": dataset,
                        "institutionCode": inst[:10],
                        "collectionCode": project.code,
                        "catalogNumber": str(rec.id),
                        "recordedBy": "BYOT bioacoustic pipeline",
                        "occurrenceRemarks": det.get("common_name") or "",
                    }
                )

        # IUCN / GBIF checklist snapshots
        snaps = list(
            (
                await db.execute(
                    select(WorkAreaBiodiversitySnapshot).where(
                        WorkAreaBiodiversitySnapshot.fence_id.in_(fence_ids)
                    )
                )
            ).scalars().all()
        )
        for snap in snaps:
            fence = await db.get(PlantationFence, snap.fence_id)
            lat, lon = _coords_from_point(fence.boundary if fence else None)
            event_date = snap.captured_at.date().isoformat() if snap.captured_at else ""
            for idx, sp in enumerate(snap.species or []):
                sci = sp.get("scientific_name") or sp.get("name") or "Unknown"
                occurrences.append(
                    {
                        "occurrenceID": f"byot-iucn-{snap.id}-{idx}",
                        "basisOfRecord": "HumanObservation",
                        "scientificName": sci,
                        "kingdom": sp.get("kingdom") or "",
                        "decimalLatitude": lat,
                        "decimalLongitude": lon,
                        "eventDate": event_date,
                        "occurrenceStatus": "present",
                        "samplingProtocol": "Regional fauna checklist (GBIF + IUCN)",
                        "identificationVerificationStatus": "reviewed",
                        "iucnRedListCategory": sp.get("iucn_category") or sp.get("iucn_status") or "",
                        "iucnTaxonID": sp.get("iucn_taxon_id") or "",
                        "gbifID": sp.get("gbif_usage_key") or "",
                        "datasetName": dataset,
                        "institutionCode": inst[:10],
                        "collectionCode": project.code,
                        "catalogNumber": str(snap.id),
                        "recordedBy": "BYOT biodiversity baseline",
                        "occurrenceRemarks": sp.get("source") or "regional_checklist",
                    }
                )

    # Tree species as Occurrence records (planted individuals)
    trees = list(
        (
            await db.execute(
                select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
            )
        ).scalars().all()
    )
    for tree in trees:
        if not tree.species_text:
            continue
        occurrences.append(
            {
                "occurrenceID": f"byot-tree-{tree.id}",
                "basisOfRecord": "HumanObservation",
                "scientificName": tree.species_text,
                "kingdom": "Plantae",
                "decimalLatitude": float(tree.latitude) if tree.latitude else None,
                "decimalLongitude": float(tree.longitude) if tree.longitude else None,
                "coordinateUncertaintyInMeters": 10,
                "eventDate": tree.planted_at.date().isoformat() if tree.planted_at else "",
                "occurrenceStatus": "present",
                "individualCount": 1,
                "organismQuantityType": "individuals",
                "samplingProtocol": "Field geotag registration",
                "identificationVerificationStatus": "verified" if tree.satellite_verified else "unverified",
                "datasetName": dataset,
                "institutionCode": inst[:10],
                "collectionCode": project.code,
                "catalogNumber": tree.public_code,
                "recordedBy": "BYOT field registration",
                "occurrenceRemarks": f"health={tree.current_health}",
            }
        )

    return occurrences


def render_darwin_occurrence_tsv(occurrences: list[dict[str, Any]]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=DWC_TERMS, extrasaction="ignore", delimiter="\t")
    writer.writeheader()
    for row in occurrences:
        writer.writerow({k: row.get(k, "") for k in DWC_TERMS})
    return buf.getvalue().encode("utf-8")


def render_darwin_meta_xml(project_code: str, org_name: str, count: int) -> bytes:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<archive xmlns="http://rs.tdwg.org/dwc/text/" metadata="eml.xml">
  <core encoding="UTF-8" fieldsTerminatedBy="\\t" linesTerminatedBy="\\n" fieldsEnclosedBy="" ignoreHeaderLines="1" rowType="http://rs.tdwg.org/dwc/terms/Occurrence">
    <files>
      <location>occurrence.txt</location>
    </files>
    <id index="0" />
  </core>
</archive>
"""
    eml = f"""<?xml version="1.0" encoding="UTF-8"?>
<eml:eml xmlns:eml="eml://ecoinformatics.org/eml-2.1.1">
  <dataset>
    <title>BYOT Darwin Core Export — {project_code}</title>
    <creator>{org_name}</creator>
    <abstract>Species occurrences from bioacoustic, IUCN checklist, and tree registration ({count} records).</abstract>
  </dataset>
</eml:eml>
"""
    return xml.encode("utf-8"), eml.encode("utf-8")


def render_darwin_json(occurrences: list[dict[str, Any]], meta: dict[str, Any]) -> bytes:
    payload = {"meta": meta, "occurrences": occurrences}
    return json.dumps(payload, indent=2, default=str).encode("utf-8")


def _gbif_publish_prep(
    occurrences: list[dict[str, Any]],
    *,
    project_code: str,
    org_name: str,
) -> dict[str, Any]:
    with_iucn = sum(1 for o in occurrences if o.get("iucnRedListCategory"))
    with_gbif = sum(1 for o in occurrences if o.get("gbifID"))
    return {
        "workflow": "GBIF IPT publish preparation",
        "status": "draft",
        "project_code": project_code,
        "publisher": org_name,
        "record_count": len(occurrences),
        "records_with_iucn_status": with_iucn,
        "records_with_gbif_id": with_gbif,
        "recommended_steps": [
            "Review occurrence.txt for coordinate accuracy",
            "Validate scientificName against GBIF backbone",
            "Register dataset on GBIF IPT or publish via partner node",
            "Include iucnRedListCategory and gbifID where available",
        ],
        "generated_at": datetime.now(UTC).isoformat(),
    }


def render_darwin_zip(
    occurrences: list[dict[str, Any]],
    *,
    project_code: str,
    org_name: str,
) -> bytes:
    meta_xml, eml_xml = render_darwin_meta_xml(project_code, org_name, len(occurrences))
    tsv = render_darwin_occurrence_tsv(occurrences)
    gbif_prep = _gbif_publish_prep(occurrences, project_code=project_code, org_name=org_name)
    buf = io.BytesIO()
    code = project_code.replace("/", "-")
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("meta.xml", meta_xml)
        zf.writestr("eml.xml", eml_xml)
        zf.writestr("occurrence.txt", tsv)
        zf.writestr("gbif_publish_prep.json", json.dumps(gbif_prep, indent=2).encode("utf-8"))
        zf.writestr(
            f"darwin-core-{code}.json",
            render_darwin_json(
                occurrences,
                {
                    "standard": "Darwin Core",
                    "version": DARWIN_CORE_VERSION,
                    "project_code": project_code,
                    "record_count": len(occurrences),
                    "records_with_iucn_status": gbif_prep["records_with_iucn_status"],
                    "records_with_gbif_id": gbif_prep["records_with_gbif_id"],
                    "generated_at": datetime.now(UTC).isoformat(),
                },
            ),
        )
    return buf.getvalue()
