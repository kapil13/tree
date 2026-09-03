"""Tree CRUD, images, passport, QR."""

from __future__ import annotations

import secrets
import string
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.v1.deps import DB, CurrentUser, WriteAccess, require_write_perm
from app.core.security import Permission, has_permission
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.tree_image import TreeImage
from app.models.user import User
from app.schemas.common import Page
from app.schemas.tree import (
    RegeotagComplianceOut,
    TreeCreate,
    TreeImageOut,
    TreeListItem,
    TreeOut,
    TreePassport,
    TreeRegeotag,
    TreeRegeotagOut,
    TreeRiskOut,
    TreeUpdate,
)
from app.schemas.tree_measurement import (
    TreeInitialMeasurement,
    TreeMeasurementCreate,
    TreeMeasurementOut,
)
from app.services.audit import record_audit
from app.services.data_scope import apply_tree_scope, can_access_tree, mvt_tree_scope_binds
from app.services.integrity.image_loader import load_exif_for_upload_key, load_image_bytes
from app.services.integrity.photo_dedup import find_photo_duplicate
from app.services.integrity.refresh import refresh_tree_integrity
from app.services.integrity.tree_risk import (
    apply_exif_to_image,
    apply_hashes_to_image_from_bytes,
    apply_integrity_to_tree,
    assess_coordinate_duplicate,
    assess_from_registration,
)
from app.services.passport import generate_passport_pdf, generate_qr_png
from app.services.planting_programs.enrollment import (
    get_program_by_code,
    user_can_use_program,
)
from app.services.planting_programs.validation import (
    ProgramValidationError,
    validate_program_payload,
)
from app.services.planting_projects.access import load_project, load_work_area
from app.services.planting_projects.compliance import evaluate_tree_placement, persist_violations
from app.services.planting_projects.constants import PROGRAM_DEFAULT_COMPLIANCE
from app.services.planting_projects.registration_context import merge_project_into_tree_metadata
from app.services.planting_projects.rule_engine import get_effective_rules, resolve_compliance_mode
from app.services.planting_projects.service import get_active_standard
from app.services.storage import get_storage
from app.services.storage.key_ownership import assert_owned_upload_key
from app.services.trees.measurements import create_measurement, list_measurements

router = APIRouter(prefix="/trees", tags=["trees"])

_TREE_DETAIL_LOAD = (
    selectinload(Tree.images),
    selectinload(Tree.planting_program),
    selectinload(Tree.risk_score),
)


def _require_measurement_write(user: User) -> None:
    if not has_permission(user.role, Permission.TREE_UPDATE):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="measurement_write_forbidden")

TreeDeleteAccess = Annotated[User, require_write_perm(Permission.TREE_DELETE)]

_ALPHABET = string.ascii_uppercase + string.digits


def _gen_public_code() -> str:
    p1 = "".join(secrets.choice(_ALPHABET) for _ in range(4))
    p2 = "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"BYOT-{p1}-{p2}"


def _as_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _image_out(img: TreeImage) -> TreeImageOut:
    cdn_url = img.cdn_url
    if not cdn_url:
        try:
            cdn_url = get_storage().presigned_get(img.s3_key, expires_in=3600)
        except Exception:
            cdn_url = None
    return TreeImageOut(
        id=img.id,
        tree_id=img.tree_id,
        s3_key=img.s3_key,
        cdn_url=cdn_url,
        is_primary=img.is_primary,
        created_at=img.created_at,
        taken_at=img.taken_at,
    )


def _risk_out(tree: Tree) -> TreeRiskOut | None:
    # Avoid async lazy-load (MissingGreenlet): only read when eager-loaded.
    if "risk_score" not in tree.__dict__:
        return None
    score = tree.__dict__["risk_score"]
    if score is None:
        return None
    return TreeRiskOut(
        gps_photo_match=bool(score.gps_photo_match),
        duplicate_photo=bool(score.duplicate_photo),
        duplicate_coordinate=bool(score.duplicate_coordinate),
        ai_confidence_low=bool(score.ai_confidence_low),
        regeotag_mismatch=bool(score.regeotag_mismatch),
        composite_risk=float(score.composite_risk or 0),
        field_score=float(score.field_score) if score.field_score is not None else None,
        satellite_score=float(score.satellite_score) if score.satellite_score is not None else None,
        fusion_score=float(score.fusion_score) if score.fusion_score is not None else None,
        credit_eligible=bool(score.credit_eligible),
        fusion_details=score.fusion_details or {},
        details=score.details or {},
    )


