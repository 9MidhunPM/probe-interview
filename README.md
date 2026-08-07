# Probe Interview

Probe Interview is a LangGraph-orchestrated technical interview API. It exposes
`POST /api/interview` and persists each interview through LangGraph checkpoints
keyed by the caller's `sessionId`.

## Current status

Phase 1 is implemented: a minimal real graph with two strong-model nodes:
`Interviewer` and `Evaluator`. The graph pauses after each generated question,
resumes when the next candidate message is injected, and ends with the required
structured feedback object.

Candidate-history personalization, Groq sub-agents, adaptive routing,
consistency checks, hardening, deployment, and a frontend are intentionally not
implemented until their respective phases.

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env`, then set `OPENAI_API_KEY` and `OPENAI_MODEL`.
4. Start the server with `uvicorn app.main:app --reload`.

Set `MAX_TURNS=2` while exercising the short examples below. The default is 14
candidate answers per interview.

## API

Start an interview by sending `sessionId` and the complete candidate object.
Send subsequent candidate responses with the same `sessionId` and `message`.
The final response has `done: true` and a `feedback` object containing
`summary`, `strengths`, `gaps`, and `next`.

```bash
curl -sS -X POST http://127.0.0.1:8000/api/interview \
  -H 'content-type: application/json' \
  -d '{"sessionId":"local-demo","candidate":{"member":{"id":"demo-1","name":"Ada","jobRole":"Software Engineer","yearsExperience":3,"education":"BS Computer Science","status":"COMPLETED"},"missions":[],"signals":{"commitDays":20,"missionsCompleted":20,"missionsFirstTry":10}}}'

curl -sS -X POST http://127.0.0.1:8000/api/interview \
  -H 'content-type: application/json' \
  -d '{"sessionId":"local-demo","message":"I would begin by defining a clear interface, then add tests around the critical behavior."}'

curl -sS -X POST http://127.0.0.1:8000/api/interview \
  -H 'content-type: application/json' \
  -d '{"sessionId":"local-demo","message":"I would instrument latency and error rates, then use the traces to isolate the regression."}'
```

The last request returns the final feedback when `MAX_TURNS=2`.
