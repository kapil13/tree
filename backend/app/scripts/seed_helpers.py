"""Phase G demo seed helpers — scheme matrix, work areas, and workflow fixtures."""

from __future__ import annotations

import random
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select

from app.models.audit_cycle import AuditCycle
from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.audit_sampling import AuditFieldPlot, AuditSamplingPlan
from app.models.bioacoustic_analysis_run import BioacousticAnalysisRun
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.citizen_profile import CitizenProfile
from app.models.credit_ledger import CreditLedgerEvent
from app.models.credit_serial import CreditSerial
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.project_member import ProjectMember
from app.models.tree import Tree
from app.models.tree_steward import TreeSteward
from app.models.user import User
from app.models.verification_workflow import VerificationItem, VerificationSample
from app.services.carbon.species_catalog import SPECIES_CATALOG
from app.services.credits.ledger import sync_project_ledger, transition_ledger_status
from app.services.credits.serials import format_serial_number
from app.services.monitoring.scan_targets import ensure_work_area_scan_target
from app.services.planting_projects.service import create_standard_from_template
from app.services.planting_projects.templates import template_for_segment
from app.services.schemes.compliance import seed_project_scheme_checklists
from app.services.schemes.registry import get_scheme
from app.services.schemes.resolution import apply_scheme_defaults
from app.services.verification.samples import create_verification_sample

SHOWCASE_PROJECT_CODE = "DEMO-ESTATE-WATCH"
VERIFICATION_PROJECT_CODE = "DEMO-NAGAR-VAN"

# Geographic anchors for demo polygons (lon, lat).
GEO = {
    "bangalore": (77.5946, 12.9716),
    "indore": (75.8577, 22.7196),
    "jaipur": (75.7873, 26.9124),
    "mumbai": (72.8777, 19.0760),
    "delhi": (77.2090, 28.6139),
    "kolkata": (88.3639, 22.5726),
    "hyderabad": (78.4867, 17.3850),
    "udaipur": (73.7125, 24.5854),
    "bhubaneswar": (85.8245, 20.2961),
    "chennai": (80.2707, 13.0827),
    "nagpur": (79.0882, 21.1458),
}


def demo_polygon_wkt(lon: float, lat: float, delta: float = 0.002) -> WKTElement:
    ring = (
        f"{lon - delta} {lat - delta}, "
        f"{lon + delta} {lat - delta}, "
        f"{lon + delta} {lat + delta}, "
        f"{lon - delta} {lat + delta}, "
        f"{lon - delta} {lat - delta}"
    )
    return WKTElement(f"POLYGON(({ring}))", srid=4326)