def _to_out(tree: Tree) -> TreeOut:
    try:
        pt = to_shape(tree.location)
        latitude, longitude = pt.y, pt.x
    except Exception:
        latitude, longitude = None, None

    images: list[TreeImageOut] = []
    for img in tree.images or []:
        try:
            images.append(_image_out(img))
        except Exception:
            continue

    return TreeOut(
        id=tree.id,
        public_code=tree.public_code,
        owner_user_id=tree.owner_user_id,
        organization_id=tree.organization_id,
        program_id=tree.program_id,
        program_code=tree.planting_program.code if tree.planting_program else None,
        species_id=tree.species_id,
        species_text=tree.species_text,
        status=tree.status,
        verification_status=getattr(tree, "verification_status", None) or "registered",
        planted_at=tree.planted_at,
        registered_at=tree.registered_at,
        latitude=latitude,
        longitude=longitude,
        altitude_m=_as_float(tree.altitude_m),
        accuracy_m=_as_float(tree.accuracy_m),
        current_height_m=_as_float(tree.current_height_m),
        current_dbh_cm=_as_float(tree.current_dbh_cm),
        current_canopy_m=_as_float(tree.current_canopy_m),
        current_health=tree.current_health,
        current_carbon_kg=float(tree.current_carbon_kg or 0),
        satellite_verified=bool(tree.satellite_verified),
        last_analysis_at=tree.last_analysis_at,
        last_satellite_at=tree.last_satellite_at,
        metadata=tree.metadata_ or {},
        images=images,
        risk_score=_risk_out(tree),
        plantation_id=tree.plantation_id,
        project_id=tree.project_id,
        last_geotag_at=tree.last_geotag_at,
        created_at=tree.created_at,
    )


