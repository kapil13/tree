"""Public contact inquiry endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.rate_limit import rate_limit
from app.schemas.contact import ContactInquiryCreate, ContactInquiryOut
from app.services.contact.inquiry import ContactInquiryError, deliver_contact_inquiry

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post(
    "",
    response_model=ContactInquiryOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[rate_limit(5, 300)],
)
async def submit_contact_inquiry(payload: ContactInquiryCreate) -> ContactInquiryOut:
    try:
        await deliver_contact_inquiry(payload)
    except ContactInquiryError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": exc.code,
                "message": "Unable to send your inquiry right now. Please try again later.",
            },
        ) from exc
    return ContactInquiryOut()
