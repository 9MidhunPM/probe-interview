# AGENT.md — Instructions for the coding agent

Read `PRD.md` first for product intent and full architecture — this file
governs *how* to build it, in what order, and with what conventions.

## Project

**Name**: probe-interview
**Purpose**: A LangGraph-orchestrated multi-agent system exposing
`POST /api/interview` — a personalized AI technical interview driven by a
candidate's real curriculum/mission data, ending in structured feedback.

## Ground rules

- The API contract in `PRD.md` §5 is fixed — field names, casing, response
  shapes must match exactly.
- **No throwaway/hardcoded scaffolding.** Every phase should produce real,
  working logic that survives into the final build — if something can't
  be done for real yet, build the smallest real version of it rather than
  a fake stub.
- No AgentRouter or shared proxy. Each provider (Groq / OpenAI / Gemini)
  is called directly via its own client, behind a thin provider
  abstraction so agent-to-model assignment is an env var, not a code
  change.
- Never hardcode API keys. `.env` (gitignored), `.env.example` with
  placeholders committed.
- No vector DB / RAG infra — deliberately out of scope, don't add it.
- Log each agent's input/output and the routing decision per turn (even
  just to stdout/JSON for now) — needed for debugging the graph and for
  demoing "the reasoning trail" to judges.

## Build phases (do these in order — each phase is real, working, and testable before moving on)

### Phase 1 — Minimal real graph (replaces old hardcoded-skeleton idea)
Stand up FastAPI + a LangGraph `StateGraph` with only two nodes:
**Interviewer** and **Evaluator** (both real LLM calls, strong model).
No sub-agents yet. Wire the checkpointer (`MemorySaver`) keyed by
`sessionId` → `thread_id` so the graph correctly pauses/resumes across
HTTP requests. Goal: prove the full contract end-to-end — start turn,
N conversation turns, `done:true` + valid feedback — with real LLM calls
throughout, just without personalization yet.

### Phase 2 — Setup-phase agents
Add **Strengths Finder**, **Weaknesses Finder**, **Topic Planner** (Groq).
Wire their outputs into a shared state object the Interviewer reads from.
Test in isolation against 2–3 structurally different sample candidates
before connecting to the live graph — verify the topic queue actually
looks sensible per candidate.

### Phase 3 — Response Reviewer + adaptive routing
Add **Response Reviewer** (Groq) as a node after each candidate answer.
Replace the naive turn-cap-only end condition with real conditional
edges: escalate / simplify / advance topic / end, driven by the
Reviewer's signal plus topic/turn budget.

### Phase 4 — Consistency Checker
Add **Consistency Checker** (Groq), running per turn, comparing the new
answer against prior transcript claims. Feed its flags into the
Evaluator's final input.

### Phase 5 — Hardening
Rate limiting (e.g. `slowapi`), payload size caps, `max_tokens` caps per
agent, prompt-injection-resistant system prompts on every agent (no
instruction-override compliance, no echoing internal prompts), input
validation with graceful error responses (no 500s on malformed input).

### Phase 6 — Deploy
Dockerfile, Dokploy config, README deploy instructions, unguessable
subdomain routed through existing Traefik/Cloudflare setup.

### Phase 7 — Frontend (optional)
Minimal chat UI consuming the endpoint. Build last, once backend is solid.

### Phase 8 — Demo testing
Run all 20 sample candidates end-to-end. Deliberately try to break it —
nonsense answers, off-topic input, empty messages, contradictory claims —
before submission.

## Repo structure (target)

```
probe-interview/
├── README.md
├── PRD.md
├── AGENT.md
├── .env.example
├── .gitignore
├── Dockerfile
├── requirements.txt
├── app/
│   ├── main.py                  # FastAPI app, POST /api/interview
│   ├── models.py                # pydantic request/response schemas
│   ├── graph/
│   │   ├── state.py             # LangGraph state schema
│   │   ├── graph.py             # StateGraph definition, nodes, edges
│   │   └── routing.py           # conditional edge logic
│   ├── agents/
│   │   ├── strengths_finder.py
│   │   ├── weaknesses_finder.py
│   │   ├── topic_planner.py
│   │   ├── interviewer.py
│   │   ├── response_reviewer.py
│   │   ├── consistency_checker.py
│   │   └── evaluator.py
│   └── providers/
│       ├── base.py              # provider interface
│       ├── groq_client.py
│       ├── openai_client.py
│       └── gemini_client.py
├── data/
│   ├── curriculum.json
│   └── candidates.json          # sample data for local testing
└── tests/
    └── ...
```

## Environment variables (`.env.example`, placeholders only)

```
GROQ_API_KEY=
GROQ_MODEL=

STRONG_PROVIDER=openai            # or gemini
OPENAI_API_KEY=
OPENAI_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=

MAX_TURNS=14
MAX_MESSAGE_CHARS=2000
```

## Definition of done for "first pass" (end of Phase 4, before hardening/polish)

A judge (or you) can:
1. POST a `sessionId` + full candidate object and get a real, personalized
   opening question referencing their actual mission history.
2. POST several follow-up `message` turns and see difficulty visibly
   adapt based on answer quality, with topics advancing sensibly.
3. Trigger a deliberate contradiction and see it surface in the final feedback.
4. Eventually receive `done: true` with a complete, correctly-shaped,
   specific (not generic) `feedback` object.
5. Run this successfully for at least 3 structurally different candidates
   without errors.
