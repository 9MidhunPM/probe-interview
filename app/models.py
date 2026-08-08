from __future__ import annotations

import os

from pydantic import BaseModel, ConfigDict, Field, model_validator


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

    sessionId: str = Field(min_length=1)
    candidate: Candidate | None = None
    message: str | None = None

    @model_validator(mode="after")
    def has_one_interview_input(self) -> "InterviewRequest":
        if (self.candidate is None) == (self.message is None):
            raise ValueError("Provide exactly one of candidate or message.")
        if self.message is not None:
            if not self.message.strip():
                raise ValueError("message must not be empty.")
            if len(self.message) > int(os.getenv("MAX_MESSAGE_CHARS", "2000")):
                raise ValueError("message exceeds MAX_MESSAGE_CHARS.")
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


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    password: str = Field(min_length=1)
