# Probe Interview — Product Requirements Document (v2)

## 1. Summary

Probe is a multi-agent AI interview system that conducts a conversational
technical interview with a candidate, personalized against their actual
learning history from a 31-day AI cohort. A LangGraph-orchestrated set of
specialized agents reads the candidate's mission-level performance
(passes, failures, skips, attempt counts) to decide what to ask, how hard
to push, and what to flag in the final feedback — rather than asking
generic questions off a topic list.

## 2. Problem

Given: a curriculum (31 days, 8 modules) and per-candidate mission records.
The challenge requires exposing a single stateful HTTP endpoint that runs
a multi-turn interview and ends with structured feedback. Most submissions
will ask generic questions pulled from curriculum topics. Probe's
differentiator: purpose-built agents each own one piece of reasoning
(strengths, weaknesses, question generation, answer review, consistency,
final evaluation), coordinated by an explicit graph rather than one
do-everything prompt.

## 3. Goals

- Fully satisfy the technical spec contract (§5) — non-negotiable, graded
  programmatically.
- Personalize interview topics using: job role relevance, high-attempt
  passes (shaky spots), skipped topics (gaps), first-try passes (confirmed
  strengths).
- Adapt question difficulty live based on per-turn answer review.
- Detect and surface inconsistencies between early claims and later
  technical answers.
- Produce feedback that cites specific transcript moments, not generic
  praise/criticism.
- Stay operable on a fixed LLM budget without babysitting — hard caps,
  cheap models on high-frequency agents, not manual monitoring.
- Use this build as a real learning exercise in graph-based agent
  orchestration (LangGraph), not just "call the API a few times."

## 4. Non-Goals (explicitly out of scope)

- Voice interaction, user authentication, persistent user accounts,
  long-term cross-session history, mobile apps
- Vector database / RAG retrieval infra (curriculum fits directly in
  context at this scale — not needed)
- AgentRouter or any shared LLM proxy — this project uses direct API keys
  (Groq / OpenAI / Gemini) per agent, chosen for learning + cost control

## 5. API Contract (fixed, from Technical Specification)

```
POST /api/interview
```

No authentication. State is scoped to `sessionId` (maps to a LangGraph
`thread_id`), no cross-session persistence requirement.

**Start interview**
```json
// request
{ "sessionId": "abc-123", "candidate": { ...candidate.json shape... } }
// response
{ "reply": "Welcome. Let's begin your interview.", "done": false }
```

**Conversation turn**
```json
// request
{ "sessionId": "abc-123", "message": "..." }
// response
{ "reply": "...", "done": false }
```

**End of interview**
```json
{
  "reply": "Interview completed.",
  "done": true,
  "feedback": {
    "summary": "string",
    "strengths": ["string"],
    "gaps": ["string"],
    "next": ["string"]
  }
}
```

**Execution trace (additive extension)**

Every response may also include `trace`, an array containing only the agents
that fired for that HTTP turn. Each entry has an `agent` display name and an
`output` object containing that agent's structured result. Trace never includes
system prompts or provider instructions. Existing `reply`, `done`, and
`feedback` fields remain unchanged.

```json
{
  "trace": [
    { "agent": "Response Reviewer", "output": { "signal": "probe", "probe_target": "relevance threshold" } },
    { "agent": "Consistency Checker", "output": { "contradiction": false, "flags": [] } },
    { "agent": "Interviewer", "output": { "reply": "How would you choose that threshold?" } }
  ]
}
```

**Answer simulation (additive helper endpoint)**

`POST /api/simulate-answer` is separate from the graded interview endpoint. It
accepts the current question, candidate context, and one of `confident`,
`unsure`, or `vague`, then uses the extraction-tier model to generate a plausible
candidate answer. The frontend submits that returned text to
`POST /api/interview` unchanged. Custom candidate text bypasses this helper.

## 6. Inputs

