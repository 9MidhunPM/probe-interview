# Probe Interview

Probe Interview is a LangGraph-orchestrated technical interview API. It exposes
`POST /api/interview` and persists each interview through LangGraph checkpoints
keyed by the caller's `sessionId`.

## Current status

Phase 2 is implemented. Strengths Finder, Weaknesses Finder, and Topic Planner
run once at session start through Groq, then the OpenAI Interviewer asks from
the resulting role- and evidence-based topic queue. The graph pauses after each
question, resumes when the next candidate message is injected, and ends with
the required structured feedback object.

Response reviewing, adaptive routing, consistency checks, hardening,
deployment, and a frontend are intentionally not implemented until their
respective phases.

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env`, then set the OpenAI, Groq, and Gemini keys.
4. Start the server with `uvicorn app.main:app --reload`.

Set `MAX_TURNS=2` while exercising the short examples below. The default is 14
candidate answers per interview.

## API

Start an interview by sending `sessionId` and the complete candidate object.
The setup agents use mission evidence to build the queue before returning the
opening question. Send subsequent candidate responses with the same `sessionId`.
The final response has `done: true` and a `feedback` object containing
`summary`, `strengths`, `gaps`, and `next`.

```bash
curl -sS -X POST http://127.0.0.1:8000/api/interview \
  -H 'content-type: application/json' \
  -d '{"sessionId":"local-demo","candidate":{"member":{"id":"CAND-010","name":"Gerald Combs","jobRole":"IT Support Specialist","yearsExperience":20,"education":"AAS Information Technology","status":"COMPLETED"},"missions":[{"day":8,"title":"Vector Databases Overview","passed":false,"attempts":4},{"day":27,"title":"Security, Privacy & Guardrails","skipped":true},{"day":28,"title":"Docker & Kubernetes Deployment","skipped":true}],"signals":{"commitDays":22,"missionsCompleted":23,"missionsFirstTry":1}}}'

curl -sS -X POST http://127.0.0.1:8000/api/interview \
  -H 'content-type: application/json' \
  -d '{"sessionId":"local-demo","message":"I would begin by defining a clear interface, then add tests around the critical behavior."}'

curl -sS -X POST http://127.0.0.1:8000/api/interview \
  -H 'content-type: application/json' \
  -d '{"sessionId":"local-demo","message":"I would instrument latency and error rates, then use the traces to isolate the regression."}'
```

The last request returns the final feedback when `MAX_TURNS=2`.
