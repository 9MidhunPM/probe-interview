from __future__ import annotations

from operator import add
from typing import Annotated

from typing_extensions import TypedDict


class InterviewState(TypedDict, total=False):
    candidate: dict
    transcript: Annotated[list[dict[str, str]], add]
    candidate_message: str | None
    turn_count: int
    reply: str
    ready_for_evaluation: bool
    done: bool
    feedback: dict
