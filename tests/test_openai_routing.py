from __future__ import annotations

import asyncio
import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

from app.main import provider_unavailable
from app.providers import base
from app.providers.errors import ProviderUnavailableError
from app.providers.openai_client import OpenAIProvider


class RetryableTestError(Exception):
    pass


class OpenAIProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.environment = patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"})
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_uses_role_specific_openai_models_by_default(self) -> None:
        with patch.dict(
            os.environ,
            {
                "OPENAI_EXTRACTION_MODEL": "gpt-4o-mini",
                "OPENAI_REASONING_MODEL": "gpt-4.1-mini",
                "OPENAI_ORCHESTRATOR_MODEL": "gpt-5.6-luna",
            },
            clear=False,
        ), patch("app.providers.base._get_provider") as get_provider:
            base.get_extraction_model_provider()
            base.get_reasoning_model_provider()
            base.get_orchestrator_model_provider()

        self.assertEqual(
            get_provider.call_args_list,
            [
                call("openai", "gpt-4o-mini"),
                call("openai", "gpt-4.1-mini"),
                call("openai", "gpt-5.6-luna"),
            ],
        )

    def test_keeps_non_openai_provider_as_explicit_fallback(self) -> None:
        with patch.dict(os.environ, {"REASONING_PROVIDER": "groq"}, clear=False), patch(
            "app.providers.base._get_provider"
        ) as get_provider:
            base.get_reasoning_model_provider()

        get_provider.assert_called_once_with("groq", None)

    def test_retries_transient_error_then_returns_text(self) -> None:
        create = MagicMock(
            side_effect=[RetryableTestError(), SimpleNamespace(output_text="interviewer reply")]
        )
        client = SimpleNamespace(responses=SimpleNamespace(create=create))
        provider = OpenAIProvider("gpt-4.1-mini", client=client)

        with patch("app.providers.openai_client.RETRYABLE_ERRORS", (RetryableTestError,)), patch(
            "app.providers.openai_client.sleep"
        ) as sleep:
            result = provider.generate(instructions="Instructions", input_text="Input", max_tokens=10)

        self.assertEqual(result, "interviewer reply")
        self.assertEqual(create.call_count, 2)
        sleep.assert_called_once_with(0.5)

    def test_raises_retryable_error_after_retry_limit(self) -> None:
        create = MagicMock(side_effect=RetryableTestError())
        client = SimpleNamespace(responses=SimpleNamespace(create=create))
        provider = OpenAIProvider("gpt-4.1-mini", client=client)

        with patch.dict(os.environ, {"OPENAI_MAX_RETRIES": "1"}, clear=False), patch(
            "app.providers.openai_client.RETRYABLE_ERRORS", (RetryableTestError,)
        ), patch("app.providers.openai_client.sleep"):
            with self.assertRaises(ProviderUnavailableError):
                provider.generate(instructions="Instructions", input_text="Input", max_tokens=10)

        self.assertEqual(create.call_count, 2)

    def test_uses_strict_json_schema(self) -> None:
        create = MagicMock(return_value=SimpleNamespace(output_text='{"result":"ok"}'))
        client = SimpleNamespace(responses=SimpleNamespace(create=create))
        provider = OpenAIProvider("gpt-4o-mini", client=client)

        result = provider.generate_json(
            instructions="Instructions",
            input_text="Input",
            schema={"type": "object", "properties": {}, "additionalProperties": False},
            max_tokens=10,
        )

        self.assertEqual(result, '{"result":"ok"}')
        self.assertTrue(create.call_args.kwargs["text"]["format"]["strict"])


class ProviderUnavailableHandlerTests(unittest.TestCase):
    def test_returns_retryable_503(self) -> None:
        response = asyncio.run(provider_unavailable(None, ProviderUnavailableError()))

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.headers["retry-after"], "5")


if __name__ == "__main__":
    unittest.main()
