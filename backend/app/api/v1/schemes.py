"""Central government plantation scheme catalog API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.api.v1.deps import CurrentUser
from app.schemas.scheme import CentralSchemeListOut, CentralSchemeOut, SchemeKpiTargetsOut
from app.services.schemes.registry import get_scheme, list_schemes

router = APIRouter(prefix="/schemes", tags=["schemes"])


def _scheme_out(scheme: dict) -> CentralSchemeOut:
    kpi = scheme.get("kpi_targets") or {}
    return CentralSchemeOut(
        code=scheme["code"],
        label=scheme["label"],
        description=scheme["description"],
        ministry=scheme["ministry"],
        group=scheme["group"],
        program_codes=list(scheme["program_codes"]),
        default_segment=scheme["default_segment"],
        default_compliance_mode=scheme["default_compliance_mode"],
        default_template_code=scheme.get("default_template_code"),
        checklist_codes=list(scheme.get("checklist_codes") or []),
        framework_profiles=list(scheme.get("framework_profiles") or []),
        convergence_allowed=list(scheme.get("convergence_allowed") or []),
        legacy_plantation_category=scheme.get("legacy_plantation_category"),
        state_codes=list(scheme.get("state_codes") or []),
        kpi_targets=SchemeKpiTargetsOut(
            survival_pct_min=kpi.get("survival_pct_min"),
            geo_tagged_pct_min=kpi.get("geo_tagged_pct_min"),
            min_trees=kpi.get("min_trees"),
        ),
        metadata_sections=list(scheme.get("metadata_sections") or []),
    )


@router.get("", response_model=CentralSchemeListOut)
async def list_central_schemes(
    user: CurrentUser,
    program_code: str | None = Query(None, max_length=64),
    audience: str | None = Query(None, max_length=32),
    state_code: str | None = Query(None, max_length=8),
) -> CentralSchemeListOut:
    del user  # auth gate only
    schemes = list_schemes(program_code=program_code, audience=audience, state_code=state_code)
    return CentralSchemeListOut(items=[_scheme_out(s) for s in schemes])


@router.get("/{code}", response_model=CentralSchemeOut)
async def get_central_scheme(code: str, user: CurrentUser) -> CentralSchemeOut:
    del user
    scheme = get_scheme(code)
    if scheme is None or not scheme["active"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="scheme_not_found")
    return _scheme_out(scheme)
