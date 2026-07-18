"""Tree CRUD, images, passport, QR."""

from __future__ import annotations

import secrets
import string
import uuid

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, Response, status
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.v1.deps import DB, CurrentUser
from app.models.tree import Tree
from app.models.tree_image import TreeImage
from app.schemas.common import Page
from app.schemas.tree import (
    TreeCreate,
    TreeImageOut,
    TreeListItem,
    TreeOut,
    TreePassport,
    TreeRegeotag,
    TreeUpdate,
)
from app.services.passport import generate_passport_pdf, generate_qr_png
from app.models.planting_project import PlantingProject
from app.models.plantation_fence import PlantationFence
from app.services.planting_programs.enrollment import (
    get_program_by_code,
    list_available_programs,
    list_enrolled_programs,
    list_user_program_codes,
    set_user_programs,
    user_can_use_program,
)
from app.services.planting_programs.validation import ProgramValidationError, validate_program_payload
from app.services.planting_projects.compliance import evaluate_tree_placement, persist_violations
from app.services.planting_projects.constants import PROGRAM_DEFAULT_COMPLIANCE
from app.services.planting_projects.service import get_active_standard
from app.services.storage import get_storage

router = APIRouter(prefix="/trees", tags=["trees"])

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
        plantation_id=tree.plantation_id,
        project_id=tree.project_id,
        last_geotag_at=tree.last_geotag_at,
        created_at=tree.created_at,
    )


@router.post("", response_model=TreeOut, status_code=status.HTTP_201_CREATED)
async def create_tree(payload: TreeCreate, user: CurrentUser, db: DB) -> TreeOut:
    program = await get_program_by_code(db, payload.program_code)
    if program is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unknown_program")
    if not await user_can_use_program(db, user.id, program):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="program_not_enrolled")

    work_area_id = payload.work_area_id or payload.plantation_id
    work_area: PlantationFence | None = None
    project: PlantingProject | None = None

    if work_area_id:
        res = await db.execute(
            select(PlantationFence).where(PlantationFence.id == work_area_id)
        )
        work_area = res.scalar_one_or_none()
        if work_area is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="work_area_not_found")
        if work_area.project_id:
            proj_res = await db.execute(
                select(PlantingProject).where(PlantingProject.id == work_area.project_id)
            )
            project = proj_res.scalar_one_or_none()

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
    try:
        metadata = validate_program_payload(
            program.code,
            core_values=core_values,
            metadata=payload.metadata,
            photo_count=len(payload.photo_keys),
        )
    except ProgramValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"validation_errors": exc.errors},
        ) from exc

    rules: dict = {}
    if project:
        standard = await get_active_standard(db, project)
        rules = standard.rules if standard else {}

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
    )

    if not compliance.passed:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "compliance_errors": compliance.to_dict()["issues"],
                "mode": compliance.mode,
            },
        )

    if compliance_mode == "strict" and program.code in (
        "government_nhai",
        "corporate_esg",
    ):
        if work_area_id is None:
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

    for idx, key in enumerate(payload.photo_keys):
        db.add(
            TreeImage(
                tree_id=tree.id,
                s3_key=key,
                is_primary=(idx == 0),
                uploaded_by=user.id,
            )
        )
    await db.commit()
    await db.refresh(tree, attribute_names=["planting_program"])
    return _to_out(tree)


@router.get("", response_model=Page[TreeListItem])
async def list_trees(
    user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    health: str | None = None,
    species_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    work_area_id: uuid.UUID | None = None,
    bbox: str | None = Query(
        None, description="minLon,minLat,maxLon,maxLat"
    ),
) -> Page[TreeListItem]:
    stmt = select(Tree).options(selectinload(Tree.planting_program))
    if user.role != "admin":
        if user.organization_id:
            stmt = stmt.where(
                (Tree.owner_user_id == user.id)
                | (Tree.organization_id == user.organization_id)
            )
        else:
            stmt = stmt.where(Tree.owner_user_id == user.id)
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
                last_geotag_at=t.last_geotag_at,
                survival_status=meta.get("survival_status") if isinstance(meta.get("survival_status"), str) else None,
                chainage_km=meta.get("chainage_km") if meta.get("chainage_km") is not None else None,
            )
        )
    return Page[TreeListItem](items=items, page=page, page_size=page_size, total=total or 0)


