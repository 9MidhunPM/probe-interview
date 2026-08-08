from __future__ import annotations

import logging

from app.graph.state import InterviewState

logger = logging.getLogger("probe.graph")


def route_after_interviewer(state: InterviewState) -> str:
    if state.get("awaiting_review"):
        destination = "response_reviewer"
    elif state.get("ready_for_evaluation"):
        destination = "evaluator"
    else:
        destination = "interviewer"
    logger.info("routing_decision=%s", destination)
    return destination


def route_after_reviewer(state: InterviewState) -> str:
    destination = "evaluator" if state.get("ready_for_evaluation") else "interviewer"
    logger.info("routing_decision=%s", destination)
    return destination
