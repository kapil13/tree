"""Authentication and user-profile endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.planting_programs.enrollment import ensure_default_enrollment
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    OTPRequest,
    OTPVerify,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfile,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify(s: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")[:60] or "org"


def _tokens_for(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(
            user.id, role=user.role, org_id=user.organization_id
        ),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DB) -> UserOut:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="email_taken")

    org_id: uuid.UUID | None = None
    if payload.organization_name:
        slug = _slugify(payload.organization_name)
        org = Organization(name=payload.organization_name, slug=slug, type=payload.role)
        db.add(org)
        await db.flush()
        org_id = org.id

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        organization_id=org_id,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()
    await ensure_default_enrollment(db, user.id)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DB) -> TokenResponse:
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()
    if user is None or not user.hashed_password or not verify_password(
        payload.password, user.hashed_password
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    user.last_login_at = datetime.now(UTC)
    await db.commit()
    return _tokens_for(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: DB) -> TokenResponse:
    try:
        data = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_refresh") from None
    if data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="wrong_token_type")
    sub = data.get("sub")
    res = await db.execute(select(User).where(User.id == uuid.UUID(sub)))
    user = res.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="inactive_user")
    return _tokens_for(user)


@router.post("/otp/request")
async def request_otp(payload: OTPRequest) -> dict[str, str]:
    if not payload.email and not payload.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_or_phone")
    # In production: generate, store in Redis with TTL, deliver via SES/SNS.
    return {"status": "sent"}


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(payload: OTPVerify, db: DB) -> TokenResponse:
    # Dev stub: accept code "000000" for any known email.
    if payload.code != "000000":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_otp")
    if not payload.email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_required")
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    user.is_verified = True
    await db.commit()
    return _tokens_for(user)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UpdateProfile, user: CurrentUser, db: DB) -> UserOut:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/google/login")
async def google_login() -> dict[str, str]:
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="google_oauth_not_configured")
    # In production: redirect to Google with PKCE.
    return {
        "authorize_url": (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.google_client_id}&response_type=code&scope=openid%20email%20profile"
            f"&redirect_uri={settings.google_redirect_uri}"
        )
    }


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(code: str, db: DB) -> TokenResponse:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="google_oauth_not_implemented")
