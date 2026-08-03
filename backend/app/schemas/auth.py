from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    # Public self-serve registration is citizen-only. Professional roles
    # (ngo/corporate/government) require platform program-access approval.
    role: Literal["user"] = "user"
    organization_name: str | None = None
    phone: str | None = None
    captcha_token: str | None = None


class SignupStartRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=10, max_length=32)
    captcha_token: str | None = None
    signup_category: str = Field(
        default="byot",
        description="byot | government_nhai | corporate_esg | ngo_community",
    )


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
    email_enabled: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr
    captcha_token: str | None = None


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)
    password: str = Field(min_length=12, max_length=128)
    captcha_token: str | None = None


class PasswordResetOut(BaseModel):
    status: str
    dev_hint: str | None = None
    email_enabled: bool = False


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
    is_org_admin: bool = False
    org_role: str | None = None
    organization_name: str | None = None
    enrolled_program_codes: list[str] = Field(default_factory=list)
    has_professional_program: bool = False
    onboarding_status: str = "active_byot"
    pending_program_code: str | None = None
    pending_access_request_id: uuid.UUID | None = None
    impersonation: dict | None = None


class UpdateProfile(BaseModel):
    full_name: str | None = None
    phone: str | None = None