@router.post("", response_model=TreeOut, status_code=status.HTTP_201_CREATED)
async def create_tree(
    payload: TreeCreate, request: Request, user: WriteAccess, db: DB
) -> TreeOut:
    program = await get_program_by_code(db, payload.program_code)
    if program is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unknown_program")
    if not await user_can_use_program(db, user.id, program):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="program_not_enrolled")

    for key in payload.photo_keys:
        try:
            assert_owned_upload_key(user.id, key, folders=("images",))
        except ValueError as exc:
            code = str(exc)
            if code == "s3_key_forbidden":
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail=code) from exc
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=code) from exc

    work_area_id = payload.work_area_id or payload.plantation_id
    work_area: PlantationFence | None = None
    project: PlantingProject | None = None
    metadata_in = dict(payload.metadata or {})

    if work_area_id:
        work_area = await load_work_area(work_area_id, user, db)
        if work_area is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="work_area_not_found")
        if work_area.project_id:
            project = await load_project(work_area.project_id, user, db)
            if project is None:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="project_access_denied")

    if project is None:
        project_id_raw = metadata_in.get("project_id")
        if project_id_raw:
            try:
                project_id = uuid.UUID(str(project_id_raw))
            except ValueError:
                project_id = None
            if project_id is not None:
                project = await load_project(project_id, user, db)
                if project is None:
                    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="project_access_denied")

    compliance_mode = (
        project.compliance_mode
        if project
        else PROGRAM_DEFAULT_COMPLIANCE.get(program.code, "open")
    )

    core_values = {
        "species_text": payload.species_text,
        "species_id": payload.species_id,
        "planted_at": payload.planted_at,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "altitude_m": payload.altitude_m,
        "accuracy_m": payload.accuracy_m,
        "plantation_id": work_area_id,
    }

    rules: dict = {}
    if project:
        standard = await get_active_standard(db, project)
        rules = await get_effective_rules(db, standard, project_id=project.id)
        metadata_in = merge_project_into_tree_metadata(
            metadata_in,
            project=project,
            rules=rules,
            surveyor_name=user.full_name,
        )
        compliance_mode = await resolve_compliance_mode(
            db,
            template_code=standard.template_code if standard else project.standard_template_code,
            project_compliance_mode=project.compliance_mode,
            project_id=project.id,
        )

    try:
        metadata = validate_program_payload(
            program.code,
            core_values=core_values,
            metadata=metadata_in,
            photo_count=len(payload.photo_keys),
        )
    except ProgramValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"validation_errors": exc.errors},
        ) from exc

    compliance = await evaluate_tree_placement(
        db,
        project=project,
        work_area=work_area,
        rules=rules,
        compliance_mode=compliance_mode,  # type: ignore[arg-type]
        latitude=float(core_values["latitude"]),
        longitude=float(core_values["longitude"]),
        accuracy_m=core_values.get("accuracy_m"),
        species_text=core_values.get("species_text"),
        species_id=core_values.get("species_id"),
        photo_count=len(payload.photo_keys),
        metadata=metadata,
        program_code=program.code,
    )

    if not compliance.passed:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "compliance_errors": compliance.to_dict()["issues"],
                "mode": compliance.mode,
            },
        )

    if compliance_mode == "strict" and payload.photo_keys:
        from app.services.integrity.photo_evidence import strict_primary_photo_blockers

        primary_exif_check = load_exif_for_upload_key(payload.photo_keys[0])
        photo_blockers = strict_primary_photo_blockers(primary_exif_check)
        if photo_blockers:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "compliance_errors": [
                        {
                            "violation_type": blocker,
                            "severity": "block",
                            "message": (
                                "Primary photo must be a recent live camera capture with GPS "
                                "metadata (strict compliance)."
                            ),
                        }
                        for blocker in photo_blockers
                    ],
                    "mode": compliance_mode,
                },
            )

    if (
        compliance_mode == "strict"
        and program.code in ("government_nhai", "corporate_esg")
        and work_area_id is None
    ):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "compliance_errors": [
                    {
                        "violation_type": "work_area_required",
                        "severity": "block",
                        "message": "Select a project work area before registering trees for this program.",
                    }
                ],
            },
        )

    if compliance.chainage_km is not None:
        metadata["chainage_km"] = str(compliance.chainage_km)

    if program.code == "byot" and metadata.get("visibility_public") is None:
        metadata["visibility_public"] = True

    wkt = f"POINT({core_values['longitude']} {core_values['latitude']})"
    tree = Tree(
        public_code=_gen_public_code(),
        owner_user_id=user.id,
        organization_id=user.organization_id,
        program_id=program.id,
        species_id=core_values.get("species_id"),
        species_text=core_values.get("species_text"),
        planted_at=core_values.get("planted_at"),
        location=wkt,
        altitude_m=core_values.get("altitude_m"),
        accuracy_m=core_values.get("accuracy_m"),
        plantation_id=work_area_id,
        project_id=project.id if project else None,
        metadata_=metadata,
    )
    tree.last_geotag_at = datetime.now(UTC)
    db.add(tree)
    await db.flush()

    if compliance.issues:
        await persist_violations(
            db,
            result=compliance,
            project_id=project.id if project else None,
            work_area_id=work_area_id,
            tree_id=tree.id,
        )

    primary_exif = None
    photo_duplicate = None
    storage = get_storage()
    for idx, key in enumerate(payload.photo_keys):
        exif = load_exif_for_upload_key(key) if idx == 0 else None
        if idx == 0:
            primary_exif = exif
        img = TreeImage(
            tree_id=tree.id,
            s3_key=key,
            is_primary=(idx == 0),
            uploaded_by=user.id,
        )
        if exif is not None:
            apply_exif_to_image(img, exif)
        image_bytes = load_image_bytes(key) or storage.get_bytes(key)
        if image_bytes:
            hashes = apply_hashes_to_image_from_bytes(img, image_bytes)
            if idx == 0 and hashes is not None:
                photo_duplicate = await find_photo_duplicate(
                    db,
                    hashes=hashes,
                    organization_id=user.organization_id,
                    exclude_tree_id=tree.id,
                )
                if (
                    photo_duplicate.duplicate_photo
                    and compliance_mode == "strict"
                    and (
                        photo_duplicate.exact_match
                        or program.code in ("government_nhai", "corporate_esg")
                    )
                ):
                    raise HTTPException(
                        status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail={
                            "compliance_errors": [
                                {
                                    "violation_type": "duplicate_photo",
                                    "severity": "block",
                                    "message": (
                                        "This photo matches an existing tree registration"
                                        + (
                                            f" ({photo_duplicate.matched_tree_code})."
                                            if photo_duplicate.matched_tree_code
                                            else "."
                                        )
                                    ),
                                    "metadata": {
                                        "matched_tree_code": photo_duplicate.matched_tree_code,
                                        "exact_match": photo_duplicate.exact_match,
                                    },
                                }
                            ],
                        },
                    )
        db.add(img)
    await db.flush()

    dup_coord, nearest_m = await assess_coordinate_duplicate(
        db,
        work_area_id=work_area_id,
        lat=float(core_values["latitude"]),
        lon=float(core_values["longitude"]),
        exclude_tree_id=tree.id,
    )
    assessment = assess_from_registration(
        tree_lat=float(core_values["latitude"]),
        tree_lon=float(core_values["longitude"]),
        accuracy_m=core_values.get("accuracy_m"),
        compliance_mode=compliance_mode,  # type: ignore[arg-type]
        program_code=program.code,
        rules_max_accuracy_m=float(rules["max_gps_accuracy_m"])
        if rules.get("max_gps_accuracy_m") is not None
        else None,
        duplicate_coordinate=dup_coord,
        nearest_m=nearest_m,
        primary_exif=primary_exif,
        duplicate_photo=bool(photo_duplicate and photo_duplicate.duplicate_photo),
        photo_duplicate_details={
            "exact_match": photo_duplicate.exact_match,
            "near_match": photo_duplicate.near_match,
            "matched_tree_code": photo_duplicate.matched_tree_code,
            "hamming_distance": photo_duplicate.hamming_distance,
        }
        if photo_duplicate and photo_duplicate.duplicate_photo
        else None,
    )
    await apply_integrity_to_tree(db, tree, assessment)

    initial = payload.initial_measurement or TreeInitialMeasurement()
    photo_key = initial.photo_key or (payload.photo_keys[0] if payload.photo_keys else None)
    await create_measurement(
        db,
        tree=tree,
        payload=TreeMeasurementCreate(
            source="registration",
            method=initial.method,
            instrument=initial.instrument,
            dbh_cm=initial.dbh_cm,
            height_m=initial.height_m,
            canopy_m=initial.canopy_m,
            gps_accuracy_m=payload.accuracy_m,
            photo_key=photo_key,
            notes=initial.notes,
        ),
        measurer_id=user.id,
    )

    await record_audit(
        db,
        actor=user,
        action="tree.create",
        resource_type="tree",
        resource_id=tree.id,
        request=request,
        diff={
            "public_code": tree.public_code,
            "species_text": tree.species_text,
            "project_id": str(project.id) if project else None,
            "work_area_id": str(work_area_id) if work_area_id else None,
            "photo_count": len(payload.photo_keys),
        },
    )
    if program.code == "byot":
        from app.services.citizen.gamification import record_tree_created

        await record_tree_created(db, user)
    await db.commit()
    await db.refresh(tree, attribute_names=["planting_program", "risk_score"])
    await db.refresh(tree, attribute_names=["images"])
    return _to_out(tree)


