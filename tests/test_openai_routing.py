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
from app.schemas import strict_json_schema
from app.agents.consistency_checker import ConsistencyResult
from app.agents.evaluator import EvaluationResult
from app.agents.response_reviewer import ReviewResult
from app.agents.response_reviewer import review_answer
from app.agents.interviewer import _probe_question
from app.agents.strengths_finder import StrengthsResult
from app.agents.topic_planner import TopicPlan
from app.agents.weaknesses_finder import WeaknessesResult
from app.graph.graph import response_reviewer_node


class RetryableTestError(Exception):
    pass


class StaticJsonProvider:
    def __init__(self, output: str) -> None:
        self.output = output

    def generate_json(self, **_) -> str:
        return self.output


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


class StrictJsonSchemaTests(unittest.TestCase):
    def test_forbids_extra_properties_for_every_structured_agent(self) -> None:
        for model in (
            StrengthsResult,
            WeaknessesResult,
            TopicPlan,
            ReviewResult,
            ConsistencyResult,
            EvaluationResult,
        ):
            for object_schema in _object_schemas(strict_json_schema(model)):
                self.assertFalse(object_schema["additionalProperties"])


class ProbeRoutingTests(unittest.TestCase):
    def test_keeps_only_the_question_for_a_probe_reply(self) -> None:
        reply = "If it were me, I would start with labeled examples. What would determine that threshold?"

        self.assertEqual(_probe_question(reply), "What would determine that threshold?")

    def test_allows_one_probe_then_normalizes_a_second_probe(self) -> None:
        provider = StaticJsonProvider(
            '{"depth":"adequate","correctness":"partially_correct","vagueness":"medium",'
            '"engagement":"engaged","signal":"probe","probe_target":"relevance threshold",'
            '"rationale":"The threshold is undefined."}'
        )
        arguments = {
            "question": "How would you rank results?",
            "answer": "I would use a relevance threshold.",
            "topic": {"topic": "Ranking", "rationale": "Interview focus"},
            "low_effort_count": 0,
        }

        first = review_answer(provider, probe_available=True, **arguments)
        second = review_answer(provider, probe_available=False, **arguments)

        self.assertEqual(first.signal, "probe")
        self.assertEqual(first.probe_target, "relevance threshold")
        self.assertEqual(second.signal, "simplify")
        self.assertIsNone(second.probe_target)

    def test_records_the_topic_that_received_a_probe(self) -> None:
        review = ReviewResult(
            depth="adequate",
            correctness="partially_correct",
            vagueness="medium",
            engagement="engaged",
            signal="probe",
            probe_target="relevance threshold",
            rationale="The threshold is undefined.",
        )
        state = {
            "transcript": [
                {"role": "interviewer", "content": "How would you rank results?"},
                {"role": "candidate", "content": "I would use a relevance threshold."},
            ],
            "topic_queue": [{"topic": "Ranking", "rationale": "Interview focus"}],
            "current_topic_index": 0,
            "low_effort_count": 0,
            "low_effort_topic_index": None,
            "probed_topic_index": None,
            "turn_count": 1,
        }

        with patch("app.graph.graph.get_reasoning_model_provider"), patch(
            "app.graph.graph.review_answer", return_value=review
        ):
            update = response_reviewer_node(state)

        self.assertEqual(update["probed_topic_index"], 0)
        self.assertEqual(update["review_history"][0]["review"]["probe_target"], "relevance threshold")
        self.assertEqual(update["trace"], [{"agent": "Response Reviewer", "output": review.model_dump()}])


def _object_schemas(value):
    if isinstance(value, dict):
        if value.get("type") == "object" or "properties" in value:
            yield value
        for nested in value.values():
            yield from _object_schemas(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _object_schemas(nested)


if __name__ == "__main__":
    unittest.main()
