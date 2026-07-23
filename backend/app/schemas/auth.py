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
    captcha_token: str | None = None


class SignupStartRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=10, max_length=32)
    captcha_token: str | None = None


class SignupStartOut(BaseModel):
    signup_token: str
    dev_hint: str | None = None
    sms_enabled: bool = False


class SignupTokenRequest(BaseModel):
    signup_token: str


class SignupVerifyPhoneRequest(BaseModel):
    signup_token: str
    code: str = Field(min_length=4, max_length=8)


class SignupCompleteRequest(BaseModel):
    signup_token: str
    code: str = Field(min_length=4, max_length=8)


class SignupStepOut(BaseModel):
    status: str
    dev_hint: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str | None = None


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
    captcha_token: str | None = None


class OTPRequestOut(BaseModel):
    status: str
    dev_hint: str | None = None
    sms_enabled: bool = False


class OTPVerify(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None
    code: str = Field(min_length=4, max_length=8)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)


class CaptchaConfigOut(BaseModel):
    enabled: bool
    provider: str = "turnstile"
    site_key: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    organization_id: uuid.UUID | None
    is_active: bool
    is_verified: bool
    phone_verified: bool = False
    email_verified: bool = False
    created_at: datetime
    permissions: list[str] = Field(default_factory=list)
    platform_access: dict[str, bool] = Field(default_factory=dict)


class UpdateProfile(BaseModel):
    full_name: str | None = None
    phone: str | None = None
