"""Compliance checklist API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError, ProgrammingError

from app.api.v1.deps import DB, CurrentUser
from app.schemas.compliance_checklist import ChecklistSaveRequest
from app.services.audit import record_audit
from app.services.compliance.checklists import get_checklist, list_checklists
from app.services.compliance.evaluator import (
    build_project_checklist_state,
    list_project_checklist_summaries,
    save_project_checklist_responses,
)
from app.services.planting_projects.access import can_manage_project, load_project

router = APIRouter(prefix="/compliance", tags=["compliance"])


def _raise_checklist_db_error(exc: Exception) -> None:
    raw = str(getattr(exc, "orig", exc))
    if "project_checklist_responses" in raw:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="compliance_checklist_migration_required",
        ) from exc


@router.get("/checklists")
async def get_checklist_catalog() -> list[dict]:
    """List guided eligibility checklist templates."""
    return list_checklists()


@router.get("/projects/{project_id}/checklists")
async def get_project_checklists(
    project_id: uuid.UUID, user: CurrentUser, db: DB
) -> list[dict]:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        return await list_project_checklist_summaries(db, project)
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_checklist_db_error(exc)
        raise


@router.get("/projects/{project_id}/checklists/{checklist_code}")
async def get_project_checklist(
    project_id: uuid.UUID,
    checklist_code: str,
    user: CurrentUser,
    db: DB,
) -> dict:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if get_checklist(checklist_code) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="unknown_checklist")
    try:
        return await build_project_checklist_state(db, project, checklist_code)
    except ValueError as exc:
        if str(exc) == "unknown_checklist":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        raise
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_checklist_db_error(exc)
        raise


@router.put("/projects/{project_id}/checklists/{checklist_code}")
async def save_project_checklist(
    project_id: uuid.UUID,
    checklist_code: str,
    payload: ChecklistSaveRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> dict:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    if get_checklist(checklist_code) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="unknown_checklist")

    answers = {
        item_id: answer.model_dump(exclude_none=True)
        for item_id, answer in payload.answers.items()
    }
    try:
        state = await save_project_checklist_responses(
            db,
            project,
            checklist_code,
            answers,
            actor_user_id=user.id,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "unknown_checklist":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        if code.startswith("invalid_answer"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code) from exc
        raise
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_checklist_db_error(exc)
        raise

    await record_audit(
        db,
        actor=user,
        action="compliance.checklist.save",
        resource_type="planting_project",
        resource_id=project.id,
        request=request,
        diff={
            "checklist_code": checklist_code,
            "completion_pct": state["completion_pct"],
            "score_pct": state["score_pct"],
            "eligibility_status": state["eligibility_status"],
        },
    )
    await db.commit()
    return state
