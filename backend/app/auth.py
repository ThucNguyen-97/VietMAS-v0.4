import secrets
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import Role, User


@dataclass
class SessionUser:
    user_id: int
    role: Role
    username: str


security = HTTPBearer(auto_error=False)
_tokens: dict[str, SessionUser] = {}


def seed_users(db: Session) -> None:
    accounts = [
        (settings.admin_username, "Quản trị viên", Role.ADMIN),
        (settings.ceo_username, "CEO", Role.CEO),
        (settings.manager_username, "Quản lý kho", Role.MANAGER),
    ]
    for username, display_name, role in accounts:
        if not db.scalar(select(User).where(User.username == username)):
            db.add(User(username=username, display_name=display_name, role=role))
    db.commit()


def login(db: Session, username: str, password: str) -> tuple[str, User] | None:
    accounts = {
        settings.admin_username: (settings.admin_password, Role.ADMIN),
        settings.ceo_username: (settings.ceo_password, Role.CEO),
        settings.manager_username: (settings.manager_password, Role.MANAGER),
    }
    account = accounts.get(username)
    if not account or not secrets.compare_digest(password, account[0]):
        return None
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        return None
    token = secrets.token_urlsafe(32)
    _tokens[token] = SessionUser(user.id, account[1], username)
    return token, user


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> SessionUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Yêu cầu đăng nhập")
    user = _tokens.get(credentials.credentials)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")
    return user


def require_roles(*roles: Role):
    def dependency(user: SessionUser = Depends(current_user)) -> SessionUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền thực hiện thao tác này")
        return user
    return dependency