@router.get("", response_model=Page[TreeListItem])
async def list_trees(
    user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=150),
    health: str | None = None,
    species_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    work_area_id: uuid.UUID | None = None,
    bbox: str | None = Query(
        None, description="minLon,minLat,maxLon,maxLat"
    ),
) -> Page[TreeListItem]:
    stmt = select(Tree).options(selectinload(Tree.planting_program))
    stmt = await apply_tree_scope(stmt, user, db)
    if health:
        stmt = stmt.where(Tree.current_health == health)
    if species_id:
        stmt = stmt.where(Tree.species_id == species_id)
    if project_id:
        stmt = stmt.where(Tree.project_id == project_id)
    if work_area_id:
        stmt = stmt.where(Tree.plantation_id == work_area_id)
    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = (float(x) for x in bbox.split(","))
            envelope = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
            stmt = stmt.where(func.ST_Intersects(Tree.location, envelope))
        except Exception as exc:
            raise HTTPException(422, detail="invalid_bbox") from exc

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.order_by(Tree.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()

    work_area_ids = {t.plantation_id for t in rows if t.plantation_id}
    work_area_names: dict[uuid.UUID, str] = {}
    if work_area_ids:
        from app.models.plantation_fence import PlantationFence

        fence_rows = (
            await db.execute(
                select(PlantationFence.id, PlantationFence.name).where(
                    PlantationFence.id.in_(work_area_ids)
                )
            )
        ).all()
        work_area_names = dict(fence_rows)

    items: list[TreeListItem] = []
    for t in rows:
        pt = to_shape(t.location)
        meta = t.metadata_ or {}
        items.append(
            TreeListItem(
                id=t.id,
                public_code=t.public_code,
                species_text=t.species_text,
                current_health=t.current_health,
                current_carbon_kg=float(t.current_carbon_kg or 0),
                satellite_verified=t.satellite_verified,
                latitude=pt.y,
                longitude=pt.x,
                created_at=t.created_at,
                program_code=t.planting_program.code if t.planting_program else None,
                project_id=t.project_id,
                work_area_id=t.plantation_id,
                work_area_name=(
                    work_area_names.get(t.plantation_id) if t.plantation_id else None
                ),
                last_geotag_at=t.last_geotag_at,
                survival_status=meta.get("survival_status") if isinstance(meta.get("survival_status"), str) else None,
                chainage_km=meta.get("chainage_km") if meta.get("chainage_km") is not None else None,
            )
        )
    return Page[TreeListItem](items=items, page=page, page_size=page_size, total=total or 0)


@router.get("/by-code/{public_code}", response_model=TreeOut)
async def get_tree_by_public_code(public_code: str, user: CurrentUser, db: DB) -> TreeOut:
    """Resolve a tree passport QR / deep link code to the authenticated tree record."""
    res = await db.execute(
        select(Tree)
        .where(Tree.public_code == public_code)
        .options(*_TREE_DETAIL_LOAD)
    )
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(404, detail="tree_not_found")
    if not await can_access_tree(db, user, tree):
        raise HTTPException(403, detail="forbidden")
    return _to_out(tree)


async def _get_owned_tree(tree_id: uuid.UUID, user, db) -> Tree:
    res = await db.execute(
        select(Tree)
        .where(Tree.id == tree_id)
        .options(*_TREE_DETAIL_LOAD)
    )
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(404, detail="tree_not_found")
    if not await can_access_tree(db, user, tree):
        raise HTTPException(403, detail="forbidden")
    return tree


@router.get("/{tree_id}", response_model=TreeOut)
async def get_tree(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> TreeOut:
    tree = await _get_owned_tree(tree_id, user, db)
    return _to_out(tree)


@router.get("/{tree_id}/images/{image_id}/file")
async def get_tree_image_file(
    tree_id: uuid.UUID, image_id: uuid.UUID, user: CurrentUser, db: DB
) -> Response:
    tree = await _get_owned_tree(tree_id, user, db)
    img = next((i for i in tree.images if i.id == image_id), None)
    if img is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="image_not_found")
    data = get_storage().get_bytes(img.s3_key)
    if not data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="image_not_available")
    content_type = "image/jpeg"
    if img.s3_key.lower().endswith(".png"):
        content_type = "image/png"
    elif img.s3_key.lower().endswith(".webp"):
        content_type = "image/webp"
    return Response(content=data, media_type=content_type)


