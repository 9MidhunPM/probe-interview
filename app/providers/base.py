from __future__ import annotations

import os
from typing import Protocol


class ModelProvider(Protocol):
    def generate(self, *, instructions: str, input_text: str, max_tokens: int) -> str: ...

    def generate_json(
        self, *, instructions: str, input_text: str, schema: dict, max_tokens: int
    ) -> str: ...


StrongModelProvider = ModelProvider


def _get_provider(provider: str, model: str | None = None) -> ModelProvider:
    if provider == "openai":
        from app.providers.openai_client import OpenAIProvider

        return OpenAIProvider(model=model)
    if provider == "groq":
        from app.providers.groq_client import GroqProvider

        return GroqProvider()
    if provider == "gemini":
        from app.providers.gemini_client import GeminiProvider

        return GeminiProvider()
    raise RuntimeError("Provider must be 'openai', 'groq', or 'gemini'.")


def _get_role_provider(role: str, model_env: str) -> ModelProvider:
    provider = os.getenv(f"{role}_PROVIDER", "openai").lower()
    return _get_provider(provider, os.getenv(model_env))


def get_extraction_model_provider() -> ModelProvider:
    return _get_role_provider("EXTRACTION", "OPENAI_EXTRACTION_MODEL")


def get_reasoning_model_provider() -> ModelProvider:
    return _get_role_provider("REASONING", "OPENAI_REASONING_MODEL")


def get_orchestrator_model_provider() -> ModelProvider:
    return _get_role_provider("ORCHESTRATOR", "OPENAI_ORCHESTRATOR_MODEL")
