from __future__ import annotations

from operator import add
from typing import Annotated

from typing_extensions import TypedDict


class InterviewState(TypedDict, total=False):
    candidate: dict
    strengths: list[str]
    weaknesses: list[str]
    topic_queue: list[dict[str, str]]
    current_topic_index: int
    transcript: Annotated[list[dict[str, str]], add]
    candidate_message: str | None
    awaiting_review: bool
    last_review: dict[str, str]
    review_history: Annotated[list[dict], add]
    low_effort_count: int
    low_effort_topic_index: int | None
    probed_topic_index: int | None
    contradictions: Annotated[list[dict], add]
    last_consistency: dict
    turn_count: int
    reply: str
    ready_for_evaluation: bool
    done: bool
    feedback: dict
