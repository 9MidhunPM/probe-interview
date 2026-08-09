# Consolidated Prompt Record - Probe Interview

This file is a human-readable index of the prompts, decisions, implementation
work, and verification recorded during the build. It is a synthesis, not a
replacement for the raw exports. The raw exports are preserved in
[`docs/ai-logs/`](docs/ai-logs/).

## Evidence Rules

- The raw exports are the source for what was requested, discussed, tested, or
  reported during an AI session.
- Git history is the source for commit identities, authors, dates, branch
  merges, and the final repository state.
- The current repository tree is the source for what is present now.
- A claim is marked as reported when it comes from a session transcript but was
  not independently rerun while preparing this document.
- No model, prompt, test result, commit, PR, or deployment detail is inferred
  solely from the feature's existence.

## Sources

- [AI Usage Log](AI_USAGE_LOG.md) - concise submission-facing summary.
- [Phase 1 and backend export](docs/ai-logs/opencode-phase-1-setup-2026-08-09.md) - complete preserved export.
- [UI and later refinement export](docs/ai-logs/opencode-ui-rebuild-2026-08-09.md) - complete preserved export.
- [Historical draft log](docs/ai-logs/ai-usage-log-raw-draft.md) - preserved unchanged as an archived draft, not treated as verified evidence.
- [README](README.md), [PRD](PRD.md), and [AGENT instructions](AGENT.md) - project intent and implementation constraints.

## Project Brief

Probe Interview is a personalized technical interview practice room. A
FastAPI endpoint serves a LangGraph state machine with seven specialized
agents. The system uses candidate mission history to plan topics, adapts the
conversation, checks consistency, and produces structured feedback. The Vite
and React interface exposes the conversation, answer simulation, agent trace,
and final explanation; `/classic` provides an art-free interface.

The fixed API contract is `POST /api/interview` with `sessionId`-scoped state.
The required fields are `reply`, `done`, and, at completion, `feedback` with
`summary`, `strengths`, `gaps`, and `next`. Additive fields such as `trace` must
not change those fields.

## Collaboration Model

### Human contribution

The project owner supplied the product requirements, architecture constraints,
phase-by-phase prompts, character brief, test scenarios, design feedback,
deployment choices, credentials through local environment configuration, and
acceptance decisions. The owner also directed the change in workflow from
review-only PRs to single commits pushed directly to `main` for later UI work.

### AI sessions recorded in the exports

The model identity is recorded in transcript headings and is more varied than
the earlier draft log claimed:

- `openai/gpt-5.6-terra` is the primary implementation label in the Phase 1,
  backend, and most UI sessions. Those entries report code changes, tests,
  browser verification, commits, and pushes.
- `agentrouter/claude-opus-5` is directly recorded investigating and beginning
  the candidate-pose fix on Aug 9. The transcript includes source edits and
  diagnosis, so the claim that Claude never wrote code is not supported by the
  supplied evidence.
- `agentrouter/gpt-5.6-sol` appears during the candidate-pose handoff and is
  recorded correcting turn-state derivation.
- `opencode/big-pickle` is recorded implementing and testing the mode-choice
  UI and larger Dr. Probey artwork.

The transcript labels identify sessions, not necessarily a complete accounting
of every underlying platform component. The record therefore avoids reducing
the project to a two-tool Claude-planning/GPT-implementation story.

## Prompt Timeline

### Foundation and backend

| Prompt or decision | Requested work | Evidence and result |
|---|---|---|
| Phase 1 setup, Aug 7 | Read `PRD.md` and `AGENT.md`; create the public repository; implement only the FastAPI contract, two real LangGraph nodes, `MemorySaver` resume, configuration, and README. | Local Phase 1 work was `742782c`. The export reports static verification because the initial environment lacked `pip`, `venv`, and live credentials. The remote publication involved API-created equivalent commits including `e4c30bc`, `5f55fdf`, `1834b39`, and `064960c`; the exact local/remote distinction is retained rather than collapsed. |
| Phase 1 resume fix, Aug 8 | Install requirements, run the checkpointed flow, and fix evaluator resumption if the real test exposed it. | The test found the evaluator re-entering the interviewer. The fix was locally `2748e13` and published to `main` as `b992bff`. A later real run also exposed and fixed missing `feedback.next` validation. |
| Phase 2 | Add Strengths Finder, Weaknesses Finder, and Topic Planner before Interviewer; persist their state; test structurally different candidates; keep Gemini selectable but inactive by default. | Local source `ade6ed1` was published as `89247f9`. The export reports live Groq/OpenAI queues for Emily Chen and Gerald Combs and a personalized opening question. |
| Phase 3 | Add the Groq Response Reviewer, defensive JSON parsing, adaptive `simplify`, `escalate`, `advance`, and `end` routing, and reviewer-aware questions. | Local source `e4c785c` was published as `38c8bd3`. The export reports live `simplify`, `escalate`, and `advance` behavior. |
| Phase 4 | Add the Groq Consistency Checker, retain contradiction flags in state, and pass accumulated flags to Evaluator. | Local source `4d8e3ef` was published as `b947d82`. The export reports both a deliberate contradiction and a clean no-false-positive conversation. |
| Phase 5 | Add rate limits, message limits, output-token caps, prompt-injection boundaries, and clean validation errors. | Local source `2cce754` was published as `2a7cf14`. The export reports `422` validation results, a real `429`, oversized-message rejection, new-session limiting, and an injection attempt that did not reveal prompts. |
| Phase 7 | Add the browser UI, candidate selection, answer simulation, feedback rendering, and local run instructions without changing the graded endpoint. | Local source `1b38364` was published as `628b78c`. The export reports a real UI flow through feedback; the initial environment could not launch system Chrome, so the limitation was recorded. |

