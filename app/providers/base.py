from __future__ import annotations

import os
from typing import Protocol


class StrongModelProvider(Protocol):
    def generate(self, *, instructions: str, input_text: str) -> str: ...


def get_strong_model_provider() -> StrongModelProvider:
    provider = os.getenv("STRONG_PROVIDER", "openai").lower()
    if provider == "openai":
        from app.providers.openai_client import OpenAIProvider
        return OpenAIProvider()
    if provider == "gemini":
        raise RuntimeError("Gemini is scheduled for Phase 2; use STRONG_PROVIDER=openai.")
    raise RuntimeError("STRONG_PROVIDER must be 'openai' or 'gemini'.")
