from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Generic, Optional, TypeVar


T = TypeVar("T")


@dataclass(frozen=True)
class _Entry(Generic[T]):
    expires_at: float
    value: T


class TTLCache:
    def __init__(self) -> None:
        self._data: Dict[str, _Entry[Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        e = self._data.get(key)
        if not e:
            return None
        if e.expires_at <= time.time():
            self._data.pop(key, None)
            return None
        return e.value

    def set(self, key: str, value: Any, ttl_sec: float) -> None:
        self._data[key] = _Entry(expires_at=time.time() + float(ttl_sec), value=value)

    async def get_or_set(self, key: str, ttl_sec: float, compute: Callable[[], Any]) -> Any:
        v = self.get(key)
        if v is not None:
            return v
        out = compute()
        if hasattr(out, "__await__"):
            out = await out  # type: ignore[no-untyped-call]
        self.set(key, out, ttl_sec=ttl_sec)
        return out

