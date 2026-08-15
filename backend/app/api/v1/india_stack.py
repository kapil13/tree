"""India Stack integration API — eSign, DigiLocker, Aadhaar e-KYC, Bhuvan WMS."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.core.security import Permission, has_permission
from app.services.india_stack.aadhaar_ekyc import aadhaar_ekyc_status, initiate_ekyc
from app.services.india_stack.digilocker import digilocker_status, verify_land_record
from app.services.satellite.bhuvan_wms import bhuvan_status, list_bhuvan_layers
from app.services.signing.india_esign import esign_status, sign_document
from app.services.planting_projects.access import load_project

router = APIRouter(prefix="/india-stack", tags=["india-stack"])


class DigiLockerVerifyRequest(BaseModel):
    document_uri: str | None = None
    land_record_number: str | None = None
    aadhaar_last4: str | None = Field(default=None, min_length=4, max_length=4)


class AadhaarEkycRequest(BaseModel):
    aadhaar_last4: str = Field(min_length=4, max_length=4)
    full_name: str = Field(min_length=2, max_length=255)
    consent: bool = False


class ESignRequest(BaseModel):
    document_hash: str = Field(min_length=64, max_length=64)
    purpose: str = "verifier_attestation"
    signer_name: str | None = None


@router.get("/status")
async def india_stack_status(user: CurrentUser) -> dict:
    """Aggregate status for India Stack integrations."""
    return {
        "esign": esign_status(),
        "digilocker": digilocker_status(),
        "aadhaar_ekyc": aadhaar_ekyc_status(),
        "bhuvan_wms": bhuvan_status(),
    }


@router.get("/bhuvan/layers")
async def bhuvan_wms_layers(user: CurrentUser) -> dict:
    return {"layers": list_bhuvan_layers(), "status": bhuvan_status()}


@router.post("/digilocker/verify")
async def digilocker_verify(payload: DigiLockerVerifyRequest, user: WriteAccess) -> dict:
    return await verify_land_record(
        document_uri=payload.document_uri,
        aadhaar_last4=payload.aadhaar_last4,
        land_record_number=payload.land_record_number,
    )


@router.post("/aadhaar/ekyc")
async def aadhaar_ekyc(payload: AadhaarEkycRequest, user: WriteAccess) -> dict:
    if not payload.consent:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="consent_required")
    return await initiate_ekyc(
        aadhaar_last4=payload.aadhaar_last4,
        full_name=payload.full_name,
        consent=payload.consent,
    )


@router.post("/esign/sign")
async def esign_sign(payload: ESignRequest, user: CurrentUser) -> dict:
    if not has_permission(user.role, Permission.MEASUREMENT_ATTEST) and not has_permission(
        user.role, Permission.ADMIN_ALL
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="verifier_required")
    result = await sign_document(
        payload.document_hash,
        signer_name=payload.signer_name or user.full_name,
        purpose=payload.purpose,
    )
    return result.to_dict()


@router.get("/projects/{project_id}/bhuvan-layers")
async def project_bhuvan_layers(project_id: uuid.UUID, user: CurrentUser, db: DB) -> dict:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    return {
        "project_id": str(project.id),
        "project_code": project.code,
        "layers": list_bhuvan_layers(),
    }
