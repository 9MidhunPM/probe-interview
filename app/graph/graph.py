from __future__ import annotations

import json
import logging
import os

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.agents.evaluator import generate_feedback
from app.agents.interviewer import generate_question
from app.graph.routing import route_after_interviewer
from app.graph.state import InterviewState
from app.providers.base import get_strong_model_provider

logger = logging.getLogger("probe.graph")


def interviewer_node(state: InterviewState) -> dict:
    transcript: list[dict[str, str]] = []
    candidate_message = state.get("candidate_message")
    turn_count = state.get("turn_count", 0)
    if candidate_message is not None:
        transcript.append({"role": "candidate", "content": candidate_message})
        turn_count += 1
        if turn_count >= _max_turns():
            update = {"transcript": transcript, "candidate_message": None, "turn_count": turn_count, "ready_for_evaluation": True}
            logger.info("agent=Interviewer input=%s output=%s", candidate_message, update)
            return update
    full_transcript = state.get("transcript", []) + transcript
    question = generate_question(get_strong_model_provider(), full_transcript)
    update = {"transcript": transcript + [{"role": "interviewer", "content": question}], "candidate_message": None, "turn_count": turn_count, "reply": question, "ready_for_evaluation": False}
    logger.info("agent=Interviewer input=%s output=%s", json.dumps(full_transcript), json.dumps(update))
    return update


def evaluator_node(state: InterviewState) -> dict:
    feedback = generate_feedback(get_strong_model_provider(), state.get("transcript", []))
    update = {"reply": "Interview completed.", "done": True, "feedback": feedback.model_dump()}
    logger.info("agent=Evaluator input=%s output=%s", state.get("transcript", []), update)
    return update


def build_graph():
    builder = StateGraph(InterviewState)
    builder.add_node("interviewer", interviewer_node)
    builder.add_node("evaluator", evaluator_node)
    builder.add_edge(START, "interviewer")
    builder.add_conditional_edges("interviewer", route_after_interviewer, {"interviewer": "interviewer", "evaluator": "evaluator"})
    builder.add_edge("evaluator", END)
    # Persist each question before the graph waits for the next HTTP message.
    return builder.compile(checkpointer=MemorySaver(), interrupt_after=["interviewer"])


def _max_turns() -> int:
    return int(os.getenv("MAX_TURNS", "14"))


interview_graph = build_graph()
