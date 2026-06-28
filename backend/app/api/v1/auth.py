"""Authentication and user-profile endpoints."""

from __future__ import annotations

import secrets
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
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    OTPRequest,
    OTPRequestResponse,
    OTPVerify,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfile,
    UserOut,
)
from app.services.auth import otp as otp_service
from app.services.notifications.notifier import get_notifier

from app.core.logging import get_logger

router = APIRouter(prefix="/auth", tags=["auth"])
log = get_logger("auth")


def _slugify(s: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")[:60] or "org"


async def _unique_org_slug(db: DB, base_slug: str) -> str:
    slug = base_slug
    for _ in range(8):
        existing = await db.execute(select(Organization).where(Organization.slug == slug))
        if existing.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}-{secrets.token_hex(3)}"
    return f"{base_slug}-{uuid.uuid4().hex[:8]}"


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
        slug = await _unique_org_slug(db, _slugify(payload.organization_name))
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
    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="email_not_verified")
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


@router.post("/otp/request", response_model=OTPRequestResponse)
async def request_otp(payload: OTPRequest, db: DB) -> OTPRequestResponse:
    if not payload.email and not payload.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_or_phone")

    channel: otp_service.Channel
    identifier: str
    if payload.email:
        channel = "email"
        identifier = payload.email.lower()
        res = await db.execute(select(User).where(User.email == identifier))
        user = res.scalar_one_or_none()
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
        if user.is_verified:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="already_verified")
    else:
        channel = "sms"
        identifier = payload.phone or ""
        res = await db.execute(select(User).where(User.phone == identifier))
        user = res.scalar_one_or_none()
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
        if user.is_verified:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="already_verified")

    code = otp_service.generate_code()
    try:
        await otp_service.store_code(channel, identifier, code)
    except RuntimeError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, detail="otp_storage_unavailable"
        ) from None

    notifier = get_notifier()
    to = identifier if channel == "email" else identifier
    await notifier.send(
        channel=channel,
        to=to,
        title="Your BYOT verification code",
        message=f"Your verification code is {code}. It expires in {settings.otp_ttl_seconds // 60} minutes.",
    )
    log.info("otp.requested", channel=channel, identifier=identifier, code=code)

    dev_code = code if settings.app_env == "development" else None
    return OTPRequestResponse(status="sent", channel=channel, dev_code=dev_code)


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(payload: OTPVerify, db: DB) -> TokenResponse:
    if not payload.email and not payload.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_or_phone")

    channel: otp_service.Channel
    identifier: str
    if payload.email:
        channel = "email"
        identifier = payload.email.lower()
        res = await db.execute(select(User).where(User.email == identifier))
    else:
        channel = "sms"
        identifier = payload.phone or ""
        res = await db.execute(select(User).where(User.phone == identifier))

    user = res.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")

    try:
        valid = await otp_service.verify_code(channel, identifier, payload.code)
    except RuntimeError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, detail="otp_storage_unavailable"
        ) from None

    if not valid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_otp")

    user.is_verified = True
    user.last_login_at = datetime.now(UTC)
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
