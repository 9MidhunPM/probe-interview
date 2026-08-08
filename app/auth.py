from __future__ import annotations

import hmac
import os
import secrets
from dataclasses import dataclass
from threading import Lock
from time import monotonic


@dataclass
class AccessAttempt:
    failures: int = 0
    cooldown_until: float = 0


class AccessGate:
    def __init__(self) -> None:
        self._attempts: dict[str, AccessAttempt] = {}
        self._sessions: dict[str, float] = {}
        self._lock = Lock()

    def has_valid_session(self, token: str | None) -> bool:
        if not token:
            return False
        with self._lock:
            expires_at = self._sessions.get(token, 0)
            if expires_at <= monotonic():
                self._sessions.pop(token, None)
                return False
            return True

    def login(self, ip_address: str, password: str) -> tuple[str | None, int | None]:
        now = monotonic()
        with self._lock:
            attempt = self._attempts.setdefault(ip_address, AccessAttempt())
            if attempt.cooldown_until > now:
                return None, 429

            expected_password = os.getenv("ACCESS_PASSWORD", "")
            if expected_password and hmac.compare_digest(password, expected_password):
                self._attempts.pop(ip_address, None)
                token = secrets.token_urlsafe(32)
                self._sessions[token] = now + 3600 * int(os.getenv("ACCESS_SESSION_HOURS", "12"))
                return token, None

            attempt.failures += 1
            if attempt.failures >= int(os.getenv("ACCESS_MAX_ATTEMPTS", "5")):
                attempt.failures = 0
                attempt.cooldown_until = now + 60 * int(os.getenv("ACCESS_COOLDOWN_MINUTES", "10"))
                return None, 429
            return None, 401


access_gate = AccessGate()