@router.post("/{tree_id}/regeotag", response_model=TreeRegeotagOut)
async def regeotag_tree(
    tree_id: uuid.UUID,
    payload: TreeRegeotag,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> TreeRegeotagOut:
    """Update tree GPS for survival survey / re-geotagging."""
    tree = await _get_owned_tree(tree_id, user, db)
    meta = dict(tree.metadata_ or {})

    project: PlantingProject | None = None
    work_area: PlantationFence | None = None
    if tree.project_id:
        project = await db.get(PlantingProject, tree.project_id)
    if tree.plantation_id:
        work_area = await db.get(PlantationFence, tree.plantation_id)

    compliance_out = None
    if project:
        standard = await get_active_standard(db, project)
        rules = await get_effective_rules(db, standard, project_id=project.id)
        compliance_mode = await resolve_compliance_mode(
            db,
            template_code=standard.template_code if standard else project.standard_template_code,
            project_compliance_mode=project.compliance_mode,
            project_id=project.id,
        )
        photo_count = len(tree.images) if tree.images else 0

        compliance = await evaluate_tree_placement(
            db,
            project=project,
            work_area=work_area,
            rules=rules,
            compliance_mode=compliance_mode,  # type: ignore[arg-type]
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy_m=payload.accuracy_m,
            species_text=tree.species_text,
            species_id=tree.species_id,
            photo_count=photo_count,
            metadata=meta,
            exclude_tree_id=tree.id,
        )

        if not compliance.passed and compliance_mode == "strict":
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "compliance_errors": compliance.to_dict()["issues"],
                    "mode": compliance.mode,
                },
            )

        if compliance.issues:
            await persist_violations(
                db,
                result=compliance,
                project_id=project.id,
                work_area_id=work_area.id if work_area else None,
                tree_id=tree.id,
            )

        if compliance.chainage_km is not None:
            meta["chainage_km"] = str(compliance.chainage_km)

        compliance_out = {
            "passed": compliance.passed,
            "mode": compliance.mode,
            "chainage_km": compliance.chainage_km,
            "issues": compliance.to_dict()["issues"],
        }

    wkt = f"POINT({payload.longitude} {payload.latitude})"
    tree.location = wkt
    if payload.accuracy_m is not None:
        tree.accuracy_m = payload.accuracy_m
    if payload.altitude_m is not None:
        tree.altitude_m = payload.altitude_m
    tree.last_geotag_at = datetime.now(UTC)
    if payload.survival_status:
        meta["survival_status"] = payload.survival_status
    if payload.remarks:
        meta["regeotag_remarks"] = payload.remarks
    meta["last_regeotag_at"] = tree.last_geotag_at.isoformat()
    tree.metadata_ = meta

    survey_notes = payload.remarks
    if payload.survival_status:
        survey_notes = (
            f"Survival: {payload.survival_status}"
            + (f" — {payload.remarks}" if payload.remarks else "")
        )
    await create_measurement(
        db,
        tree=tree,
        payload=TreeMeasurementCreate(
            source="survival_survey",
            method=payload.method or "tape",
            instrument=payload.instrument,
            dbh_cm=payload.dbh_cm,
            height_m=payload.height_m,
            canopy_m=payload.canopy_m,
            gps_accuracy_m=payload.accuracy_m,
            notes=survey_notes,
        ),
        measurer_id=user.id,
    )

    if payload.survival_status:
        from app.schemas.tree_survival import TreeSurvivalEventCreate
        from app.services.trees.survival_events import record_survival_event

        await record_survival_event(
            db,
            tree=tree,
            payload=TreeSurvivalEventCreate(
                status=payload.survival_status,
                cause=payload.remarks,
            ),
            recorder=user,
        )

    gamification = None
    if tree.project_id is None:
        from app.services.citizen.gamification import record_stewardship_checkin

        gamification = await record_stewardship_checkin(db, user=user, tree=tree)

    await refresh_tree_integrity(db, tree)

    await record_audit(
        db,
        actor=user,
        action="tree.regeotag",
        resource_type="tree",
        resource_id=tree.id,
        request=request,
        diff={
            "public_code": tree.public_code,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "survival_status": payload.survival_status,
        },
    )
    await db.commit()
    await db.refresh(tree, attribute_names=["planting_program", "images", "risk_score"])
    base = _to_out(tree)
    return TreeRegeotagOut(
        **base.model_dump(),
        compliance=RegeotagComplianceOut(**compliance_out) if compliance_out else None,
        gamification=gamification,
    )


