from __future__ import annotations

import logging
import os
from time import sleep
from typing import Callable, TypeVar

from openai import APIConnectionError, APITimeoutError, InternalServerError, OpenAI, RateLimitError

from app.providers.errors import ProviderUnavailableError

logger = logging.getLogger("probe.providers.openai")
T = TypeVar("T")
RETRYABLE_ERRORS = (APIConnectionError, APITimeoutError, InternalServerError, RateLimitError)


class OpenAIProvider:
    def __init__(self, model: str, client: OpenAI | None = None) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or not model:
            raise RuntimeError("An OpenAI API key and model must be configured.")
        self._client = client or OpenAI(api_key=api_key)
        self._model = model

    def generate(self, *, instructions: str, input_text: str, max_tokens: int) -> str:
        response = self._with_retry(
            lambda: self._client.responses.create(
                model=self._model,
                instructions=instructions,
                input=input_text,
                max_output_tokens=max_tokens,
            )
        )
        self._log_usage(response)
        if not response.output_text:
            raise RuntimeError("OpenAI returned no text output.")
        return response.output_text

    def generate_json(
        self, *, instructions: str, input_text: str, schema: dict, max_tokens: int
    ) -> str:
        response = self._with_retry(
            lambda: self._client.responses.create(
                model=self._model,
                instructions=instructions,
                input=input_text,
                max_output_tokens=max_tokens,
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "probe_response",
                        "schema": schema,
                        "strict": True,
                    }
                },
            )
        )
        self._log_usage(response)
        if not response.output_text:
            raise RuntimeError("OpenAI returned no structured output.")
        return response.output_text

    def _with_retry(self, request: Callable[[], T]) -> T:
        retries = int(os.getenv("OPENAI_MAX_RETRIES", "2"))
        delay = float(os.getenv("OPENAI_RETRY_BASE_SECONDS", "0.5"))
        for attempt in range(retries + 1):
            try:
                return request()
            except RETRYABLE_ERRORS as error:
                if attempt == retries:
                    raise ProviderUnavailableError("OpenAI is temporarily unavailable.") from error
                logger.warning("OpenAI request failed; retrying attempt=%s", attempt + 1)
                sleep(delay * (2**attempt))
        raise AssertionError("OpenAI retry loop exited unexpectedly.")

    def _log_usage(self, response: object) -> None:
        usage = getattr(response, "usage", None)
        if usage is not None:
            logger.info(
                "OpenAI usage model=%s input_tokens=%s output_tokens=%s",
                self._model,
                getattr(usage, "input_tokens", None),
                getattr(usage, "output_tokens", None),
            )
