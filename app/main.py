from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.graph.graph import interview_graph
from app.limiting import new_session_limiter
from app.models import Feedback, InterviewRequest, InterviewResponse

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Probe Interview", version="0.1.0")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
ROOT = Path(__file__).parent.parent
app.mount("/data", StaticFiles(directory=ROOT / "data"), name="data")

@app.post(
    "/api/interview",
    response_model=InterviewResponse,
    response_model_exclude_none=True,
)
@limiter.limit(lambda: f"{os.getenv('RATE_LIMIT_REQUESTS_PER_MINUTE', '60')}/minute")
def interview(request: Request, payload: InterviewRequest) -> InterviewResponse:
    config = {"configurable": {"thread_id": payload.sessionId}}
    snapshot = interview_graph.get_state(config)

    if payload.candidate is not None:
        if snapshot.values:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An interview already exists for this sessionId.",
            )
        new_session_limiter.check(get_remote_address(request))
        result = interview_graph.invoke(
            {
                "candidate": payload.candidate.model_dump(),
                "transcript": [],
                "candidate_message": None,
                "current_topic_index": 0,
                "awaiting_review": False,
                "contradictions": [],
                "turn_count": 0,
                "ready_for_evaluation": False,
                "done": False,
            },
            config,
        )
    else:
        if not snapshot.values:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No interview exists for this sessionId. Start with candidate.",
            )
        if snapshot.values.get("done"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This interview has already completed.",
            )
        resume_config = interview_graph.update_state(
            config,
            {"candidate_message": payload.message},
            as_node="interviewer",
        )
        result = interview_graph.invoke(None, resume_config)
        if result.get("awaiting_review"):
            # Resume the reviewer and its deterministic routing decision.
            result = interview_graph.invoke(None, config)

    feedback = result.get("feedback")
    return InterviewResponse(
        reply=result["reply"],
        done=result.get("done", False),
        feedback=Feedback.model_validate(feedback) if feedback else None,
    )


@app.get("/", include_in_schema=False)
def frontend() -> FileResponse:
    return FileResponse(ROOT / "app" / "static" / "index.html")