@router.patch("/{tree_id}", response_model=TreeOut)
async def update_tree(
    tree_id: uuid.UUID,
    payload: TreeUpdate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> TreeOut:
    tree = await _get_owned_tree(tree_id, user, db)
    changes: dict = {}
    for field in ("species_id", "species_text", "planted_at", "status"):
        v = getattr(payload, field)
        if v is not None:
            changes[field] = v
            setattr(tree, field, v)
    if payload.metadata is not None:
        changes["metadata"] = True
        tree.metadata_ = payload.metadata
    await record_audit(
        db,
        actor=user,
        action="tree.update",
        resource_type="tree",
        resource_id=tree.id,
        request=request,
        diff={"public_code": tree.public_code, "changes": changes},
    )
    await db.commit()
    await db.refresh(tree)
    return _to_out(tree)


@router.delete("/{tree_id}", status_code=204)
async def delete_tree(
    tree_id: uuid.UUID, request: Request, user: TreeDeleteAccess, db: DB
) -> Response:
    tree = await _get_owned_tree(tree_id, user, db)
    tree.status = "removed"
    await record_audit(
        db,
        actor=user,
        action="tree.delete",
        resource_type="tree",
        resource_id=tree.id,
        request=request,
        diff={"public_code": tree.public_code},
    )
    await db.commit()
    return Response(status_code=204)


@router.post("/{tree_id}/images", response_model=TreeImageOut, status_code=201)
async def add_image(
    tree_id: uuid.UUID,
    s3_key: str,
    request: Request,
    user: WriteAccess,
    db: DB,
    is_primary: bool = False,
) -> TreeImageOut:
    tree = await _get_owned_tree(tree_id, user, db)
    try:
        assert_owned_upload_key(user.id, s3_key, folders=("images",))
    except ValueError as exc:
        code = str(exc)
        if code == "s3_key_forbidden":
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=code) from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=code) from exc
    img = TreeImage(
        tree_id=tree.id, s3_key=s3_key, is_primary=is_primary, uploaded_by=user.id
    )
    db.add(img)
    await db.flush()
    await record_audit(
        db,
        actor=user,
        action="tree.image.add",
        resource_type="tree",
        resource_id=tree.id,
        request=request,
        diff={"s3_key": s3_key, "image_id": str(img.id), "is_primary": is_primary},
    )
    await db.commit()
    await db.refresh(img)
    return TreeImageOut.model_validate(img)


