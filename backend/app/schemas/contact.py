"""Public contact inquiry schemas."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator


class OrganizationType(str, Enum):
    corporate_esg = "corporate_esg"
    government = "government"
    mining = "mining"
    ngo = "ngo"
    international = "international"
    other = "other"


class LandHectaresBand(str, Enum):
    under_100 = "under_100"
    h100_1000 = "100_1000"
    h1000_10000 = "1000_10000"
    over_10000 = "over_10000"


class SiteCountBand(str, Enum):
    one = "1"
    two_to_ten = "2_10"
    eleven_to_fifty = "11_50"
    over_fifty = "50_plus"


class ContactInquiryCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)
    organization: str = Field(min_length=2, max_length=200)
    organization_type: OrganizationType
    state: str = Field(min_length=2, max_length=100)
    land_hectares_band: LandHectaresBand
    site_count_band: SiteCountBand
    message: str = Field(min_length=20, max_length=4000)
    website: str = Field(default="", max_length=200)

    @field_validator("website")
    @classmethod
    def reject_honeypot(cls, value: str) -> str:
        if value.strip():
            raise ValueError("invalid_submission")
        return value


class ContactInquiryOut(BaseModel):
    success: bool = True
    message: str = "Thank you for contacting us. We will respond shortly."
