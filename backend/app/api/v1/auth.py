"""Authentication and user-profile endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser, bearer_scheme
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    permissions_for_role,
    verify_password,
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    CaptchaConfigOut,
    ChangePasswordOut,
    ChangePasswordRequest,
    LoginRequest,
    OtpConfigOut,
    OTPRequest,
    OTPRequestOut,
    OTPVerify,
    PasswordResetConfirm,
    PasswordResetOut,
    PasswordResetRequest,
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
from app.schemas.planting_program import OrgProfileSubmit
from app.services.audit import record_audit
from app.services.auth.captcha import verify_captcha_token
from app.services.auth.change_password import ChangePasswordError, change_password
from app.services.auth.google_oauth import exchange_google_code, google_authorize_url
from app.services.auth.msg91_sender import (
    SmsSendError,
    msg91_public_config,
    send_auth_otp_sms,
    sms_auth_configured,
)
from app.services.auth.oauth_state import consume_oauth_state, issue_oauth_state
from app.services.auth.org_access import assert_user_may_authenticate
from app.services.auth.otp import (
    normalize_phone,
    otp_dev_hint,
    phone_placeholder_email,
)
from app.services.auth.otp_store import check_otp, issue_otp
from app.services.auth.password_reset import (
    PasswordResetError,
    confirm_password_reset,
    request_password_reset,
)
from app.services.auth.profile_helpers import age_from_date_of_birth
from app.services.auth.ses_email_sender import (
    EmailSendError,
    send_auth_otp_email,
    ses_otp_configured,
)
from app.services.auth.sessions import token_issued_before_invalidation
from app.services.auth.signup import (
    SignupError,
    complete_signup,
    send_signup_email_otp,
    start_signup,
    verify_signup_phone,
)
from app.services.auth.token_denylist import is_jti_revoked, revoke_jti
from app.services.auth.user_profile import (
    user_enrolled_program_codes,
    user_has_professional_program,
)
from app.services.planting_programs.access_notifications import notify_admins_new_access_request
from app.services.planting_programs.access_requests import AccessRequestError
from app.services.planting_programs.enrollment import ensure_default_enrollment
from app.services.planting_programs.onboarding import (
    OnboardingStateOut,
    OrgProfileIn,
    get_user_onboarding_state,
    repair_stale_onboarding_requests,
    submit_org_profile,
)
from app.services.platform.governance import assert_registration_allowed
from app.services.platform.modules import build_platform_access_map

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
        skip_for_mobile=settings.captcha_enabled,
    )


@router.get("/otp-config", response_model=OtpConfigOut)
async def otp_config() -> OtpConfigOut:
    msg91 = msg91_public_config()
    return OtpConfigOut(
        sms_enabled=msg91["sms_enabled"],
        sms_configured=msg91["sms_configured"],
        sms_template_configured=msg91["sms_template_configured"],
        email_enabled=settings.auth_otp_email_enabled,
        email_configured=ses_otp_configured(),
        invite_sms_enabled=msg91["invite_sms_enabled"],
        invite_sms_configured=msg91["invite_sms_configured"],
        dev_otp_allowed=settings.allow_dev_otp,
    )


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[rate_limit(10, 60)],
)
async def register(payload: RegisterRequest, request: Request, db: DB) -> UserOut:
    if settings.app_env in ("production", "staging"):
        raise HTTPException(
            status.HTTP_410_GONE,
            detail="use_signup_otp_flow",
        )
    await assert_registration_allowed(db)
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request), request=request)
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="email_taken")

    # Hard-lock: public register never grants professional roles.
    role = "user"

    org_id: uuid.UUID | None = None
    if payload.organization_name:
        slug = _slugify(payload.organization_name)
        org = Organization(name=payload.organization_name, slug=slug, type="individual")
        db.add(org)
        await db.flush()
        org_id = org.id

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=role,
        organization_id=org_id,
        phone=payload.phone,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()
    from app.services.privacy.consent import record_signup_consents

    ip = request.client.host if request.client else None
    await record_signup_consents(
        db, user=user, ip=ip, user_agent=request.headers.get("user-agent")
    )
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


@router.post("/login", response_model=TokenResponse, dependencies=[rate_limit(30, 60)])
async def login(payload: LoginRequest, request: Request, db: DB) -> TokenResponse:
    await verify_captcha_token(
        payload.captcha_token,
        remote_ip=_client_ip(request),
        request=request,
        client_platform=payload.client_platform,
    )
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()
    if user is None or not user.hashed_password or not verify_password(
        payload.password, user.hashed_password
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    await assert_user_may_authenticate(db, user)
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


def _password_reset_error(exc: PasswordResetError) -> HTTPException:
    if exc.code == "invalid_otp":
        return HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_otp")
    if exc.code in {
        "email_otp_not_configured",
        "email_send_failed",
        "email_dependencies_missing",
    }:
        return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.code)
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code)


@router.post(
    "/password-reset/request",
    response_model=PasswordResetOut,
    dependencies=[rate_limit(10, 60)],
)
async def password_reset_request(
    payload: PasswordResetRequest, request: Request, db: DB
) -> PasswordResetOut:
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request), request=request)
    try:
        dev_hint = await request_password_reset(db, payload.email)
    except PasswordResetError as exc:
        raise _password_reset_error(exc) from exc
    return PasswordResetOut(
        status="sent",
        dev_hint=dev_hint,
        email_enabled=ses_otp_configured(),
    )


@router.post(
    "/password-reset/confirm",
    response_model=TokenResponse,
    dependencies=[rate_limit(20, 60)],
)
async def password_reset_confirm(
    payload: PasswordResetConfirm, request: Request, db: DB
) -> TokenResponse:
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request), request=request)
    try:
        user = await confirm_password_reset(
            db,
            email=payload.email,
            code=payload.code,
            password=payload.password,
        )
        await assert_user_may_authenticate(db, user)
        user.last_login_at = datetime.now(UTC)
        await record_audit(
            db,
            actor=user,
            action="auth.password_reset",
            resource_type="user",
            resource_id=user.id,
            request=request,
            diff={"method": "email_otp"},
        )
        await db.commit()
    except PasswordResetError as exc:
        raise _password_reset_error(exc) from exc
    return _tokens_for(user)


@router.post("/refresh", response_model=TokenResponse, dependencies=[rate_limit(60, 60)])
async def refresh(payload: RefreshRequest, db: DB) -> TokenResponse:
    try:
        data = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_refresh") from None
    if data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="wrong_token_type")
    jti = data.get("jti")
    if not jti or await is_jti_revoked(str(jti)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_refresh")
    sub = data.get("sub")
    res = await db.execute(select(User).where(User.id == uuid.UUID(sub)))
    user = res.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="inactive_user")
    if token_issued_before_invalidation(user, data.get("iat")):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="session_revoked")
    await assert_user_may_authenticate(db, user)
    # Rotate: revoke the presented refresh token before issuing a new pair.
    exp = data.get("exp")
    await revoke_jti(str(jti), expires_at=int(exp) if exp is not None else None)
    return _tokens_for(user)


@router.post("/logout", dependencies=[rate_limit(60, 60)])
async def logout(payload: RefreshRequest) -> dict[str, str]:
    """Revoke the presented refresh token (idempotent)."""
    try:
        data = decode_token(payload.refresh_token)
    except ValueError:
        return {"status": "ok"}
    if data.get("type") == "refresh" and data.get("jti"):
        exp = data.get("exp")
        await revoke_jti(str(data["jti"]), expires_at=int(exp) if exp is not None else None)
    return {"status": "ok"}


def _signup_error(exc: SignupError) -> HTTPException:
    status_code = status.HTTP_400_BAD_REQUEST
    if exc.code in {"email_taken", "phone_taken"}:
        status_code = status.HTTP_409_CONFLICT
    elif exc.code == "signup_session_expired":
        status_code = status.HTTP_410_GONE
    elif exc.code == "invalid_signup_category":
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    elif exc.code == "invalid_otp":
        status_code = status.HTTP_401_UNAUTHORIZED
    elif exc.code in {
        "email_send_failed",
        "email_otp_not_configured",
        "email_dependencies_missing",
        "sms_not_configured",
        "sms_send_failed",
    }:
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HTTPException(status_code, detail=exc.code)


@router.post("/signup/start", response_model=SignupStartOut, dependencies=[rate_limit(10, 60)])
async def signup_start(payload: SignupStartRequest, request: Request, db: DB) -> SignupStartOut:
    await assert_registration_allowed(db)
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request), request=request)
    try:
        token, dev_hint = await start_signup(
            db,
            full_name=payload.full_name,
            email=str(payload.email),
            phone=payload.phone,
            password=payload.password,
            signup_category=payload.signup_category,
        )
    except SignupError as exc:
        raise _signup_error(exc) from exc
    return SignupStartOut(
        signup_token=token,
        dev_hint=dev_hint,
        sms_enabled=sms_auth_configured(),
    )


@router.post(
    "/signup/verify-phone",
    response_model=SignupStepOut,
    dependencies=[rate_limit(20, 60)],
)
async def signup_verify_phone(payload: SignupVerifyPhoneRequest) -> SignupStepOut:
    try:
        await verify_signup_phone(payload.signup_token, payload.code)
    except SignupError as exc:
        raise _signup_error(exc) from exc
    return SignupStepOut(status="phone_verified")


@router.post(
    "/signup/send-email-otp",
    response_model=SignupStepOut,
    dependencies=[rate_limit(10, 60)],
)
async def signup_send_email_otp(payload: SignupTokenRequest) -> SignupStepOut:
    try:
        dev_hint = await send_signup_email_otp(payload.signup_token)
    except SignupError as exc:
        raise _signup_error(exc) from exc
    return SignupStepOut(
        status="email_otp_sent",
        dev_hint=dev_hint,
        email_enabled=ses_otp_configured(),
    )


@router.post(
    "/signup/complete",
    response_model=TokenResponse,
    dependencies=[rate_limit(20, 60)],
)
async def signup_complete(payload: SignupCompleteRequest, request: Request, db: DB) -> TokenResponse:
    try:
        user = await complete_signup(
            db,
            payload.signup_token,
            payload.code,
            signup_category=payload.signup_category,
        )
    except SignupError as exc:
        raise _signup_error(exc) from exc
    from app.services.privacy.consent import record_signup_consents

    ip = request.client.host if request.client else None
    await record_signup_consents(
        db, user=user, ip=ip, user_agent=request.headers.get("user-agent")
    )
    onboarding = await get_user_onboarding_state(db, user.id)
    await record_audit(
        db,
        actor=user,
        action="user.register",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={
            "email": user.email,
            "method": "signup_otp",
            "signup_category": onboarding.program_code or "byot",
            "onboarding_status": onboarding.status,
        },
    )
    await db.commit()
    return _tokens_for(user)


@router.post("/otp/request", response_model=OTPRequestOut, dependencies=[rate_limit(10, 60)])
async def request_otp(payload: OTPRequest, request: Request) -> OTPRequestOut:
    await verify_captcha_token(payload.captcha_token, remote_ip=_client_ip(request), request=request)
    if not payload.email and not payload.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_or_phone")
    phone: str | None = None
    if payload.phone:
        try:
            phone = normalize_phone(payload.phone)
        except ValueError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_phone") from exc

    identifier = phone or (payload.email or "").strip().lower()
    purpose = "login_phone" if phone else "login_email"

    if phone and not sms_auth_configured() and not settings.allow_dev_otp:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="sms_not_configured")
    if (
        not phone
        and not settings.auth_otp_email_enabled
        and not settings.allow_dev_otp
    ):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="email_otp_not_configured")

    code = await issue_otp(purpose, identifier)

    if phone:
        if sms_auth_configured():
            try:
                await send_auth_otp_sms(phone=phone, code=code)
            except SmsSendError as exc:
                if not settings.allow_dev_otp:
                    raise HTTPException(
                        status.HTTP_503_SERVICE_UNAVAILABLE, detail="sms_send_failed"
                    ) from exc
                return OTPRequestOut(
                    status="sent",
                    dev_hint=otp_dev_hint(code),
                    sms_enabled=False,
                )
            return OTPRequestOut(
                status="sent",
                dev_hint=None,
                sms_enabled=True,
            )
        return OTPRequestOut(
            status="sent",
            dev_hint=otp_dev_hint(code),
            sms_enabled=False,
        )

    if ses_otp_configured():
        try:
            await send_auth_otp_email(to=identifier, code=code)
            return OTPRequestOut(
                status="sent",
                dev_hint=None,
                sms_enabled=False,
            )
        except EmailSendError as exc:
            if not settings.allow_dev_otp:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.code
                ) from exc

    return OTPRequestOut(
        status="sent",
        dev_hint=otp_dev_hint(code),
        sms_enabled=False,
    )


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


@router.post("/otp/verify", response_model=TokenResponse, dependencies=[rate_limit(20, 60)])
async def verify_otp(payload: OTPVerify, request: Request, db: DB) -> TokenResponse:
    purpose = "login_phone" if payload.phone else "login_email"
    identifier: str
    if payload.phone:
        try:
            identifier = normalize_phone(payload.phone)
        except ValueError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_phone") from exc
    elif payload.email:
        identifier = payload.email.strip().lower()
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_or_phone_required")

    if not await check_otp(purpose, identifier, payload.code):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_otp")

    user = await _user_from_otp(db, payload)
    await assert_user_may_authenticate(db, user)
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


def _user_out(
    user: User,
    *,
    platform_access: dict[str, bool] | None = None,
    enrolled_program_codes: list[str] | None = None,
    organization_name: str | None = None,
    impersonation: dict[str, str] | None = None,
    onboarding_status: str = "active_byot",
    pending_program_code: str | None = None,
    pending_access_request_id: uuid.UUID | None = None,
) -> UserOut:
    codes = enrolled_program_codes or []
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
        is_org_admin=user.is_org_admin,
        org_role=user.org_role,
        organization_name=organization_name,
        enrolled_program_codes=codes,
        has_professional_program=user_has_professional_program(codes),
        onboarding_status=onboarding_status,
        pending_program_code=pending_program_code,
        pending_access_request_id=pending_access_request_id,
        impersonation=impersonation,
        locale=user.locale,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        date_of_marriage=user.date_of_marriage,
        city=user.city,
        state=user.state,
        age=age_from_date_of_birth(user.date_of_birth),
        has_password=user.hashed_password is not None,
    )


async def _user_out_enriched(
    db: DB,
    user: User,
    *,
    impersonation: dict[str, str] | None = None,
) -> UserOut:
    platform_access = await build_platform_access_map(db, role=user.role, user_id=user.id)
    codes = await user_enrolled_program_codes(db, user.id)
    org_name = None
    if user.organization_id:
        org = await db.get(Organization, user.organization_id)
        org_name = org.name if org else None
    onboarding = await get_user_onboarding_state(db, user.id)
    return _user_out(
        user,
        platform_access=platform_access,
        enrolled_program_codes=codes,
        organization_name=org_name,
        impersonation=impersonation,
        onboarding_status=onboarding.status,
        pending_program_code=onboarding.program_code,
        pending_access_request_id=onboarding.access_request_id,
    )


@router.get("/onboarding", response_model=OnboardingStateOut)
async def onboarding_state(user: CurrentUser, db: DB) -> OnboardingStateOut:
    return await get_user_onboarding_state(db, user.id)


@router.post("/onboarding/org-profile", response_model=OnboardingStateOut)
async def submit_onboarding_org_profile(
    payload: OrgProfileSubmit, user: CurrentUser, db: DB
) -> OnboardingStateOut:
    try:
        request = await submit_org_profile(
            db,
            user_id=user.id,
            profile=OrgProfileIn.model_validate(payload.model_dump()),
        )
        await db.commit()
        await notify_admins_new_access_request(db, request=request)
    except AccessRequestError as exc:
        status_code = (
            status.HTTP_404_NOT_FOUND
            if exc.code == "onboarding_not_started"
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code, detail=exc.code) from exc
    return await get_user_onboarding_state(db, user.id)


@router.get("/me", response_model=UserOut)
async def me(
    user: CurrentUser,
    db: DB,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UserOut:
    impersonation = None
    if creds is not None:
        try:
            payload = decode_token(creds.credentials)
            imp_by = payload.get("imp_by")
            if imp_by:
                admin = await db.get(User, uuid.UUID(imp_by))
                impersonation = {
                    "admin_user_id": str(imp_by),
                    "admin_email": admin.email if admin else "",
                    "read_only": payload.get("imp_ro") is True,
                }
        except ValueError:
            pass
    repaired = await repair_stale_onboarding_requests(db, user.id)
    if repaired:
        await db.commit()
    return await _user_out_enriched(db, user, impersonation=impersonation)


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UpdateProfile, user: CurrentUser, db: DB) -> UserOut:
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "phone" in data:
        user.phone = data["phone"]
    if "locale" in data:
        allowed = {"en", "hi", "mr", "ta", "te", "bn", "kn", "gu"}
        if data["locale"] not in allowed:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unsupported_locale")
        user.locale = data["locale"]
    if "date_of_birth" in data:
        user.date_of_birth = data["date_of_birth"]
    if "date_of_marriage" in data:
        user.date_of_marriage = data["date_of_marriage"]
    if "city" in data:
        user.city = data["city"]
    if "state" in data:
        user.state = data["state"]
    await db.commit()
    await db.refresh(user)
    return await _user_out_enriched(db, user)


def _change_password_error(exc: ChangePasswordError) -> HTTPException:
    if exc.code == "invalid_current_password":
        return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=exc.code)
    if exc.code in {"password_not_set", "password_unchanged"}:
        return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code)
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code)


@router.post(
    "/me/password",
    response_model=ChangePasswordOut,
    dependencies=[rate_limit(10, 60)],
)
async def change_my_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> ChangePasswordOut:
    try:
        await change_password(
            db,
            user=user,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
        await record_audit(
            db,
            actor=user,
            action="auth.password_change",
            resource_type="user",
            resource_id=user.id,
            request=request,
            diff={},
        )
        await db.commit()
    except ChangePasswordError as exc:
        raise _change_password_error(exc) from exc
    return ChangePasswordOut()


@router.get("/google/login")
async def google_login() -> dict[str, str]:
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="google_oauth_not_configured")
    try:
        state = await issue_oauth_state()
        return {
            "authorize_url": google_authorize_url(state),
            "redirect_uri": settings.google_oauth_redirect_uri,
        }
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)) from exc


@router.get("/google/callback")
async def google_callback(
    db: DB,
    code: str | None = None,
    error: str | None = None,
    state: str | None = None,
) -> RedirectResponse:
    frontend = settings.app_frontend_url
    if error or not code:
        return RedirectResponse(f"{frontend}/auth?mode=signin&error=google_denied")
    if not await consume_oauth_state(state or ""):
        return RedirectResponse(f"{frontend}/auth?mode=signin&error=google_state_invalid")

    try:
        profile = await exchange_google_code(code)
    except Exception:
        return RedirectResponse(f"{frontend}/auth?mode=signin&error=google_exchange_failed")

    if not profile.email_verified:
        return RedirectResponse(f"{frontend}/auth?mode=signin&error=google_email_unverified")

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
            if user.email_verified_at is None and not user.is_verified:
                return RedirectResponse(
                    f"{frontend}/auth?mode=signin&error=google_link_requires_verified"
                )
            user.google_sub = profile.sub
            if user.email_verified_at is None:
                user.email_verified_at = datetime.now(UTC)
            if not user.full_name:
                user.full_name = profile.name

    try:
        await assert_user_may_authenticate(db, user)
    except HTTPException:
        return RedirectResponse(f"{frontend}/auth?mode=signin&error=organization_suspended")

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