def demo_point_wkt(lon: float, lat: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def _location_rural(
    *,
    state_code: str,
    state_name: str,
    district_code: str,
    district_name: str,
    block_code: str,
    block_name: str,
    gp_code: str,
    gp_name: str,
    village_code: str,
    village_name: str,
) -> dict[str, Any]:
    return {
        "financial_year": "2025-26",
        "area_type": "rural",
        "state_code": state_code,
        "state_name": state_name,
        "district_code": district_code,
        "district_name": district_name,
        "block_code": block_code,
        "block_name": block_name,
        "gram_panchayat_code": gp_code,
        "gram_panchayat_name": gp_name,
        "village_code": village_code,
        "village_name": village_name,
    }


def _location_urban(
    *,
    state_code: str,
    state_name: str,
    district_code: str,
    district_name: str,
    city_name: str,
    ulb: str,
) -> dict[str, Any]:
    return {
        "financial_year": "2025-26",
        "area_type": "urban",
        "state_code": state_code,
        "state_name": state_name,
        "district_code": district_code,
        "district_name": district_name,
        "city_name": city_name,
        "urban_local_body": ulb,
    }


DEMO_SCHEME_SPECS: list[dict[str, Any]] = [
    {
        "code": "DEMO-NAGAR-VAN",
        "name": "Demo — Indore Urban Forest Block A",
        "scheme_code": "nagar_van",
        "program_code": "government_nhai",
        "target_tree_count": 10000,
        "geo": "indore",
        "work_area_name": "Chiman Bagh Block A",
        "location": _location_urban(
            state_code="23",
            state_name="Madhya Pradesh",
            district_code="233",
            district_name="Indore",
            city_name="Indore",
            ulb="Indore Municipal Corporation",
        ),
        "scheme_refs": {
            "nagar_van_project_id": "NV-MP-INDORE-DEMO",
            "ulb_name": "Indore Municipal Corporation",
            "urban_forest_name": "Chiman Bagh Urban Forest Block A",
            "target_trees": 10000,
        },
    },
    {
        "code": "DEMO-SAHAKAR-VAN",
        "name": "Demo — Sumel Sahakar Van (Jaipur)",
        "scheme_code": "sahakar_van",
        "program_code": "government_nhai",
        "target_tree_count": 50000,
        "geo": "jaipur",
        "work_area_name": "Sumel cooperative block",
        "location": _location_rural(
            state_code="08",
            state_name="Rajasthan",
            district_code="084",
            district_name="Jaipur",
            block_code="08401",
            block_name="Amber",
            gp_code="08401001",
            gp_name="Sumel GP",
            village_code="08401001001",
            village_name="Sumel",
        ),
        "scheme_refs": {
            "sahakar_van_project_id": "SV-NCCF-RAJ-DEMO",
            "nccf_project_ref": "NCCF/SV/2026/SUMEL",
            "amul_union_name": "GCMMF — Amul",
            "cooperative_society_name": "Sumel Mahila Mandal",
            "village_name": "Sumel",
            "district": "Jaipur",
            "state_name": "Rajasthan",
            "site_area_acres": 64,
            "plantation_method": "mixed",
            "target_trees": 50000,
        },
    },
    {
        "code": "DEMO-CAMPA-CA",
        "name": "Demo — Udaipur CAMPA compensatory block",
        "scheme_code": "campa_ca",
        "program_code": "government_nhai",
        "target_tree_count": 25000,
        "geo": "udaipur",
        "work_area_name": "Gogunda CA parcel",
        "location": _location_rural(
            state_code="08",
            state_name="Rajasthan",
            district_code="087",
            district_name="Udaipur",
            block_code="08702",
            block_name="Gogunda",
            gp_code="08702003",
            gp_name="Bichhri GP",
            village_code="08702003002",
            village_name="Bichhri",
        ),
        "scheme_refs": {
            "pca_number": "PCA/RAJ/2025/1842",
            "forest_diversion_id": "FC-8821-2024",
            "state_campa_account": "Rajasthan State CAMPA",
            "apo_financial_year": "2025-26",
            "state_name": "Rajasthan",
            "ca_land_parcel_id": "CA-RJ-GOG-01",
        },
    },
    {
        "code": "DEMO-NHAI-HWY",
        "name": "Demo — NH-44 Green Highway Package 3",
        "scheme_code": "nhai_highway",
        "program_code": "government_nhai",
        "target_tree_count": 8000,
        "geo": "nagpur",
        "work_area_name": "KM 142–148 median strip",
        "location": _location_rural(
            state_code="27",
            state_name="Maharashtra",
            district_code="271",
            district_name="Nagpur",
            block_code="27101",
            block_name="Nagpur Rural",
            gp_code="27101005",
            gp_name="Kalmeshwar GP",
            village_code="27101005001",
            village_name="Kalmeshwar",
        ),
        "scheme_refs": {
            "nhai_package_code": "NH-44-PKG-3",
            "highway_number": "NH-44",
            "dpr_milestone": "BOQ-2025-Q3",
            "chainage_start_km": 142.0,
            "chainage_end_km": 148.0,
        },
    },
    {
        "code": "DEMO-MINING-RECLAM",
        "name": "Demo — Bellary overburden reclamation",
        "scheme_code": "mining_reclamation",
        "program_code": "corporate_esg",
        "target_tree_count": 12000,
        "geo": "hyderabad",
        "work_area_name": "OB dump stabilization zone",
        "location": _location_rural(
            state_code="29",
            state_name="Karnataka",
            district_code="291",
            district_name="Ballari",
            block_code="29102",
            block_name="Sandur",
            gp_code="29102001",
            gp_name="Taranagar GP",
            village_code="29102001003",
            village_name="Taranagar",
        ),
        "scheme_refs": {
            "mine_lease_number": "ML-08/2020/1234",
            "ibm_closure_plan_ref": "IBM/PCP/2025/KA/042",
            "closure_plan_year": 2025,
            "mineral_type": "iron_ore",
            "reclamation_block_type": "overburden_dump",
            "lease_area_ha": 420.5,
            "closure_phase": "phase_ii_greenbelt",
        },
    },
    {
        "code": "DEMO-GREEN-CREDIT",
        "name": "Demo — MoEFCC Green Credit land bank",
        "scheme_code": "green_credit_india",
        "program_code": "corporate_esg",
        "target_tree_count": 15000,
        "geo": "delhi",
        "work_area_name": "GCP land bank parcel 7",
        "location": _location_rural(
            state_code="07",
            state_name="Delhi",
            district_code="071",
            district_name="South West Delhi",
            block_code="07101",
            block_name="Dwarka",
            gp_code="07101002",
            gp_name="Bijwasan GP",
            village_code="07101002001",
            village_name="Bijwasan",
        ),
        "scheme_refs": {
            "green_credit_land_bank_id": "GCP-IN-2026-00742",
            "gcp_activity_type": "tree_plantation",
            "verifier_reference": "ICFRE/GCP/2026/042",
        },
    },
    {
        "code": "DEMO-GIM-RESTORE",
        "name": "Demo — GIM eco-restoration SM-2",
        "scheme_code": "gim_restoration",
        "program_code": "ngo_community",
        "target_tree_count": 6000,
        "geo": "bhubaneswar",
        "work_area_name": "Similipal buffer restoration",
        "location": _location_rural(
            state_code="21",
            state_name="Odisha",
            district_code="211",
            district_name="Mayurbhanj",
            block_code="21103",
            block_name="Baripada",
            gp_code="21103004",
            gp_name="Thakurmunda GP",
            village_code="21103004002",
            village_name="Thakurmunda",
        ),
        "scheme_refs": {
            "gim_sub_mission": "SM-2",
            "state_annual_plan_ref": "GIM/OD/2025/AP-18",
            "apo_financial_year": "2025-26",
            "state_name": "Odisha",
            "jfmc_name": "Thakurmunda JFMC",
        },
    },
    {
        "code": "DEMO-MISHTI-MANGROVE",
        "name": "Demo — MISHTI Sundarbans fringe",
        "scheme_code": "mishti_mangrove",
        "program_code": "ngo_community",
        "target_tree_count": 4000,
        "geo": "kolkata",
        "work_area_name": "Gosaba mangrove belt",
        "location": _location_rural(
            state_code="19",
            state_name="West Bengal",
            district_code="191",
            district_name="South 24 Parganas",
            block_code="19102",
            block_name="Gosaba",
            gp_code="19102001",
            gp_name="Gosaba GP",
            village_code="19102001001",
            village_name="Gosaba",
        ),
        "scheme_refs": {
            "mishti_project_id": "MISHTI-WB-2026-042",
            "coastal_state": "West Bengal",
            "coastal_district": "South 24 Parganas",
            "crz_category": "CRZ-I",
            "restoration_area_ha": 12.5,
        },
    },
    {
        "code": "DEMO-MGNREGA",
        "name": "Demo — MGNREGA watershed convergence",
        "scheme_code": "mgnrega_convergence",
        "program_code": "ngo_community",
        "target_tree_count": 3000,
        "geo": "jaipur",
        "work_area_name": "Watershed treatment series III",
        "location": _location_rural(
            state_code="08",
            state_name="Rajasthan",
            district_code="084",
            district_name="Jaipur",
            block_code="08403",
            block_name="Bassi",
            gp_code="08403002",
            gp_name="Lalsot GP",
            village_code="08403002004",
            village_name="Lalsot",
        ),
        "scheme_refs": {
            "mgnrega_work_estimate_id": "MGNREGA/RJ/2025/WE-4421",
            "gram_panchayat": "Lalsot",
            "person_days_planned": 1200,
            "financial_year": "2025-26",
        },
    },
    {
        "code": "DEMO-JAL-SHAKTI",
        "name": "Demo — Chambal riparian buffer",
        "scheme_code": "jal_shakti_riparian",
        "program_code": "ngo_community",
        "target_tree_count": 2500,
        "geo": "udaipur",
        "work_area_name": "Chambal left bank buffer",
        "location": _location_rural(
            state_code="08",
            state_name="Rajasthan",
            district_code="087",
            district_name="Udaipur",
            block_code="08704",
            block_name="Kherwara",
            gp_code="08704001",
            gp_name="Kherwara GP",
            village_code="08704001002",
            village_name="Kherwara",
        ),
        "scheme_refs": {
            "river_name": "Chambal",
            "buffer_km": 0.5,
            "jal_shakti_scheme_ref": "NMCG/RJ/2025/CS-18",
        },
    },
    {
        "code": "DEMO-DFI-CORRIDOR",
        "name": "Demo — DFI green corridor (WB)",
        "scheme_code": "dfi_green_corridor",
        "program_code": "government_nhai",
        "target_tree_count": 20000,
        "geo": "chennai",
        "work_area_name": "Corridor segment C-4",
        "location": _location_rural(
            state_code="33",
            state_name="Tamil Nadu",
            district_code="331",
            district_name="Chennai",
            block_code="33101",
            block_name="Sholinganallur",
            gp_code="33101003",
            gp_name="Kelambakkam GP",
            village_code="33101003001",
            village_name="Kelambakkam",
        ),
        "scheme_refs": {
            "apo_financial_year": "2025-26",
            "state_name": "Tamil Nadu",
            "dfi_lender_ref": "WB-IND-GREEN-2025-001",
            "dfi_project_id": "DFI-TN-CORR-04",
            "nhai_package_ref": "NH-48-PKG-2",
        },
    },
    {
        "code": SHOWCASE_PROJECT_CODE,
        "name": "Demo — Kumbhalgarh Estate Watch block C",
        "scheme_code": "estate_monitoring",
        "program_code": "government_nhai",
        "target_tree_count": 5000,
        "geo": "udaipur",
        "work_area_name": "Estate block C — mixed dry deciduous",
        "location": _location_rural(
            state_code="08",
            state_name="Rajasthan",
            district_code="087",
            district_name="Rajsamand",
            block_code="08705",
            block_name="Kumbhalgarh",
            gp_code="08705001",
            gp_name="Kumbhalgarh GP",
            village_code="08705001001",
            village_name="Kumbhalgarh",
        ),
        "scheme_refs": {
            "estate_name": "Kumbhalgarh Wildlife Sanctuary — Block C",
            "managing_agency": "Rajasthan Forest Department",
            "state_name": "Rajasthan",
            "forest_type": "natural_forest",
            "total_area_ha": 842.0,
            "watch_cycle": "quarterly",
        },
    },
    {
        "code": "DEMO-AMRIT-POSHAN",
        "name": "Demo — Amrit Poshan Vatika (Jaipur)",
        "scheme_code": "raj_amrit_poshan_vatika",
        "program_code": "government_nhai",
        "target_tree_count": 500,
        "geo": "jaipur",
        "work_area_name": "Anganwadi nutri-garden cluster",
        "location": _location_rural(
            state_code="08",
            state_name="Rajasthan",
            district_code="084",
            district_name="Jaipur",
            block_code="08402",
            block_name="Sanganer",
            gp_code="08402005",
            gp_name="Mansarovar GP",
            village_code="08402005002",
            village_name="Mansarovar",
        ),
        "scheme_refs": {
            "apv_site_id": "APV-RJ-2026-1842",
            "site_type": "anganwadi",
            "district": "Jaipur",
            "state_name": "Rajasthan",
            "target_fruit_trees": 120,
            "mgnrega_job_card_ref": "MGNREGA/RJ/2025/JC-8821",
        },
    },
]


async def _get_project_by_code(db, org_id: uuid.UUID, code: str) -> PlantingProject | None:
    return (
        await db.execute(
            select(PlantingProject).where(
                PlantingProject.organization_id == org_id,
                PlantingProject.code == code,
            )
        )
    ).scalar_one_or_none()


async def ensure_scheme_project(
    db,
    *,
    org,
    manager: User,
    spec: dict[str, Any],
) -> PlantingProject | None:
    scheme = get_scheme(spec["scheme_code"])
    if scheme is None:
        return None

    project = await _get_project_by_code(db, org.id, spec["code"])
    segment, compliance, template_code = apply_scheme_defaults(
        scheme=scheme,
        segment="general",
        compliance_mode="guided",
        program_code=spec["program_code"],
        standard_template_code=None,
    )
    if not template_code:
        template_code = template_for_segment(segment)["code"]

    metadata = {
        "scheme_refs": spec["scheme_refs"],
        "location": spec["location"],
        "demo": True,
        "state_code": spec["location"].get("state_code"),
    }

    if project is None:
        project = PlantingProject(
            code=spec["code"],
            name=spec["name"],
            description=f"Demo planting project under {scheme['label']}.",
            segment=segment,
            compliance_mode=compliance,
            status="active",
            program_code=spec["program_code"],
            scheme_code=spec["scheme_code"],
            standard_template_code=template_code,
            target_tree_count=spec.get("target_tree_count"),
            organization_id=org.id,
            owner_user_id=manager.id,
            metadata_=metadata,
        )
        db.add(project)
        await db.flush()
        await create_standard_from_template(db, project=project, template_code=template_code)
        await seed_project_scheme_checklists(db, project)
    else:
        project.name = spec["name"]
        project.metadata_ = {**(project.metadata_ or {}), **metadata}
        project.status = "active"

    await db.flush()
    return project


async def ensure_work_area(
    db,
    *,
    project: PlantingProject,
    owner: User,
    name: str,
    geo_key: str,
) -> PlantationFence:
    existing = (
        await db.execute(
            select(PlantationFence).where(
                PlantationFence.project_id == project.id,
                PlantationFence.name == name,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    lon, lat = GEO[geo_key]
    wkt = demo_polygon_wkt(lon, lat)
    fence = PlantationFence(
        name=name,
        project_id=project.id,
        geometry_type="polygon",
        owner_user_id=owner.id,
        organization_id=project.organization_id,
        boundary=wkt,
        metadata_={"demo": True},
    )
    db.add(fence)
    await db.flush()

    area_res = await db.execute(
        select(func.ST_Area(func.ST_GeogFromText(str(wkt))) / 10000.0)
    )
    fence.area_ha = round(float(area_res.scalar_one()), 4)
    await ensure_work_area_scan_target(db, fence, project)
    await db.flush()
    return fence


def _tree_payload(
    *,
    rng: random.Random,
    public_code: str,
    owner_user_id: uuid.UUID,
    organization_id: uuid.UUID,
    project_id: uuid.UUID | None = None,
    plantation_id: uuid.UUID | None = None,
    lon: float,
    lat: float,
) -> Tree:
    sp = rng.choice(SPECIES_CATALOG)
    return Tree(
        public_code=public_code,
        owner_user_id=owner_user_id,
        organization_id=organization_id,
        project_id=project_id,
        plantation_id=plantation_id,
        species_text=sp.common_name,
        planted_at=date.today() - timedelta(days=rng.randint(180, 1800)),
        location=f"POINT({lon} {lat})",
        altitude_m=rng.uniform(800, 950),
        accuracy_m=rng.uniform(2, 8),
        current_health=rng.choices(["healthy", "moderate", "unhealthy"], weights=[7, 2, 1])[0],
        current_dbh_cm=rng.uniform(5, 30),
        current_height_m=rng.uniform(2, 12),
        current_canopy_m=rng.uniform(1, 6),
        current_carbon_kg=rng.uniform(20, 150),
        satellite_verified=True,
        verification_status="field_verified",
        status="active",
        metadata_={"demo": True, "visibility_public": True},
    )


async def _next_tree_code(db, prefix: str) -> str:
    existing = (
        await db.execute(select(Tree.public_code).where(Tree.public_code.like(f"{prefix}-%")))
    ).scalars().all()
    used = set(existing)
    for i in range(10_000):
        code = f"{prefix}-{i:04d}"
        if code not in used:
            return code
    raise RuntimeError(f"no_available_codes_for_{prefix}")


async def ensure_project_trees(
    db,
    *,
    project: PlantingProject,
    fence: PlantationFence,
    owner: User,
    count: int,
    code_prefix: str,
    seed: int,
    geo_key: str,
) -> list[Tree]:
    existing = (
        await db.execute(
            select(Tree).where(Tree.project_id == project.id).order_by(Tree.created_at.asc())
        )
    ).scalars().all()
    if len(existing) >= count:
        return list(existing)

    lon, lat = GEO[geo_key]
    rng = random.Random(seed)
    trees = list(existing)
    while len(trees) < count:
        code = await _next_tree_code(db, code_prefix)
        offset_lon = lon + rng.uniform(-0.001, 0.001)
        offset_lat = lat + rng.uniform(-0.001, 0.001)
        tree = _tree_payload(
            rng=rng,
            public_code=code,
            owner_user_id=owner.id,
            organization_id=project.organization_id,
            project_id=project.id,
            plantation_id=fence.id,
            lon=offset_lon,
            lat=offset_lat,
        )
        db.add(tree)
        trees.append(tree)
    await db.flush()
    return trees


async def seed_ndvi_history(db, fence: PlantationFence, *, days: int = 90) -> int:
    existing = (
        await db.execute(
            select(func.count())
            .select_from(PlantationSatelliteRecord)
            .where(PlantationSatelliteRecord.fence_id == fence.id)
        )
    ).scalar_one()
    if existing >= 6:
        return 0

    now = datetime.now(UTC)
    rng = random.Random(hash(str(fence.id)) % 10_000)
    created = 0
    for week in range(0, days // 14):
        acquired = now - timedelta(days=days - week * 14)
        scene_id = f"DEMO-S2-{fence.id.hex[:8]}-{week:02d}"
        dup = (
            await db.execute(
                select(PlantationSatelliteRecord).where(
                    PlantationSatelliteRecord.fence_id == fence.id,
                    PlantationSatelliteRecord.scene_id == scene_id,
                )
            )
        ).scalar_one_or_none()
        if dup is not None:
            continue
        ndvi = round(0.45 + rng.uniform(-0.08, 0.12), 4)
        db.add(
            PlantationSatelliteRecord(
                fence_id=fence.id,
                provider="sentinel_hub",
                scene_id=scene_id,
                scene_acquired_at=acquired,
                cloud_cover_pct=rng.uniform(2, 18),
                ndvi_mean=ndvi,
                ndvi_max=round(ndvi + 0.05, 4),
                ndvi_min=round(ndvi - 0.05, 4),
                evi_mean=round(ndvi * 0.9, 4),
                presence_confirmed=True,
                change_vs_baseline=round(rng.uniform(-0.05, 0.05), 4),
            )
        )
        created += 1
    fence.last_satellite_at = now
    await db.flush()
    return created


async def ensure_scheme_matrix(
    db,
    *,
    org,
    manager: User,
) -> dict[str, PlantingProject]:
    projects: dict[str, PlantingProject] = {}
    for spec in DEMO_SCHEME_SPECS:
        project = await ensure_scheme_project(db, org=org, manager=manager, spec=spec)
        if project is None:
            continue
        fence = await ensure_work_area(
            db,
            project=project,
            owner=manager,
            name=spec["work_area_name"],
            geo_key=spec["geo"],
        )
        code_prefix = spec["code"].replace("DEMO-", "T-").replace("-", "")[:12]
        tree_count = 8 if spec["code"] == SHOWCASE_PROJECT_CODE else 5
        await ensure_project_trees(
            db,
            project=project,
            fence=fence,
            owner=manager,
            count=tree_count,
            code_prefix=code_prefix,
            seed=sum(ord(c) for c in spec["code"]),
            geo_key=spec["geo"],
        )
        await seed_ndvi_history(db, fence)
        projects[spec["code"]] = project
    return projects


async def ensure_project_member(
    db,
    *,
    project: PlantingProject,
    user: User,
    role: str,
    work_area_ids: list[uuid.UUID] | None = None,
) -> ProjectMember:
    row = (
        await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if row is not None:
        row.role = role
        row.work_area_ids = [str(wid) for wid in (work_area_ids or [])] or None
        return row
    member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role=role,
        work_area_ids=[str(wid) for wid in (work_area_ids or [])] if work_area_ids else None,
    )
    db.add(member)
    await db.flush()
    return member


async def seed_verification_queue(
    db,
    *,
    project: PlantingProject,
    org,
    supervisor: User,
    verifier: User,
) -> VerificationSample | None:
    existing = (
        await db.execute(
            select(VerificationSample).where(VerificationSample.project_id == project.id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    try:
        sample = await create_verification_sample(
            db,
            project_id=project.id,
            organization_id=org.id,
            sample_pct=25.0,
            method="stratified",
            created_by=supervisor.id,
        )
    except ValueError:
        return None

    items = (
        await db.execute(
            select(VerificationItem).where(VerificationItem.sample_id == sample.id)
        )
    ).scalars().all()
    trees = (
        await db.execute(select(Tree).where(Tree.project_id == project.id))
    ).scalars().all()
    tree_map = {t.id: t for t in trees}
    from app.services.verification.samples import attest_verification_item

    for index, item in enumerate(items):
        tree = tree_map.get(item.tree_id)
        if tree is None:
            continue
        if index == 0:
            await attest_verification_item(
                db, item, tree, verifier_id=verifier.id, status="approved", notes="Demo attestation"
            )
        elif index == 1:
            await attest_verification_item(
                db, item, tree, verifier_id=verifier.id, status="rejected", notes="Demo rejection"
            )
    return sample


async def seed_audit_sampling(
    db,
    *,
    project: PlantingProject,
    fence: PlantationFence,
    manager: User,
) -> AuditEngagement | None:
    engagement = (
        await db.execute(
            select(AuditEngagement).where(AuditEngagement.project_id == project.id)
        )
    ).scalar_one_or_none()
    if engagement is None:
        engagement = AuditEngagement(
            project_id=project.id,
            organization_id=project.organization_id,
            status="sampling_planned",
            created_by_user_id=manager.id,
            metadata_={"demo": True},
        )
        db.add(engagement)
        await db.flush()
    else:
        engagement.status = "sampling_planned"

    cycle = (
        await db.execute(
            select(AuditCycle).where(
                AuditCycle.engagement_id == engagement.id,
                AuditCycle.cycle_number == 1,
            )
        )
    ).scalar_one_or_none()
    now = datetime.now(UTC)
    if cycle is None:
        cycle = AuditCycle(
            engagement_id=engagement.id,
            cycle_number=1,
            status="sampling_planned",
            opened_at=now,
            started_by_user_id=manager.id,
        )
        db.add(cycle)
        await db.flush()

    boundary = (
        await db.execute(
            select(BoundaryVersion).where(
                BoundaryVersion.engagement_id == engagement.id,
                BoundaryVersion.name == fence.name,
            )
        )
    ).scalar_one_or_none()
    if boundary is None:
        boundary = BoundaryVersion(
            engagement_id=engagement.id,
            name=fence.name,
            block_type="plantation_block",
            source="drawn",
            boundary=fence.boundary,
            area_ha_claimed=fence.area_ha,
            area_ha_measured=fence.area_ha,
            fence_id=fence.id,
            metadata_={"demo": True},
        )
        db.add(boundary)
        await db.flush()

    plan = (
        await db.execute(
            select(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement.id)
        )
    ).scalar_one_or_none()
    if plan is None:
        plan = AuditSamplingPlan(
            engagement_id=engagement.id,
            cycle_id=cycle.id,
            stratification="risk_weighted",
            total_plots=3,
            status="active",
            planned_at=now,
        )
        db.add(plan)
        await db.flush()

    lon, lat = GEO["udaipur"]
    for plot_index in range(1, 4):
        plot_code = f"PLOT-{plot_index:02d}"
        existing_plot = (
            await db.execute(
                select(AuditFieldPlot).where(
                    AuditFieldPlot.plan_id == plan.id,
                    AuditFieldPlot.plot_code == plot_code,
                )
            )
        ).scalar_one_or_none()
        if existing_plot is not None:
            continue
        offset = plot_index * 0.0003
        db.add(
            AuditFieldPlot(
                engagement_id=engagement.id,
                cycle_id=cycle.id,
                plan_id=plan.id,
                boundary_version_id=boundary.id,
                plot_code=plot_code,
                center=demo_point_wkt(lon + offset, lat + offset),
                risk_level=["critical", "high", "medium"][plot_index - 1],
                priority_rank=plot_index,
                status="planned",
                metadata_={"demo": True},
            )
        )
    await db.flush()
    return engagement


async def seed_bioacoustic_sessions(
    db,
    *,
    project: PlantingProject,
    fence: PlantationFence,
    manager: User,
    count: int = 3,
) -> int:
    existing = (
        await db.execute(
            select(func.count())
            .select_from(BioacousticRecording)
            .where(BioacousticRecording.plantation_fence_id == fence.id)
        )
    ).scalar_one()
    if existing >= count:
        return 0

    lon, lat = GEO["udaipur"]
    created = 0
    now = datetime.now(UTC)
    detections = [
        {
            "scientific_name": "Pycnonotus cafer",
            "common_name": "Red-vented Bulbul",
            "taxon_group": "bird",
            "confidence": 0.91,
            "call_count": 14,
            "detection_tier": "accepted",
        },
        {
            "scientific_name": "Corvus splendens",
            "common_name": "House Crow",
            "taxon_group": "bird",
            "confidence": 0.84,
            "call_count": 6,
            "detection_tier": "probable",
        },
    ]
    for index in range(existing, count):
        recorded_at = now - timedelta(days=index * 7 + 1)
        recording = BioacousticRecording(
            owner_user_id=manager.id,
            organization_id=project.organization_id,
            plantation_fence_id=fence.id,
            s3_key=f"demo/bioacoustic/{project.code.lower()}/{index + 1}.wav",
            duration_seconds=120.0,
            recorded_at=recorded_at,
            location=demo_point_wkt(lon, lat),
            status="analyzed",
            species_detections=detections,
            total_species_count=2,
            accepted_species_count=1,
            shannon_diversity_index=1.24,
            biodiversity_confidence_score=78.5,
            bioacoustic_health_score=72.0,
            analyzed_at=recorded_at + timedelta(hours=2),
            metadata_={"demo": True},
        )
        db.add(recording)
        await db.flush()
        run = BioacousticAnalysisRun(
            recording_id=recording.id,
            run_number=1,
            status="completed",
            pipeline="birdnet",
            model_version="demo-v1",
            species_detections=detections,
            metrics={"demo": True},
            analyzed_at=recording.analyzed_at,
            accepted_species_count=1,
            shannon_diversity_index=1.24,
        )
        db.add(run)
        await db.flush()
        recording.latest_analysis_run_id = run.id
        created += 1
    await db.flush()
    return created


async def seed_compliance_violations(
    db,
    *,
    project: PlantingProject,
    fence: PlantationFence,
    count: int = 3,
) -> int:
    existing = (
        await db.execute(
            select(func.count())
            .select_from(PlantingComplianceViolation)
            .where(
                PlantingComplianceViolation.project_id == project.id,
                PlantingComplianceViolation.resolved_at.is_(None),
            )
        )
    ).scalar_one()
    if existing >= count:
        return 0

    specs = [
        ("out_of_fence", "high", "Tree registered outside work area boundary"),
        ("species_mismatch", "medium", "Species not in approved planting standard"),
        ("missing_photo", "low", "Registration photo evidence incomplete"),
    ]
    created = 0
    for violation_type, severity, message in specs[existing:count]:
        db.add(
            PlantingComplianceViolation(
                project_id=project.id,
                work_area_id=fence.id,
                violation_type=violation_type,
                severity=severity,
                message=message,
                metadata_={"demo": True, "gap_key": violation_type},
            )
        )
        created += 1
    await db.flush()
    return created


async def seed_credit_ledger_serial(
    db,
    *,
    project: PlantingProject,
    manager: User,
) -> CreditSerial | None:
    serial_existing = (
        await db.execute(
            select(CreditSerial).where(CreditSerial.project_id == project.id)
        )
    ).scalar_one_or_none()
    if serial_existing is not None:
        return serial_existing

    ledger = await sync_project_ledger(db, project, refresh_integrity=False)
    if ledger.status == "estimated":
        try:
            await transition_ledger_status(
                db, ledger, to_status="verified", actor_user_id=manager.id, project=project
            )
            await transition_ledger_status(
                db, ledger, to_status="buffered", actor_user_id=manager.id, project=project
            )
            await transition_ledger_status(
                db,
                ledger,
                to_status="issued",
                actor_user_id=manager.id,
                registry_reference="DEMO-REG-2026-001",
                project=project,
            )
        except (ValueError, Exception):
            event = CreditLedgerEvent(
                ledger_id=ledger.id,
                actor_user_id=manager.id,
                from_status="estimated",
                to_status="issued",
                notes="Demo seed bypass",
                registry_reference="DEMO-REG-2026-001",
            )
            db.add(event)
            await db.flush()
            ledger.status = "issued"
            ledger.issued_credits_tco2e = ledger.net_credits_tco2e
            ledger.registry_reference = "DEMO-REG-2026-001"
            state = (project.metadata_ or {}).get("state_code") or "08"
            serial = CreditSerial(
                serial_number=format_serial_number(2026, str(state), 1),
                ledger_event_id=event.id,
                project_id=project.id,
                organization_id=project.organization_id,
                vintage_year=2026,
                tco2e_amount=float(ledger.net_credits_tco2e or 1.0),
                status="available",
                integrity_snapshot={"demo": True},
            )
            db.add(serial)
            await db.flush()
            return serial

    res = await db.execute(
        select(CreditSerial).where(CreditSerial.project_id == project.id)
    )
    return res.scalar_one_or_none()


async def seed_citizen_stewardship(
    db,
    *,
    citizen: User,
    adoptable_tree: Tree | None,
) -> TreeSteward | None:
    profile = await db.get(CitizenProfile, citizen.id)
    if profile is None:
        profile = CitizenProfile(
            user_id=citizen.id,
            points=120,
            badges=[{"id": "first_adoption", "label": "First adoption"}],
            stewardship_streak=2,
            last_stewardship_at=datetime.now(UTC) - timedelta(days=5),
            onboarding_steps=["welcome", "first_tree"],
        )
        db.add(profile)
    else:
        profile.points = max(profile.points, 120)
        profile.stewardship_streak = max(profile.stewardship_streak, 2)

    if adoptable_tree is None:
        adoptable_tree = (
            await db.execute(
                select(Tree)
                .where(Tree.owner_user_id == citizen.id, Tree.project_id.is_(None))
                .order_by(Tree.created_at.asc())
                .limit(1)
            )
        ).scalar_one_or_none()
    if adoptable_tree is None:
        return None

    adoptable_tree.metadata_ = {
        **(adoptable_tree.metadata_ or {}),
        "visibility_public": True,
        "stewardship_due_at": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
    }

    steward = (
        await db.execute(
            select(TreeSteward).where(
                TreeSteward.tree_id == adoptable_tree.id,
                TreeSteward.user_id == citizen.id,
            )
        )
    ).scalar_one_or_none()
    if steward is not None:
        return steward

    steward = TreeSteward(
        tree_id=adoptable_tree.id,
        user_id=citizen.id,
        role="adopter",
        nickname="Demo grove tree",
        adopted_at=datetime.now(UTC) - timedelta(days=14),
    )
    db.add(steward)
    await db.flush()
    return steward


async def seed_workflow_fixtures(
    db,
    *,
    org,
    manager: User,
    supervisor: User,
    verifier: User,
    field_worker: User,
    citizen: User,
    projects: dict[str, PlantingProject],
) -> dict[str, int]:
    stats: dict[str, int] = {}
    showcase = projects.get(SHOWCASE_PROJECT_CODE)
    verify_project = projects.get(VERIFICATION_PROJECT_CODE)
    if showcase is None:
        return stats

    fence = (
        await db.execute(
            select(PlantationFence).where(PlantationFence.project_id == showcase.id).limit(1)
        )
    ).scalar_one_or_none()
    if fence is None:
        return stats

    await ensure_project_member(
        db,
        project=showcase,
        user=field_worker,
        role="field_worker",
        work_area_ids=[fence.id],
    )
    await ensure_project_member(db, project=showcase, user=supervisor, role="field_supervisor")
    await ensure_project_member(db, project=showcase, user=verifier, role="project_verifier")

    stats["audit_engagement"] = 1 if await seed_audit_sampling(
        db, project=showcase, fence=fence, manager=manager
    ) else 0
    stats["bioacoustic_sessions"] = await seed_bioacoustic_sessions(
        db, project=showcase, fence=fence, manager=manager
    )
    stats["compliance_violations"] = await seed_compliance_violations(
        db, project=showcase, fence=fence
    )
    stats["credit_serial"] = 1 if await seed_credit_ledger_serial(db, project=showcase, manager=manager) else 0

    if verify_project is not None:
        stats["verification_sample"] = 1 if await seed_verification_queue(
            db,
            project=verify_project,
            org=org,
            supervisor=supervisor,
            verifier=verifier,
        ) else 0

    stats["stewardship"] = 1 if await seed_citizen_stewardship(db, citizen=citizen, adoptable_tree=None) else 0
    return stats