### Deployment, provider, and reasoning work

| Prompt or decision | Requested work | Git evidence |
|---|---|---|
| Deployment, Aug 8 | Add the Dockerfile, compose and Traefik configuration, no-index protections, and host the service at the selected domain. | Deployment source commits `8b9c260` and `c6091dd` were published as equivalent remote commits `e6f9ba9` and `f40d95e`; merge commit `ccf6848` records PR #1. The live domain reported in the export is `https://probe.midhunpm.in/`. |
| Conversational quality and temporary gate | Make Interviewer react to answers, add peer-like check-ins and closings, and temporarily protect the public service with a password gate. | PR #2 was merged as `84afe00`, with feature commits including `08588ec`, `ec97697`, `0f88d5f`, and `e1f8db3`. The gate was later explicitly removed. |
| Provider migration | Move normal traffic from Groq toward role-specific OpenAI models after a Groq quota incident, while retaining optional fallbacks. | Feature `8277af9` merged as `096e86c`. The recorded model allocation was `gpt-5.6-luna` for Interviewer/Evaluator, `gpt-4.1-mini` for reasoning, and `gpt-4o-mini` for extraction. |
| Strict schema bugfix | Find every OpenAI structured-output call and recursively add `additionalProperties: false` rather than patching one agent. | Feature `dc1c261` merged as `28137fb`. The export reports a shared helper and a real session in which all seven agents completed. |
| Conversational probing | Add one targeted probe per topic, prevent repeat probing, use peer-framed reactions, keep questions sequential, and make closing/feedback evidence-specific. | Feature `9bf11a1` merged as `4832093` in PR #5. The export includes a real `probe` target, post-probe reaction, and specific closing. |
| Agent execution trace | Add additive per-turn `trace` output with only structured agent results and a collapsed UI panel. | Feature `d946857` merged as `abfe7d6` in PR #6. The export reports distinct setup, normal-turn, and final-turn agent sets. |

### Frontend evolution

| Prompt or decision | Requested work | Git evidence |
|---|---|---|
| React rebuild | Replace the default static UI with Vite/React, preserve the old UI at `/classic`, add answer simulation, scene art, poses, and trace UI. | Feature `a18f493` merged as `dad5553` in PR #7. |
| Split interview layout | Separate interviewer and candidate zones, editable generated answers, explicit Next gating, and persistent trace sidebar. | Feature `f0a94c2` merged as `bae8cb8` in PR #8. |
| Unified room | Replace duplicated split rooms with one bright shared scene, larger characters, speaker bubbles, and a bottom response dock. | Feature `8a3e9f8` merged as `2d2a117` in PR #9. |
| Interaction refinement | Prevent bubble overlap, add turn gates, poses, answer-generator state, Markdown output, transcript, feedback modal, and terminal-turn guard. | PR #10 merged as `3ebd6b1`; feature commits were `35b90a1`, `7c6126b`, and `f103723`. |
| Fixed frame and composer | Reframe conversation, widen the composer, retain previous agent output, compact controls, fix viewport budgeting, and keep the room stable. | PRs #11-#16 are represented by merge commits `0ee808b`, `5e7a0e1`, `75b0ed7`, `a56aaa1`, `3a6940c`, and `7a646b0`, with feature commits `5f8ec0f`, `63047b6`, `38c9887`, `6351416`, `8bd1520`, and `4030be3`. Direct follow-up commits include `a6d3cf2`, `7536c48`, and `4688119`. |
| Composer persistence | Replace state-dependent shifting controls with a persistent response box and one stateful action slot; key intent to the active reply. | Direct commit `d3891aa`. The export reports desktop/mobile Playwright flows through feedback. |
| Dr. Probey and pacing | Add the Dr. Probey identity, personality, shorter topic budget, moments, approach recap, and a wider summary. | Direct commit `96fa8fb`. The export reports live screenshots for the vertical rail and opening/personality; it explicitly notes that final moment/approach screenshots were still incomplete at that point. |
| Onboarding and classic parity | Add the long-form home/onboarding experience, candidate editor, guided setup, and a current `/classic` flow. | Direct commits `27f15cf`, `2c715f7`, and `ac3e980`. The exports report live Playwright checks and scroll measurements. |
| Gate removal and project documentation | Remove the temporary gate, preserve rate limits, add MIT license, rewrite README, update PRD/AGENT, and clean stale assets. | Direct commit `ee08f82`. The export reports `GET /login` as `404`, unauthenticated interview access as `200`, and a gate-free UI flow. |
| Mode selection | Make Dr. Probey artwork larger and add Scene Mode versus Classic Mode with a recommended label and mobile layout. | Direct commit `d8f3138`, implemented in the transcript labeled `opencode/big-pickle`. |
| Guided tutorial | Add persisted spotlight coachmarks, skip/replay behavior, and responsive target handling. | Direct commit `91ccc59`; the export reports seven desktop steps, mobile handling, persistence, skip, replay, and clean console output. |
| Candidate pose restoration | Diagnose the hardcoded idle sprite regression and restore deterministic pose and active/idle rules. | Direct commit `661bee5`. The transcript includes direct `agentrouter/claude-opus-5` investigation/edit entries and later handoff/implementation entries from other labeled sessions. |
| Streaming and summary | Remove bobbing, make poses rule-based, stream already-returned text at word cadence, add End interview, and expand the final summary. | Direct commit `11c7d94`. |
| Pacing and agent history | Slow both streams, place End interview below Send, retain historical agent outputs, distinguish agent states, and derive intent from live routing evidence. | Direct commit `f771384`. |
| Answer personas and intent | Make unsure answers naturally mixed-correctness, vague answers brief and uncertain, and move the exact question intent into a lighter speech bubble below the answer. | Direct commit `2d67cff`, the last commit in the verified local and remote `main` references at the time of this record. |