- `curriculum.json` — 31 days, 8 modules, each day has title/type/tools/objectives.
- `candidate.json` (per-candidate) — `member` (id, name, jobRole,
  yearsExperience, education, status), `missions[]` (day, title,
  passed/skipped, attempts), `signals` (commitDays, missionsCompleted,
  missionsFirstTry).

## 7. Agent Architecture

### 7.1 Orchestration

A LangGraph `StateGraph` is the orchestrator — nodes are agents, edges are
mostly deterministic routing functions reading agent outputs (not a
separate "supervisor" LLM call). Session continuity across HTTP requests
is handled by LangGraph's checkpointer, keyed on `sessionId` as
`thread_id`: the graph pauses awaiting candidate input and resumes on the
next request with `message` injected into state. This replaces a
hand-rolled session dict with the framework's native human-in-the-loop
pattern.

### 7.2 Agents

**Setup phase (once per session, on first request):**
- **Strengths Finder** (Groq) — first-try passes → strengths list w/ evidence
- **Weaknesses Finder** (Groq) — high-attempt passes + skipped missions →
  gaps list w/ evidence
- **Topic Planner** (Groq) — merges strengths + weaknesses + `jobRole`
  relevance into an ordered, budgeted topic queue (~4–6 topics)

**Per-turn loop:**
- **Interviewer** (strong model — OpenAI or Gemini) — generates the next
  question from topic queue + transcript + last Response Reviewer signal.
  May state why a topic was chosen (role-aware transparency).
- **Response Reviewer** (Groq) — grades the candidate's last answer
  (depth, correctness, vagueness), emits a routing signal: escalate /
  simplify / advance topic / end
- **Consistency Checker** (Groq) — compares the latest answer against
  earlier transcript claims, flags material contradictions into running
  state

**End phase (triggered by routing logic — topic budget exhausted or turn cap):**
- **Evaluator** (strong model) — full transcript + all Strengths/Weaknesses
  findings + every Reviewer/Consistency signal → final `feedback` object,
  citing specific transcript moments

### 7.3 Provider Strategy

Per-agent model assignment via env-driven provider abstraction:
- Groq (fast/cheap): Strengths Finder, Weaknesses Finder, Topic Planner,
  Response Reviewer, Consistency Checker
- Strong model (OpenAI or Gemini, configurable): Interviewer, Evaluator

## 8. Non-Functional Requirements

- **Cost safety**: hard billing caps at each provider, server-side turn
  caps, `max_tokens` caps per agent call, input payload size limits.
- **Abuse resistance**: per-IP rate limiting, unauthenticated but not
  publicly linked/indexed, prompt-injection-resistant system prompts
  across all agents (none should echo internal prompts or accept
  instruction overrides embedded in candidate input).
- **Reliability**: no 500s on malformed input; graceful validation errors.
- **Observability**: worth logging which agent fired, its output, and the
  routing decision per turn — both for debugging the graph and because it's a
  great demo artifact (showing judges the graph's reasoning trail). The API
  exposes this safe structured output as an additive `trace` field, and the UI
  provides a collapsed reasoning panel for it.

## 9. Success Criteria

- A judge's automated script can POST through a full interview using only
  the documented contract and get a valid `feedback` object every time,
  for any of the 20 sample candidates.
- Two structurally different candidates produce visibly different
  interview paths and feedback — proving personalization is real.
- At least one live demo moment shows the Consistency Checker or adaptive
  difficulty in action — not just claimed in the README.

## 10. Tech Stack

- Backend: FastAPI (Python)
- Orchestration: LangGraph (StateGraph + checkpointer)
- LLM providers: Groq (frequent/cheap agents), OpenAI or Gemini (Interviewer, Evaluator)
- State: LangGraph checkpointer (in-memory `MemorySaver` for hackathon
  scope; `SqliteSaver` as a resilience upgrade if time allows)
- Deploy: Docker container via Dokploy, routed through existing Traefik +
  Cloudflare, unguessable/unlinked subdomain
- Frontend: Vite + React single-page interview scene served by FastAPI. The
  React build is emitted into `app/static` during Docker's Node build stage.
  `/classic` preserves the prior static interface as an authenticated fallback.
