from __future__ import annotations

import json
import logging
import os

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.agents.evaluator import generate_evaluation
from app.agents.consistency_checker import check_consistency
from app.agents.interviewer import generate_question
from app.agents.response_reviewer import review_answer
from app.agents.strengths_finder import find_strengths
from app.agents.topic_planner import plan_topics
from app.agents.weaknesses_finder import find_weaknesses
from app.graph.routing import route_after_interviewer, route_after_reviewer
from app.graph.state import InterviewState
from app.providers.base import (
    get_extraction_model_provider,
    get_orchestrator_model_provider,
    get_reasoning_model_provider,
)

logger = logging.getLogger("probe.graph")


def strengths_finder_node(state: InterviewState) -> dict:
    strengths = find_strengths(get_extraction_model_provider(), state["candidate"])
    logger.info("agent=StrengthsFinder output=%s", strengths)
    return {"strengths": strengths}


def weaknesses_finder_node(state: InterviewState) -> dict:
    weaknesses = find_weaknesses(get_extraction_model_provider(), state["candidate"])
    logger.info("agent=WeaknessesFinder output=%s", weaknesses)
    return {"weaknesses": weaknesses}


def topic_planner_node(state: InterviewState) -> dict:
    topic_queue = plan_topics(
        get_reasoning_model_provider(),
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
        update = {
            "transcript": transcript,
            "candidate_message": None,
            "turn_count": turn_count,
            "awaiting_review": True,
        }
        logger.info("agent=Interviewer input=%s output=%s", candidate_message, update)
        return update

    full_transcript = state.get("transcript", []) + transcript
    topic_queue = state["topic_queue"]
    topic = topic_queue[state.get("current_topic_index", 0)]
    last_review = state.get("last_review", {})
    question = generate_question(
        get_orchestrator_model_provider(),
        full_transcript,
        topic,
        last_review,
        state["candidate"]["member"]["name"],
        state.get("low_effort_count", 0),
    )
    update = {
        "transcript": transcript + [{"role": "interviewer", "content": question}],
        "candidate_message": None,
        "turn_count": turn_count,
        "reply": question,
        "awaiting_review": False,
        "ready_for_evaluation": False,
    }
    logger.info(
        "agent=Interviewer input=%s output=%s",
        json.dumps(full_transcript),
        json.dumps(update),
    )
    return update


def response_reviewer_node(state: InterviewState) -> dict:
    transcript = state["transcript"]
    answer = next(entry["content"] for entry in reversed(transcript) if entry["role"] == "candidate")
    question = next(
        entry["content"] for entry in reversed(transcript[:-1]) if entry["role"] == "interviewer"
    )
    topic_index = state.get("current_topic_index", 0)
    review = review_answer(
        get_reasoning_model_provider(),
        question=question,
        answer=answer,
        topic=state["topic_queue"][topic_index],
        low_effort_count=(
            state.get("low_effort_count", 0)
            if state.get("low_effort_topic_index") == topic_index
            else 0
        ),
    )
    low_effort_count = (
        state.get("low_effort_count", 0) + 1
        if review.engagement in {"low", "disengaged"}
        and state.get("low_effort_topic_index") == topic_index
        else 1 if review.engagement in {"low", "disengaged"} else 0
    )
    if review.signal == "advance":
        topic_index += 1
        low_effort_count = 0
    ready_for_evaluation = (
        review.signal == "end"
        or state["turn_count"] >= _max_turns()
        or topic_index >= len(state["topic_queue"])
    )
    update = {
        "current_topic_index": topic_index,
        "last_review": review.model_dump(),
        "low_effort_count": low_effort_count,
        "low_effort_topic_index": topic_index if low_effort_count else None,
        "awaiting_review": False,
        "ready_for_evaluation": ready_for_evaluation,
    }
    logger.info("agent=ResponseReviewer input=%s output=%s", answer, update)
    return update


def consistency_checker_node(state: InterviewState) -> dict:
    transcript = state["transcript"]
    answer = next(entry["content"] for entry in reversed(transcript) if entry["role"] == "candidate")
    result = check_consistency(
        get_reasoning_model_provider(),
        earlier_transcript=transcript[:-1],
        latest_answer=answer,
    )
    contradiction = {
        "answer": answer,
        "flags": result.flags,
        "rationale": result.rationale,
    }
    update = {
        "last_consistency": result.model_dump(),
        "contradictions": [contradiction] if result.contradiction else [],
    }
    logger.info("agent=ConsistencyChecker input=%s output=%s", answer, update)
    return update


def evaluator_node(state: InterviewState) -> dict:
    evaluation = generate_evaluation(
        get_orchestrator_model_provider(),
        state.get("transcript", []),
        state.get("contradictions", []),
    )
    update = {
        "reply": evaluation.closing,
        "done": True,
        "feedback": evaluation.feedback.model_dump(),
    }
    logger.info("agent=Evaluator input=%s output=%s", state.get("transcript", []), update)
    return update


def build_graph():
    builder = StateGraph(InterviewState)
    builder.add_node("strengths_finder", strengths_finder_node)
    builder.add_node("weaknesses_finder", weaknesses_finder_node)
    builder.add_node("topic_planner", topic_planner_node)
    builder.add_node("interviewer", interviewer_node)
    builder.add_node("response_reviewer", response_reviewer_node)
    builder.add_node("consistency_checker", consistency_checker_node)
    builder.add_node("evaluator", evaluator_node)
    builder.add_edge(START, "strengths_finder")
    builder.add_edge("strengths_finder", "weaknesses_finder")
    builder.add_edge("weaknesses_finder", "topic_planner")
    builder.add_edge("topic_planner", "interviewer")
    builder.add_conditional_edges(
        "interviewer",
        route_after_interviewer,
        {
            "response_reviewer": "response_reviewer",
            "interviewer": "interviewer",
            "evaluator": "evaluator",
        },
    )
    builder.add_edge("response_reviewer", "consistency_checker")
    builder.add_conditional_edges(
        "consistency_checker",
        route_after_reviewer,
        {"interviewer": "interviewer", "evaluator": "evaluator"},
    )
    builder.add_edge("evaluator", END)
    # Persist each question before the graph waits for the next HTTP message.
    return builder.compile(checkpointer=MemorySaver(), interrupt_after=["interviewer"])


def _max_turns() -> int:
    return int(os.getenv("MAX_TURNS", "14"))


interview_graph = build_graph()
