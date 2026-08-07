from __future__ import annotations

import logging

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status

from app.graph.graph import interview_graph
from app.models import Feedback, InterviewRequest, InterviewResponse

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Probe Interview", version="0.1.0")


@app.post(
    "/api/interview",
    response_model=InterviewResponse,
    response_model_exclude_none=True,
)
def interview(request: InterviewRequest) -> InterviewResponse:
    config = {"configurable": {"thread_id": request.sessionId}}
    snapshot = interview_graph.get_state(config)

    if request.candidate is not None:
        if snapshot.values:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An interview already exists for this sessionId.",
            )
        result = interview_graph.invoke(
            {"candidate": request.candidate.model_dump(), "transcript": [], "candidate_message": None, "turn_count": 0, "ready_for_evaluation": False, "done": False}, config,
        )
    else:
        if not snapshot.values:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No interview exists for this sessionId. Start with candidate.")
        if snapshot.values.get("done"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This interview has already completed.")
        resume_config = interview_graph.update_state(config, {"candidate_message": request.message}, as_node="interviewer")
        result = interview_graph.invoke(None, resume_config)
        if result.get("ready_for_evaluation"):
            result = interview_graph.invoke(None, resume_config)

    feedback = result.get("feedback")
    return InterviewResponse(reply=result["reply"], done=result.get("done", False), feedback=Feedback.model_validate(feedback) if feedback else None)
