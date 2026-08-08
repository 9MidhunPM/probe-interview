from __future__ import annotations

import json
import logging
import os

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.agents.evaluator import generate_feedback
from app.agents.interviewer import generate_question
from app.agents.strengths_finder import find_strengths
from app.agents.topic_planner import plan_topics
from app.agents.weaknesses_finder import find_weaknesses
from app.graph.routing import route_after_interviewer
from app.graph.state import InterviewState
from app.providers.base import get_setup_model_provider, get_strong_model_provider

logger = logging.getLogger("probe.graph")


def strengths_finder_node(state: InterviewState) -> dict:
    strengths = find_strengths(get_setup_model_provider(), state["candidate"])
    logger.info("agent=StrengthsFinder output=%s", strengths)
    return {"strengths": strengths}


def weaknesses_finder_node(state: InterviewState) -> dict:
    weaknesses = find_weaknesses(get_setup_model_provider(), state["candidate"])
    logger.info("agent=WeaknessesFinder output=%s", weaknesses)
    return {"weaknesses": weaknesses}


def topic_planner_node(state: InterviewState) -> dict:
    topic_queue = plan_topics(
        get_setup_model_provider(),
        state["candidate"],
        state["strengths"],
        state["weaknesses"],
    )
    logger.info("agent=TopicPlanner output=%s", topic_queue)
    return {"topic_queue": topic_queue}


def interviewer_node(state: InterviewState) -> dict:
    transcript: list[dict[str, str]] = []
    candidate_message = state.get("candidate_message")
    turn_count = state.get("turn_count", 0)

    if candidate_message is not None:
        transcript.append({"role": "candidate", "content": candidate_message})
        turn_count += 1
        if turn_count >= _max_turns():
            update = {
                "transcript": transcript,
                "candidate_message": None,
                "turn_count": turn_count,
                "ready_for_evaluation": True,
            }
            logger.info("agent=Interviewer input=%s output=%s", candidate_message, update)
            return update

    full_transcript = state.get("transcript", []) + transcript
    topic_queue = state["topic_queue"]
    topic = topic_queue[min(turn_count, len(topic_queue) - 1)]
    question = generate_question(get_strong_model_provider(), full_transcript, topic)
    update = {
        "transcript": transcript + [{"role": "interviewer", "content": question}],
        "candidate_message": None,
        "turn_count": turn_count,
        "reply": question,
        "ready_for_evaluation": False,
    }
    logger.info(
        "agent=Interviewer input=%s output=%s",
        json.dumps(full_transcript),
        json.dumps(update),
    )
    return update


def evaluator_node(state: InterviewState) -> dict:
    feedback = generate_feedback(get_strong_model_provider(), state.get("transcript", []))
    update = {
        "reply": "Interview completed.",
        "done": True,
        "feedback": feedback.model_dump(),
    }
    logger.info("agent=Evaluator input=%s output=%s", state.get("transcript", []), update)
    return update


def build_graph():
    builder = StateGraph(InterviewState)
    builder.add_node("strengths_finder", strengths_finder_node)
    builder.add_node("weaknesses_finder", weaknesses_finder_node)
    builder.add_node("topic_planner", topic_planner_node)
    builder.add_node("interviewer", interviewer_node)
    builder.add_node("evaluator", evaluator_node)
    builder.add_edge(START, "strengths_finder")
    builder.add_edge("strengths_finder", "weaknesses_finder")
    builder.add_edge("weaknesses_finder", "topic_planner")
    builder.add_edge("topic_planner", "interviewer")
    builder.add_conditional_edges(
        "interviewer",
        route_after_interviewer,
        {"interviewer": "interviewer", "evaluator": "evaluator"},
    )
    builder.add_edge("evaluator", END)
    # Persist each question before the graph waits for the next HTTP message.
    return builder.compile(checkpointer=MemorySaver(), interrupt_after=["interviewer"])


def _max_turns() -> int:
    return int(os.getenv("MAX_TURNS", "14"))


interview_graph = build_graph()
