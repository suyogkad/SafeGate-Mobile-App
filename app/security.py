"""Password hashing, JWT issuance/verification, and role-based access dependencies."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Child, ChildAccessLog, ChildDevice, TherapySession, User, UserRole
from app.db.session import get_db

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: uuid.UUID, role: UserRole, token_version: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {"sub": str(user_id), "typ": "user", "role": role.value, "ver": token_version, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_child_token(child_id: uuid.UUID, device_id: uuid.UUID, token_version: int, minutes: int) -> str:
    """A token that identifies a child's device. It carries no user id and no role, so it
    can never satisfy get_current_user -- child tokens and adult tokens are separate worlds."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {
        "sub": str(child_id),
        "typ": "child",
        "dev": str(device_id),
        "ver": token_version,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise _credentials_error()


async def _load_user(payload: dict, db: AsyncSession) -> User:
    user_id = payload.get("sub")
    # A child's device token must never be accepted as an adult account.
    if user_id is None or payload.get("typ") == "child":
        raise _credentials_error()
    user = (await db.execute(select(User).where(User.id == uuid.UUID(user_id)))).scalar_one_or_none()
    if user is None or not user.is_active or payload.get("ver", 0) != user.token_version:
        raise _credentials_error()
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    return await _load_user(_decode(token), db)


def require_role(*roles: UserRole):
    """Dependency factory: only lets the request through if the current user has one of `roles`."""

    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
        return current_user

    return dependency


async def log_child_access(
    db: AsyncSession,
    child_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    device_id: uuid.UUID | None = None,
) -> None:
    """Records one access to a child's records. The actor is either an adult account or
    the child's own device -- both are logged, so the trail has no blind spot."""
    db.add(
        ChildAccessLog(
            child_id=child_id, accessed_by_user_id=user_id, accessed_by_device_id=device_id, action=action
        )
    )
    await db.commit()


class ChildPrincipal:
    """The child using the app, and the device they are using. Never an adult account."""

    def __init__(self, child: Child, device: "ChildDevice") -> None:
        self.child = child
        self.device = device

    async def log(self, db: AsyncSession, action: str) -> None:
        await log_child_access(db, self.child.id, None, action, device_id=self.device.id)


async def _load_child(payload: dict, db: AsyncSession) -> ChildPrincipal:
    if payload.get("typ") != "child":
        raise _credentials_error()
    child_id, device_id = payload.get("sub"), payload.get("dev")
    if child_id is None or device_id is None:
        raise _credentials_error()

    device = (
        await db.execute(select(ChildDevice).where(ChildDevice.id == uuid.UUID(device_id)))
    ).scalar_one_or_none()
    if (
        device is None
        or device.revoked_at is not None
        or str(device.child_id) != child_id
        or payload.get("ver", 0) != device.token_version
    ):
        raise _credentials_error()

    child = (await db.execute(select(Child).where(Child.id == uuid.UUID(child_id)))).scalar_one_or_none()
    if child is None or child.archived_at is not None:
        raise _credentials_error()

    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    return ChildPrincipal(child, device)


async def get_current_child(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> ChildPrincipal:
    """Authenticates a child's device token. Rejects adult tokens, revoked devices,
    tokens issued before a revocation, and children whose record has been archived."""
    return await _load_child(_decode(token), db)


class Actor:
    """Whoever is making the request: an adult account, or a child on their own device.

    The companion is the one surface both can reach -- a child on their linked phone, or
    a parent who started a session on theirs -- so routes that serve it resolve the actor
    instead of assuming a role.
    """

    def __init__(self, user: User | None = None, principal: ChildPrincipal | None = None) -> None:
        self.user = user
        self.principal = principal

    @property
    def is_child(self) -> bool:
        return self.principal is not None

    @property
    def user_id(self) -> uuid.UUID | None:
        return self.user.id if self.user else None

    @property
    def device_id(self) -> uuid.UUID | None:
        return self.principal.device.id if self.principal else None


async def get_actor(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Actor:
    payload = _decode(token)
    if payload.get("typ") == "child":
        return Actor(principal=await _load_child(payload, db))
    return Actor(user=await _load_user(payload, db))


def require_child_access(action: str):
    """Dependency factory: loads the `child_id` path param, enforces that the current
    user (the child's parent, their assigned therapist, or an admin) may access it,
    logs the access, and returns the Child.
    """

    async def dependency(
        child_id: uuid.UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> Child:
        result = await db.execute(select(Child).where(Child.id == child_id))
        child = result.scalar_one_or_none()
        if child is None or (child.archived_at is not None and current_user.role != UserRole.ADMIN):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")

        allowed = (
            current_user.role == UserRole.ADMIN
            or (current_user.role == UserRole.PARENT and child.parent_id == current_user.id)
            or (current_user.role == UserRole.THERAPIST and child.therapist_id == current_user.id)
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this child")

        await log_child_access(db, child.id, current_user.id, action)
        return child

    return dependency


def require_session_access(action: str):
    """Dependency factory: loads the `session_id` path param, enforces that the
    current user (the session's assigned therapist, the child's parent, or an
    admin) may access it, logs the access against the child's record, and
    returns the TherapySession.
    """

    async def dependency(
        session_id: uuid.UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> TherapySession:
        result = await db.execute(select(TherapySession).where(TherapySession.id == session_id))
        session_obj = result.scalar_one_or_none()
        if session_obj is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        allowed = current_user.role == UserRole.ADMIN or (
            current_user.role == UserRole.THERAPIST and session_obj.therapist_id == current_user.id
        )
        if not allowed and current_user.role == UserRole.PARENT:
            child_result = await db.execute(select(Child).where(Child.id == session_obj.child_id))
            child = child_result.scalar_one_or_none()
            allowed = child is not None and child.parent_id == current_user.id

        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this session")

        await log_child_access(db, session_obj.child_id, current_user.id, action)
        return session_obj

    return dependency
