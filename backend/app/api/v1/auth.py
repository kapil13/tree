"""Authentication and user-profile endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.core.config import settings
from app.core.security import (
    Permission,
    create_access_token,
    create_refresh_token,
    decode_token,
    has_permission,
    hash_password,
    permissions_for_role,
    verify_password,
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    CaptchaConfigOut,
    LoginRequest,
    OTPRequest,
    OTPRequestOut,
    OTPVerify,
    RefreshRequest,
    RegisterRequest,
    SignupCompleteRequest,
    SignupStartOut,
    SignupStartRequest,
    SignupStepOut,
    SignupTokenRequest,
    SignupVerifyPhoneRequest,
    TokenResponse,
    UpdateProfile,
    UserOut,
)
from app.services.audit import record_audit
from app.services.auth.captcha import verify_captcha_token
from app.services.auth.google_oauth import exchange_google_code, google_authorize_url
from app.services.auth.otp import (
    DEV_OTP_CODE,
    normalize_phone,
    phone_placeholder_email,
    verify_dev_otp,
)
from app.services.auth.signup import (
    SignupError,
    complete_signup,
    send_signup_email_otp,
    start_signup,
    verify_signup_phone,
)
from app.services.planting_programs.enrollment import ensure_default_enrollment
from app.services.platform.modules import WEBSITE_CMS_MODULE, user_can_access_module

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


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("/captcha-config", response_model=CaptchaConfigOut)
async def captcha_config() -> CaptchaConfigOut:
    return CaptchaConfigOut(
        enabled=settings.captcha_enabled,
        site_key=settings.turnstile_site_key if settings.captcha_enabled else None,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: DB) -> UserOut:
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request))
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
        phone=payload.phone,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()
    await ensure_default_enrollment(db, user.id)
    await record_audit(
        db,
        actor=user,
        action="user.register",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"email": user.email, "role": user.role},
    )
    await db.commit()
    await db.refresh(user)
    return _user_out(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: DB) -> TokenResponse:
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request))
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()
    if user is None or not user.hashed_password or not verify_password(
        payload.password, user.hashed_password
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    user.last_login_at = datetime.now(UTC)
    await record_audit(
        db,
        actor=user,
        action="auth.login",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"method": "password"},
    )
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


def _signup_error(exc: SignupError) -> HTTPException:
    status_code = status.HTTP_400_BAD_REQUEST
    if exc.code in {"email_taken", "phone_taken"}:
        status_code = status.HTTP_409_CONFLICT
    elif exc.code == "signup_session_expired":
        status_code = status.HTTP_410_GONE
    elif exc.code == "invalid_otp":
        status_code = status.HTTP_401_UNAUTHORIZED
    return HTTPException(status_code, detail=exc.code)


@router.post("/signup/start", response_model=SignupStartOut)
async def signup_start(payload: SignupStartRequest, request: Request, db: DB) -> SignupStartOut:
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request))
    try:
        token, dev_hint = await start_signup(
            db,
            full_name=payload.full_name,
            email=str(payload.email),
            phone=payload.phone,
            password=payload.password,
        )
    except SignupError as exc:
        raise _signup_error(exc) from exc
    return SignupStartOut(
        signup_token=token,
        dev_hint=dev_hint,
        sms_enabled=settings.auth_otp_sms_enabled,
    )


@router.post("/signup/verify-phone", response_model=SignupStepOut)
async def signup_verify_phone(payload: SignupVerifyPhoneRequest) -> SignupStepOut:
    try:
        await verify_signup_phone(payload.signup_token, payload.code)
    except SignupError as exc:
        raise _signup_error(exc) from exc
    return SignupStepOut(status="phone_verified")


@router.post("/signup/send-email-otp", response_model=SignupStepOut)
async def signup_send_email_otp(payload: SignupTokenRequest) -> SignupStepOut:
    try:
        dev_hint = await send_signup_email_otp(payload.signup_token)
    except SignupError as exc:
        raise _signup_error(exc) from exc
    return SignupStepOut(status="email_otp_sent", dev_hint=dev_hint)


@router.post("/signup/complete", response_model=TokenResponse)
async def signup_complete(payload: SignupCompleteRequest, request: Request, db: DB) -> TokenResponse:
    try:
        user = await complete_signup(db, payload.signup_token, payload.code)
    except SignupError as exc:
        raise _signup_error(exc) from exc
    await record_audit(
        db,
        actor=user,
        action="user.register",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"email": user.email, "method": "signup_otp", "program": "byot"},
    )
    await db.commit()
    return _tokens_for(user)


@router.post("/otp/request", response_model=OTPRequestOut)
async def request_otp(payload: OTPRequest, request: Request) -> OTPRequestOut:
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request))
    if not payload.email and not payload.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_or_phone")
    if payload.phone:
        try:
            normalize_phone(payload.phone)
        except ValueError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_phone") from exc
    # Production: generate code, store in Redis, send via SMS/email provider.
    dev_hint = None if settings.auth_otp_sms_enabled else DEV_OTP_CODE
    return OTPRequestOut(status="sent", dev_hint=dev_hint, sms_enabled=settings.auth_otp_sms_enabled)


async def _user_from_otp(db: DB, payload: OTPVerify) -> User:
    if payload.phone:
        try:
            phone = normalize_phone(payload.phone)
        except ValueError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_phone") from exc
        res = await db.execute(select(User).where(User.phone == phone))
        user = res.scalar_one_or_none()
        if user is None:
            if not payload.full_name:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="registration_required")
            email = phone_placeholder_email(phone)
            existing_email = await db.execute(select(User).where(User.email == email))
            if existing_email.scalar_one_or_none():
                raise HTTPException(status.HTTP_409_CONFLICT, detail="phone_taken")
            user = User(
                email=email,
                phone=phone,
                full_name=payload.full_name,
                role="user",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()
            await ensure_default_enrollment(db, user.id)
        return user

    if not payload.email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_or_phone_required")
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="user_not_found")
    return user


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(payload: OTPVerify, request: Request, db: DB) -> TokenResponse:
    if not verify_dev_otp(payload.code):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_otp")
    user = await _user_from_otp(db, payload)
    user.is_verified = True
    now = datetime.now(UTC)
    if payload.phone and user.phone_verified_at is None:
        user.phone_verified_at = now
    user.last_login_at = now
    await record_audit(
        db,
        actor=user,
        action="auth.login",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"method": "otp"},
    )
    await db.commit()
    return _tokens_for(user)


def _user_out(user: User, *, platform_access: dict[str, bool] | None = None) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active,
        is_verified=user.is_verified,
        phone_verified=user.phone_verified_at is not None,
        email_verified=user.email_verified_at is not None,
        created_at=user.created_at,
        permissions=permissions_for_role(user.role),
        platform_access=platform_access
        or {
            "website_cms": user.role == "admin",
            "users_admin": user.role == "admin",
        },
    )


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser, db: DB) -> UserOut:
    cms_access = await user_can_access_module(db, role=user.role, module_key=WEBSITE_CMS_MODULE)
    return _user_out(
        user,
        platform_access={
            "website_cms": cms_access,
            "users_admin": has_permission(user.role, Permission.PLATFORM_USERS_MANAGE),
        },
    )


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UpdateProfile, user: CurrentUser, db: DB) -> UserOut:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    await db.commit()
    await db.refresh(user)
    cms_access = await user_can_access_module(db, role=user.role, module_key=WEBSITE_CMS_MODULE)
    return _user_out(
        user,
        platform_access={
            "website_cms": cms_access,
            "users_admin": has_permission(user.role, Permission.PLATFORM_USERS_MANAGE),
        },
    )


@router.get("/google/login")
async def google_login() -> dict[str, str]:
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="google_oauth_not_configured")
    try:
        return {
            "authorize_url": google_authorize_url(),
            "redirect_uri": settings.google_redirect_uri,
        }
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)) from exc


@router.get("/google/callback")
async def google_callback(
    db: DB,
    code: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    frontend = settings.app_frontend_url
    if error or not code:
        return RedirectResponse(f"{frontend}/auth?mode=signin&error=google_denied")

    try:
        profile = await exchange_google_code(code)
    except Exception:
        return RedirectResponse(f"{frontend}/auth?mode=signin&error=google_exchange_failed")

    res = await db.execute(select(User).where(User.google_sub == profile.sub))
    user = res.scalar_one_or_none()
    if user is None:
        email_res = await db.execute(select(User).where(User.email == profile.email))
        user = email_res.scalar_one_or_none()
        if user is None:
            user = User(
                email=profile.email,
                full_name=profile.name,
                google_sub=profile.sub,
                role="user",
                is_active=True,
                is_verified=True,
                email_verified_at=datetime.now(UTC),
            )
            db.add(user)
            await db.flush()
            await ensure_default_enrollment(db, user.id)
        else:
            user.google_sub = profile.sub
            if not user.full_name:
                user.full_name = profile.name

    user.is_verified = True
    user.last_login_at = datetime.now(UTC)
    await db.commit()

    tokens = _tokens_for(user)
    fragment = (
        f"access_token={tokens.access_token}"
        f"&refresh_token={tokens.refresh_token}"
        f"&expires_in={tokens.expires_in}"
    )
    return RedirectResponse(f"{frontend}/auth/callback#{fragment}")
