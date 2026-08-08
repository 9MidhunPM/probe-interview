from __future__ import annotations

import os
from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, status


class NewSessionLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, ip_address: str) -> None:
        limit = int(os.getenv("RATE_LIMIT_NEW_SESSIONS_PER_HOUR", "10"))
        cutoff = monotonic() - 3600
        with self._lock:
            events = self._events[ip_address]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="New-session rate limit exceeded. Try again later.",
                )
            events.append(monotonic())


new_session_limiter = NewSessionLimiter()