## Architecture and Feature Map

- `app/main.py` exposes the interview and answer-simulation endpoints, serves
  the built frontend, and applies rate limiting.
- `app/graph/graph.py`, `app/graph/state.py`, and `app/graph/routing.py`
  define checkpointed state, graph nodes, and deterministic routing.
- `app/agents/` contains Strengths Finder, Weaknesses Finder, Topic Planner,
  Interviewer, Response Reviewer, Consistency Checker, and Evaluator.
- `app/providers/` contains the direct provider abstraction and OpenAI, Groq,
  and Gemini clients.
- `frontend/src/main.jsx` and `frontend/src/styles.css` contain the current
  interactive UI, onboarding, scene, tutorial, trace, transcript, and summary.
- `app/static/` contains the current built frontend, scene art, and `/classic`
  fallback.
- `data/` contains the curriculum and sample candidates.
- `tests/` contains the provider/routing tests; `scripts/` contains the
  personalization test script used during Phase 2.

## Verification Record

The exports report the following verification categories:

- Python compilation and unit tests, reaching `10 passed` in the later project
  state.
- Vite production builds after frontend changes.
- Live OpenAI/Groq sessions for personalization, routing, contradiction
  handling, strict schemas, trace output, and final feedback.
- Real Playwright flows after browser support became available, including
  desktop/mobile layout checks, onboarding, `/classic`, tutorial persistence,
  candidate poses, streaming, and summary behavior.
- Docker configuration was structurally checked, but Docker was unavailable in
  the workspace during the deployment work.

These are transcript-reported results. They are not represented as a fresh
claim that every historical live test was rerun while writing this document.

## Security and Privacy Notes

- `.env` is gitignored and `.env.example` contains placeholders only.
- A raw export records that Dokploy inspection tooling returned configured
  provider secrets in plaintext during deployment setup. The keys were treated
  as exposed and should be rotated or confirmed rotated outside the repository.
- A pattern scan of the preserved exports found no literal `sk-`, `gsk_`,
  `AIza`, AWS access-key, or private-key material. Empty environment-variable
  examples are configuration documentation, not credentials.
- Sample candidate names and mission histories are repository test data. No
  production candidate records are included in the evidence archive.

## Corrections and Open Evidence Gaps

- The archived draft says Claude never wrote code. The raw exports directly
  record Claude-labelled investigation and edits during the candidate-pose
  fix, so that statement is not retained in the verified summary.
- The archived draft associates hardening with PR #5. Git history and the raw
  export show hardening was published as `2a7cf14`; PR #5 is the later
  conversational-probing feature.
- Several early Phase 1 and provider-publish operations created equivalent
  remote commits through the GitHub API because local Git authentication was
  unavailable. Both local source SHAs and remote publication SHAs are listed
  where the evidence distinguishes them.
- `technical-spec.md` is referenced by the historical export but is not a
  tracked file in the current tree; the API contract is present in `PRD.md` and
  `README.md`.
- Early UI sessions explicitly could not capture Chrome screenshots. Later
  sessions report Playwright Chromium captures. The record preserves those
  limitations instead of treating every UI claim as equally verified.

## Current Repository Reference

At the time of this documentation task, local `HEAD` and the SSH remote
`main` both resolve to:

```text
2d67cff46a460321d9bd6cbed070c8108e7c1a30
```

The documentation changes for this provenance record are intentionally
separate from the application history and must not alter runtime behavior.
