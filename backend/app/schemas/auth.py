from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    role: Literal["user", "farmer", "ngo", "corporate", "government"] = "user"
    organization_name: str | None = None
    phone: str | None = None
    program_codes: list[str] = Field(default_factory=list)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class OTPRequest(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None


class OTPRequestOut(BaseModel):
    status: str
    dev_hint: str | None = None
    sms_enabled: bool = False


class OTPVerify(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None
    code: str = Field(min_length=4, max_length=8)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    organization_id: uuid.UUID | None
    is_active: bool
    is_verified: bool
    created_at: datetime


class UpdateProfile(BaseModel):
    full_name: str | None = None
    phone: str | None = None
