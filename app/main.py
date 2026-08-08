from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.graph.graph import interview_graph
from app.auth import access_gate
from app.limiting import new_session_limiter
from app.models import Feedback, InterviewRequest, InterviewResponse, LoginRequest
from app.providers.errors import ProviderUnavailableError

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Probe Interview", version="0.1.0")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
ROOT = Path(__file__).parent.parent
app.mount("/data", StaticFiles(directory=ROOT / "data"), name="data")


@app.middleware("http")
async def discourage_indexing(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    return response


@app.middleware("http")
async def require_access(request: Request, call_next):
    if request.url.path in {"/login", "/robots.txt"}:
        return await call_next(request)
    if access_gate.has_valid_session(request.cookies.get("probe_access")):
        return await call_next(request)
    if request.url.path.startswith("/api/") or request.url.path.startswith("/data/"):
        return JSONResponse({"detail": "Authentication required."}, status_code=status.HTTP_401_UNAUTHORIZED)
    return FileResponse(ROOT / "app" / "static" / "login.html")

@app.exception_handler(ProviderUnavailableError)
async def provider_unavailable(_: Request, __: ProviderUnavailableError):
    return PlainTextResponse(
        "The interview model is temporarily unavailable. Please retry shortly.",
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        headers={"Retry-After": "5"},
    )

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
                "low_effort_count": 0,
                "low_effort_topic_index": None,
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


@app.get("/login", include_in_schema=False)
def login_screen() -> FileResponse:
    return FileResponse(ROOT / "app" / "static" / "login.html")


@app.post("/login", include_in_schema=False)
def login(request: Request, payload: LoginRequest) -> Response:
    token, status_code = access_gate.login(get_remote_address(request), payload.password)
    if token is None:
        detail = "Too many failed attempts. Try again in 10 minutes." if status_code == 429 else "Incorrect password."
        return JSONResponse({"detail": detail}, status_code=status_code)
    response = JSONResponse({"ok": True})
    response.set_cookie(
        key="probe_access",
        value=token,
        httponly=True,
        samesite="strict",
        secure=os.getenv("ACCESS_COOKIE_SECURE", "false").lower() == "true",
        max_age=3600 * int(os.getenv("ACCESS_SESSION_HOURS", "12")),
    )
    return response


@app.get("/robots.txt", include_in_schema=False)
def robots() -> PlainTextResponse:
    return PlainTextResponse("User-agent: *\nDisallow: /\n")
