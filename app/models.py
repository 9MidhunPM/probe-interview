from __future__ import annotations

from pydantic import BaseModel, ConfigDict, model_validator


class Member(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    jobRole: str
    yearsExperience: int | float
    education: str
    status: str


class Mission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day: int
    title: str
    passed: bool | None = None
    skipped: bool | None = None
    attempts: int | None = None


class Signals(BaseModel):
    model_config = ConfigDict(extra="forbid")

    commitDays: int
    missionsCompleted: int
    missionsFirstTry: int


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    member: Member
    missions: list[Mission]
    signals: Signals


class InterviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sessionId: str
    candidate: Candidate | None = None
    message: str | None = None

    @model_validator(mode="after")
    def has_one_interview_input(self) -> "InterviewRequest":
        if (self.candidate is None) == (self.message is None):
            raise ValueError("Provide exactly one of candidate or message.")
        return self


class Feedback(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str
    strengths: list[str]
    gaps: list[str]
    next: list[str]


class InterviewResponse(BaseModel):
    reply: str
    done: bool
    feedback: Feedback | None = None
