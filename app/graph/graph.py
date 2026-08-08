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
    return {
        "strengths": strengths,
        "trace": [{"agent": "Strengths Finder", "output": {"strengths": strengths}}],
    }


def weaknesses_finder_node(state: InterviewState) -> dict:
    weaknesses = find_weaknesses(get_extraction_model_provider(), state["candidate"])
    logger.info("agent=WeaknessesFinder output=%s", weaknesses)
    return {
        "weaknesses": weaknesses,
        "trace": [{"agent": "Weaknesses Finder", "output": {"weaknesses": weaknesses}}],
    }


def topic_planner_node(state: InterviewState) -> dict:
    topic_queue = plan_topics(
        get_reasoning_model_provider(),
        state["candidate"],
        state["strengths"],
        state["weaknesses"],
    )
    logger.info("agent=TopicPlanner output=%s", topic_queue)
    return {
        "topic_queue": topic_queue,
        "trace": [{"agent": "Topic Planner", "output": {"topic_queue": topic_queue}}],
    }


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
        state.get("probed_topic_index") == state.get("current_topic_index", 0),
    )
    update = {
        "transcript": transcript + [{"role": "interviewer", "content": question}],
        "candidate_message": None,
        "turn_count": turn_count,
        "reply": question,
        "awaiting_review": False,
        "ready_for_evaluation": False,
        "trace": [
            {
                "agent": "Interviewer",
                "output": {
                    "reply": question,
                    "topic": topic["topic"],
                    "direction": last_review.get("signal"),
                },
            }
        ],
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
    reviewed_topic = state["topic_queue"][topic_index]
    review = review_answer(
        get_reasoning_model_provider(),
        question=question,
        answer=answer,
        topic=reviewed_topic,
        low_effort_count=(
            state.get("low_effort_count", 0)
            if state.get("low_effort_topic_index") == topic_index
            else 0
        ),
        probe_available=state.get("probed_topic_index") != topic_index,
    )
    low_effort_count = (
        state.get("low_effort_count", 0) + 1
        if review.engagement in {"low", "disengaged"}
        and state.get("low_effort_topic_index") == topic_index
        else 1 if review.engagement in {"low", "disengaged"} else 0
    )
    # Reserve the closing stretch for wrapping a topic rather than opening a fresh
    # probe that the turn budget cannot meaningfully resolve.
    remaining_turns = _max_conversation_turns() - len(transcript)
    if remaining_turns <= 3 and review.signal in {"probe", "escalate"}:
        review = review.model_copy(
            update={
                "signal": "advance",
                "probe_target": None,
                "rationale": "Advanced to preserve room for a natural interview conclusion.",
            }
        )
    if review.signal == "advance":
        topic_index += 1
        low_effort_count = 0
    review_data = review.model_dump()
    ready_for_evaluation = (
        review.signal == "end"
        # MAX_TURNS is a conversation-entry budget, not a candidate-answer budget.
        # The evaluator's closing reply becomes the final entry, so stop one entry early.
        or len(transcript) >= _max_conversation_turns() - 1
        or topic_index >= len(state["topic_queue"])
    )
    update = {
        "current_topic_index": topic_index,
        "last_review": review_data,
        "review_history": [{"topic": reviewed_topic, "review": review_data}],
        "low_effort_count": low_effort_count,
        "low_effort_topic_index": topic_index if low_effort_count else None,
        "probed_topic_index": topic_index if review.signal == "probe" else state.get("probed_topic_index"),
        "awaiting_review": False,
        "ready_for_evaluation": ready_for_evaluation,
        "trace": [{"agent": "Response Reviewer", "output": review_data}],
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
        "trace": [{"agent": "Consistency Checker", "output": result.model_dump()}],
    }
    logger.info("agent=ConsistencyChecker input=%s output=%s", answer, update)
    return update


def evaluator_node(state: InterviewState) -> dict:
    evaluation = generate_evaluation(
        get_orchestrator_model_provider(),
        state.get("transcript", []),
        state.get("contradictions", []),
        state.get("review_history", []),
    )
    update = {
        "reply": evaluation.closing,
        "done": True,
        "feedback": evaluation.feedback.model_dump(),
        "trace": [
            {
                "agent": "Evaluator",
                "output": {
                    "closing": evaluation.closing,
                    "feedback": evaluation.feedback.model_dump(),
                    "approach": _probey_approach(state.get("review_history", [])),
                },
            }
        ],
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


def _max_conversation_turns() -> int:
    return max(5, int(os.getenv("MAX_TURNS", "15")))


def _probey_approach(review_history: list[dict]) -> list[str]:
    moments: list[str] = []
    for entry in review_history:
        topic = entry.get("topic", {}).get("topic", "that topic")
        review = entry.get("review", {})
        signal = review.get("signal")
        if signal == "probe":
            moments.append(f"Dr. Probey dug deeper into {topic} to test the reasoning behind a key claim.")
        elif signal == "escalate":
            moments.append(f"Dr. Probey raised the bar on {topic} with a harder implementation or trade-off follow-up.")
        elif signal == "advance":
            moments.append(f"Dr. Probey moved on from {topic} after getting enough signal to focus the remaining time.")
        elif signal == "check_in":
            moments.append(f"Dr. Probey checked in during {topic} rather than forcing another version of the same question.")
    return moments[:3] or ["Dr. Probey kept the conversation focused on the strongest available evidence from your answers."]


interview_graph = build_graph()
