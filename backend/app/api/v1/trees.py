"""Tree CRUD, images, passport, QR."""

from __future__ import annotations

import secrets
import string
import uuid

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
    TreeUpdate,
)
from app.services.planting_programs.enrollment import (
    get_program_by_code,
    list_available_programs,
    list_enrolled_programs,
    list_user_program_codes,
    set_user_programs,
    user_can_use_program,
)
from app.services.planting_programs.validation import ProgramValidationError, validate_program_payload

router = APIRouter(prefix="/trees", tags=["trees"])

_ALPHABET = string.ascii_uppercase + string.digits


def _gen_public_code() -> str:
    p1 = "".join(secrets.choice(_ALPHABET) for _ in range(4))
    p2 = "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"BYOT-{p1}-{p2}"


def _to_out(tree: Tree) -> TreeOut:
    out = TreeOut.model_validate(tree)
    try:
        pt = to_shape(tree.location)
        out.latitude = pt.y
        out.longitude = pt.x
    except Exception:
        pass
    if tree.planting_program is not None:
        out.program_code = tree.planting_program.code
    out.metadata = tree.metadata_ or {}
    return out


@router.post("", response_model=TreeOut, status_code=status.HTTP_201_CREATED)
async def create_tree(payload: TreeCreate, user: CurrentUser, db: DB) -> TreeOut:
    program = await get_program_by_code(db, payload.program_code)
    if program is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unknown_program")
    if not await user_can_use_program(db, user.id, program):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="program_not_enrolled")

    core_values = {
        "species_text": payload.species_text,
        "species_id": payload.species_id,
        "planted_at": payload.planted_at,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "altitude_m": payload.altitude_m,
        "accuracy_m": payload.accuracy_m,
        "plantation_id": payload.plantation_id,
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
        plantation_id=core_values.get("plantation_id"),
        metadata_=metadata,
    )
    db.add(tree)
    await db.flush()

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
    bbox: str | None = Query(
        None, description="minLon,minLat,maxLon,maxLat"
    ),
) -> Page[TreeListItem]:
    stmt = select(Tree)
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