@router.get("/{tree_id}/passport", response_model=TreePassport)
async def get_passport(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> TreePassport:
    tree = await _get_owned_tree(tree_id, user, db)
    pt = to_shape(tree.location)
    base = "/api/v1/trees"
    return TreePassport(
        id=tree.id,
        public_code=tree.public_code,
        species=tree.species_text,
        latitude=pt.y,
        longitude=pt.x,
        planted_at=tree.planted_at,
        health=tree.current_health,
        carbon_kg=float(tree.current_carbon_kg or 0),
        satellite_verified=tree.satellite_verified,
        qr_url=f"{base}/{tree.id}/qr.png",
        passport_pdf_url=f"{base}/{tree.id}/passport.pdf",
    )


@router.get("/{tree_id}/passport.pdf")
async def get_passport_pdf(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> Response:
    tree = await _get_owned_tree(tree_id, user, db)
    pt = to_shape(tree.location)
    pdf = generate_passport_pdf(
        {
            "id": str(tree.id),
            "public_code": tree.public_code,
            "species": tree.species_text or "Unknown",
            "latitude": pt.y,
            "longitude": pt.x,
            "planted_at": tree.planted_at.isoformat() if tree.planted_at else None,
            "health": tree.current_health,
            "carbon_kg": float(tree.current_carbon_kg or 0),
            "satellite_verified": tree.satellite_verified,
            "qr_url": f"https://byot.earth/p/{tree.public_code}",
        }
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{tree.public_code}.pdf"'},
    )


@router.get("/{tree_id}/qr.png")
async def get_qr_png(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> Response:
    tree = await _get_owned_tree(tree_id, user, db)
    png = generate_qr_png(f"https://byot.earth/p/{tree.public_code}")
    return Response(content=png, media_type="image/png")


@router.get("/{tree_id}/measurements", response_model=Page[TreeMeasurementOut])
async def get_tree_measurements(
    tree_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> Page[TreeMeasurementOut]:
    tree = await _get_owned_tree(tree_id, user, db)
    offset = (page - 1) * page_size
    rows, total = await list_measurements(db, tree.id, limit=page_size, offset=offset)
    items = [TreeMeasurementOut.model_validate(r) for r in rows]
    return Page[TreeMeasurementOut](
        items=items, page=page, page_size=page_size, total=total
    )


@router.post(
    "/{tree_id}/measurements",
    response_model=TreeMeasurementOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_tree_measurement(
    tree_id: uuid.UUID,
    payload: TreeMeasurementCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> TreeMeasurementOut:
    _require_measurement_write(user)
    tree = await _get_owned_tree(tree_id, user, db)
    if payload.photo_key:
        try:
            assert_owned_upload_key(user.id, payload.photo_key, folders=("images",))
        except ValueError as exc:
            code = str(exc)
            if code == "s3_key_forbidden":
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail=code) from exc
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=code) from exc

    row = await create_measurement(
        db,
        tree=tree,
        payload=payload,
        measurer_id=user.id,
    )
    await record_audit(
        db,
        actor=user,
        action="tree.measurement.add",
        resource_type="tree",
        resource_id=tree.id,
        request=request,
        diff={
            "measurement_id": str(row.id),
            "source": row.source,
            "method": row.method,
            "dbh_cm": _as_float(row.dbh_cm),
            "height_m": _as_float(row.height_m),
        },
    )
    await db.commit()
    await db.refresh(row)
    return TreeMeasurementOut.model_validate(row)


@router.get("/{tree_id}/timeline")
async def get_timeline(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> dict:
    tree = await _get_owned_tree(tree_id, user, db)
    measurements, _ = await list_measurements(db, tree.id, limit=200, offset=0)
    from app.services.trees.measurements import measurement_to_dict

    return {
        "tree_id": str(tree.id),
        "registered_at": tree.registered_at.isoformat(),
        "current": {
            "health": tree.current_health,
            "carbon_kg": float(tree.current_carbon_kg or 0),
            "satellite_verified": tree.satellite_verified,
            "dbh_cm": _as_float(tree.current_dbh_cm),
            "height_m": _as_float(tree.current_height_m),
            "canopy_m": _as_float(tree.current_canopy_m),
        },
        "measurements": [measurement_to_dict(m) for m in measurements],
    }


# ---- Vector tile endpoint (PostGIS MVT) -----------------------------------


@router.get("/tiles/{z}/{x}/{y}.mvt", include_in_schema=False)
async def vector_tile(z: int, x: int, y: int, user: CurrentUser, db: DB) -> Response:
    """PostGIS MVT generation scoped like list_trees (incl. field-worker projects)."""
    scope = await mvt_tree_scope_binds(user, db)
    sql = """
    WITH bounds AS (
      SELECT ST_TileEnvelope(:z, :x, :y) AS geom
    ),
    mvtgeom AS (
      SELECT
        ST_AsMVTGeom(ST_Transform(t.location::geometry, 3857), bounds.geom, 4096, 64, true) AS geom,
        t.id, t.public_code, t.current_health, t.current_carbon_kg, t.satellite_verified
      FROM trees t, bounds
      WHERE ST_Intersects(ST_Transform(t.location::geometry, 3857), bounds.geom)
        AND (
          :is_admin
          OR (
            :is_field_worker
            AND (
              t.owner_user_id = :uid
              OR (
                cardinality(CAST(:project_ids AS uuid[])) > 0
                AND t.project_id = ANY(CAST(:project_ids AS uuid[]))
              )
            )
          )
          OR (
            NOT :is_field_worker
            AND NOT :is_admin
            AND (
              t.owner_user_id = :uid
              OR (:org_portfolio AND t.organization_id = :oid)
            )
          )
        )
    )
    SELECT ST_AsMVT(mvtgeom.*, 'trees', 4096, 'geom') FROM mvtgeom;
    """
    from sqlalchemy import text

    res = await db.execute(
        text(sql),
        {
            "z": z,
            "x": x,
            "y": y,
            **scope,
        },
    )
    tile = res.scalar_one()
    return Response(
        content=bytes(tile) if tile else b"",
        media_type="application/vnd.mapbox-vector-tile",
    )
