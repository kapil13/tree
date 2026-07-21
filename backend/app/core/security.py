"""JWT, password hashing, RBAC."""

from __future__ import annotations

import enum
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------

pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4,
)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------


class TokenType(str, enum.Enum):
    ACCESS = "access"
    REFRESH = "refresh"


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(
    subject: str | uuid.UUID,
    *,
    role: str,
    org_id: str | uuid.UUID | None = None,
    expires_delta: timedelta | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    exp = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "org": str(org_id) if org_id else None,
        "type": TokenType.ACCESS.value,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    if extra:
        payload.update(extra)
    return _encode(payload)


def create_refresh_token(subject: str | uuid.UUID) -> str:
    now = datetime.now(UTC)
    exp = now + timedelta(days=settings.refresh_token_expire_days)
    return _encode(
        {
            "sub": str(subject),
            "type": TokenType.REFRESH.value,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": secrets.token_urlsafe(16),
        }
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("invalid_token") from exc


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------


class Role(str, enum.Enum):
    USER = "user"
    FARMER = "farmer"
    NGO = "ngo"
    CORPORATE = "corporate"
    GOVERNMENT = "government"
    FIELD_WORKER = "field_worker"
    FIELD_SUPERVISOR = "field_supervisor"
    ADMIN = "admin"


class Permission(str, enum.Enum):
    TREE_CREATE = "tree:create"
    TREE_READ = "tree:read"
    TREE_UPDATE = "tree:update"
    TREE_DELETE = "tree:delete"
    ANALYSIS_TRIGGER = "analysis:trigger"
    SATELLITE_TRIGGER = "satellite:trigger"
    REPORT_GENERATE = "report:generate"
    AUDIT_READ = "audit:read"
    CMS_MANAGE = "cms:manage"
    PLATFORM_USERS_MANAGE = "platform:users:manage"
    ADMIN_ALL = "admin:*"


_BASE: set[Permission] = {
    Permission.TREE_CREATE,
    Permission.TREE_READ,
    Permission.TREE_UPDATE,
    Permission.ANALYSIS_TRIGGER,
    Permission.REPORT_GENERATE,
}

ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.USER: _BASE,
    Role.FARMER: _BASE | {Permission.SATELLITE_TRIGGER},
    Role.NGO: _BASE
    | {Permission.SATELLITE_TRIGGER, Permission.TREE_DELETE, Permission.AUDIT_READ},
    Role.CORPORATE: _BASE
    | {Permission.SATELLITE_TRIGGER, Permission.TREE_DELETE, Permission.AUDIT_READ},
    Role.GOVERNMENT: _BASE
    | {Permission.SATELLITE_TRIGGER, Permission.TREE_DELETE, Permission.AUDIT_READ},
    Role.FIELD_WORKER: {
        Permission.TREE_CREATE,
        Permission.TREE_READ,
        Permission.TREE_UPDATE,
    },
    Role.FIELD_SUPERVISOR: _BASE
    | {Permission.SATELLITE_TRIGGER, Permission.REPORT_GENERATE, Permission.AUDIT_READ},
    Role.ADMIN: {Permission.ADMIN_ALL},
}


def has_permission(role: Role | str, perm: Permission) -> bool:
    role_enum = Role(role) if isinstance(role, str) else role
    perms = ROLE_PERMISSIONS.get(role_enum, set())
    return Permission.ADMIN_ALL in perms or perm in perms


def permissions_for_role(role: Role | str) -> list[str]:
    role_enum = Role(role) if isinstance(role, str) else role
    perms = ROLE_PERMISSIONS.get(role_enum, set())
    if Permission.ADMIN_ALL in perms:
        return sorted(p.value for p in Permission)
    return sorted(p.value for p in perms)