async def _get_owned_tree(tree_id: uuid.UUID, user, db) -> Tree:
    res = await db.execute(
        select(Tree)
        .where(Tree.id == tree_id)
        .options(selectinload(Tree.images), selectinload(Tree.planting_program))
    )
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(404, detail="tree_not_found")
    if user.role != "admin" and tree.owner_user_id != user.id and (
        not user.organization_id or tree.organization_id != user.organization_id
    ):
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


@router.post("/{tree_id}/regeotag", response_model=TreeOut)
async def regeotag_tree(
    tree_id: uuid.UUID, payload: TreeRegeotag, user: CurrentUser, db: DB
) -> TreeOut:
    """Update tree GPS for survival survey / re-geotagging."""
    tree = await _get_owned_tree(tree_id, user, db)
    wkt = f"POINT({payload.longitude} {payload.latitude})"
    tree.location = wkt
    if payload.accuracy_m is not None:
        tree.accuracy_m = payload.accuracy_m
    if payload.altitude_m is not None:
        tree.altitude_m = payload.altitude_m
    tree.last_geotag_at = datetime.now(UTC)
    meta = dict(tree.metadata_ or {})
    if payload.survival_status:
        meta["survival_status"] = payload.survival_status
    if payload.remarks:
        meta["regeotag_remarks"] = payload.remarks
    meta["last_regeotag_at"] = tree.last_geotag_at.isoformat()
    tree.metadata_ = meta
    await db.commit()
    await db.refresh(tree, attribute_names=["planting_program"])
    return _to_out(tree)


@router.patch("/{tree_id}", response_model=TreeOut)
async def update_tree(
    tree_id: uuid.UUID, payload: TreeUpdate, user: CurrentUser, db: DB
) -> TreeOut:
    tree = await _get_owned_tree(tree_id, user, db)
    for field in ("species_id", "species_text", "planted_at", "status"):
        v = getattr(payload, field)
        if v is not None:
            setattr(tree, field, v)
    if payload.metadata is not None:
        tree.metadata_ = payload.metadata
    await db.commit()
    await db.refresh(tree)
    return _to_out(tree)


@router.delete("/{tree_id}", status_code=204)
async def delete_tree(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> Response:
    tree = await _get_owned_tree(tree_id, user, db)
    tree.status = "removed"
    await db.commit()
    return Response(status_code=204)


@router.post("/{tree_id}/images", response_model=TreeImageOut, status_code=201)
async def add_image(
    tree_id: uuid.UUID,
    s3_key: str,
    user: CurrentUser,
    db: DB,
    is_primary: bool = False,
) -> TreeImageOut:
    tree = await _get_owned_tree(tree_id, user, db)
    img = TreeImage(
        tree_id=tree.id, s3_key=s3_key, is_primary=is_primary, uploaded_by=user.id
    )
    db.add(img)
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


@router.get("/{tree_id}/timeline")
async def get_timeline(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> dict:
    tree = await _get_owned_tree(tree_id, user, db)
    # Return any historical analyses + satellite samples we have. (Synth values
    # in dev because the tree_metrics_ts hypertable is empty without a worker run.)
    return {
        "tree_id": str(tree.id),
        "registered_at": tree.registered_at.isoformat(),
        "current": {
            "health": tree.current_health,
            "carbon_kg": float(tree.current_carbon_kg or 0),
            "satellite_verified": tree.satellite_verified,
        },
    }


# ---- Vector tile endpoint (PostGIS MVT) -----------------------------------


@router.get("/tiles/{z}/{x}/{y}.mvt", include_in_schema=False)
async def vector_tile(z: int, x: int, y: int, user: CurrentUser, db: DB) -> Response:
    # PostGIS MVT generation. Scoped to the user's accessible trees.
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
        AND (t.owner_user_id = :uid OR t.organization_id = :oid OR :is_admin)
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
            "uid": user.id,
            "oid": user.organization_id or uuid.UUID(int=0),
            "is_admin": user.role == "admin",
        },
    )
    tile = res.scalar_one()
    return Response(
        content=bytes(tile) if tile else b"",
        media_type="application/vnd.mapbox-vector-tile",
    )
