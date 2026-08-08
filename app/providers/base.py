from __future__ import annotations

import os
from typing import Protocol


class ModelProvider(Protocol):
    def generate(self, *, instructions: str, input_text: str, max_tokens: int) -> str: ...

    def generate_json(
        self, *, instructions: str, input_text: str, schema: dict, max_tokens: int
    ) -> str: ...


StrongModelProvider = ModelProvider


def _get_provider(provider: str) -> ModelProvider:
    if provider == "openai":
        from app.providers.openai_client import OpenAIProvider

        return OpenAIProvider()
    if provider == "groq":
        from app.providers.groq_client import GroqProvider

        return GroqProvider()
    if provider == "gemini":
        from app.providers.gemini_client import GeminiProvider

        return GeminiProvider()
    raise RuntimeError("Provider must be 'openai', 'groq', or 'gemini'.")


def get_strong_model_provider() -> StrongModelProvider:
    provider = os.getenv("STRONG_PROVIDER", "openai").lower()
    return _get_provider(provider)


def get_setup_model_provider() -> ModelProvider:
    """Use Groq by default; Gemini is an env-selectable fallback."""
    return _get_provider(os.getenv("SETUP_PROVIDER", "groq").lower())
