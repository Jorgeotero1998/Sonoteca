from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import jwt
from passlib.hash import bcrypt

from app.core.config import settings


def hash_password(password: str) -> str:
    # bcrypt has a 72-byte input limit; libpass handles safety; keep passwords reasonable.
    return bcrypt.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.verify(password, password_hash)
    except Exception:
        return False


@dataclass(frozen=True)
class TokenPayload:
    sub: str
    role: str
    exp: int


def create_access_token(*, sub: str, role: str) -> str:
    now = int(time.time())
    exp = now + int(settings.access_token_ttl_min) * 60
    claims: Dict[str, Any] = {"sub": sub, "role": role, "iat": now, "exp": exp}
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_alg)


def decode_token(token: str) -> Optional[TokenPayload]:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        return TokenPayload(sub=str(data["sub"]), role=str(data.get("role", "viewer")), exp=int(data["exp"]))
    except Exception:
        return None

