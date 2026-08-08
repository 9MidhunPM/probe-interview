# Probe Interview

Probe Interview is a LangGraph-orchestrated technical interview API. It exposes
`POST /api/interview` and persists each interview through LangGraph checkpoints
keyed by the caller's `sessionId`.

## Current status

Phase 7 is implemented. OpenAI models run each stage: `gpt-4o-mini` extracts
strengths and weaknesses, `gpt-4.1-mini` plans topics and reviews answers, and
`gpt-5.6-luna` conducts and evaluates the interview. The Consistency Checker
accumulates material conflicts between earlier claims and later answers for the
final evaluator. The graph pauses after each question and resumes when the next
candidate message is injected.

Phase 5 hardening is active: per-IP request and new-session limits, message
length validation, agent output-token caps, and prompt-injection boundaries.
The minimal browser UI is active at `/`; deployment remains intentionally out of
scope until Phase 6 is explicitly approved.

## Run locally

1. Install dependencies with `python3 -m pip install --break-system-packages -r requirements.txt`.
3. Copy `.env.example` to `.env`, then set `OPENAI_API_KEY`.
4. Start the server with `python3 -m uvicorn app.main:app --reload`.

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

## Browser UI

Open `http://127.0.0.1:8000/` after starting the server. Select a supplied
candidate or paste a complete candidate JSON object, then start the interview.
The conversation panel sends each answer to the API and renders the final
feedback when the interview ends.

## Temporary Access Gate

The browser UI and interview API require the password configured in
`ACCESS_PASSWORD`. The committed development default is `INTERVIEWMASTER`.
Each IP receives five failed attempts before a ten-minute cooldown. Set
`ACCESS_COOKIE_SECURE=true` in Dokploy so the access cookie is HTTPS-only, and
configure the same access variables in Dokploy's application environment after
merging the feature PR.

## Model Routing

Default traffic uses OpenAI only. `ORCHESTRATOR_PROVIDER`,
`REASONING_PROVIDER`, and `EXTRACTION_PROVIDER` select a provider per role and
default to `openai`. Set a role to `groq` or `gemini` only for manual fallback;
their keys and model variables remain optional. OpenAI retries transient rate
limits, connection failures, and server failures twice with exponential backoff,
then returns `503 Service Unavailable` with a `Retry-After` header.

## Dokploy deployment preparation

The repository includes `Dockerfile` and `docker-compose.yml` for Dokploy. The
compose service uses the external `dokploy-network` and routes
`probe.midhunpm.in` to container port `8000` through Traefik with Let's Encrypt.

In Dokploy, create a GitHub-backed Dockerfile application from this repository
after merging the deployment PR. Set every variable from `.env.example` in the
application's environment settings, including all provider API keys. Do not add
keys to the repository or Docker build arguments. Configure the domain in
Dokploy as `probe.midhunpm.in`, HTTPS enabled with the Let's Encrypt resolver,
and port `8000`.

Both the app and Traefik configuration send `X-Robots-Tag: noindex, nofollow,
noarchive`; `/robots.txt` disallows all crawling.
