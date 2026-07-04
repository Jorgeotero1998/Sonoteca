from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import decode_token
from app.models.user import User

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user_id = uuid.UUID(payload.sub)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    q = await db.execute(select(User).where(User.id == user_id))
    user = q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*allowed: str):
    async def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return _guard
