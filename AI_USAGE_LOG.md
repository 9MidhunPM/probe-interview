# AI Usage Log - Probe Interview

Probe Interview was developed through an iterative human-directed and
AI-assisted workflow. The owner supplied the product direction, architecture
constraints, test scenarios, design reviews, deployment decisions, and
acceptance criteria. AI sessions implemented, tested, debugged, and documented
the resulting system.

This log is deliberately evidence-based. The complete prompt and decision
ledger is [`PROMPTS.MD`](PROMPTS.MD). The preserved source exports are in
[`docs/ai-logs/`](docs/ai-logs/).

## AI Sessions

The raw transcript headings identify these sessions:

- `openai/gpt-5.6-terra`: primary implementation work across the backend and
  frontend, including coding, testing, browser verification, commits, and
  pushes.
- `agentrouter/claude-opus-5`: direct investigation and implementation work on
  the candidate-pose regression on Aug 9.
- `agentrouter/gpt-5.6-sol`: a recorded handoff during the candidate-pose fix.
- `opencode/big-pickle`: the recorded implementation of the mode-choice and
  larger-portrait UI pass.

The earlier two-role description of "Claude planning" and "GPT
implementation" is retained only in the archived draft because the raw
exports show a broader and overlapping set of sessions.

## Verified Feature History

| Area | Result | Git evidence |
|---|---|---|
| Core graph | Seven-agent LangGraph interview with checkpointed sessions, personalized planning, adaptive review, consistency checking, and structured evaluation. | `b992bff`, `89247f9`, `38c8bd3`, `b947d82` |
| Hardening and UI foundation | Rate limiting, payload/token limits, prompt boundaries, validation, browser UI, answer simulation, and final feedback. | `2a7cf14`, `628b78c` |
| Deployment | Docker/Dokploy/Traefik configuration, no-index protections, and live domain. | PR #1 merge `ccf6848`; source/publish commits are detailed in [`PROMPTS.MD`](PROMPTS.MD). |
| Conversation quality | Peer-framed probing, one-probe-per-topic behavior, specific closing, and conceptual-versus-implementation feedback. | PR #5 merge `4832093` |
| Observability | Additive per-turn `trace` field and collapsible agent-output UI. | PR #6 merge `abfe7d6` |
| Frontend evolution | React scene, `/classic`, unified room, persistent composer, onboarding, tutorial, responsive layout, Dr. Probey personality, poses, streaming, and richer summary. | PRs #7-#16 plus direct commits through `2d67cff` |
| Public submission state | Temporary access gate removed; README, PRD, AGENT, and MIT license updated. | `ee08f82` |

## Notable AI-Assisted Problem Solving

- Found and fixed LangGraph checkpoint resumption at the evaluator boundary.
- Found missing strict OpenAI JSON-schema requirements and centralized the
  recursive `additionalProperties: false` normalization.
- Used live reviewer output to implement adaptive `simplify`, `escalate`,
  `advance`, `probe`, and `check_in` behavior.
- Detected Groq quota exhaustion and introduced role-specific OpenAI routing
  while preserving optional provider fallbacks.
- Added prompt-injection boundaries, rate limiting, payload limits, and safe
  structured-output fallbacks.
- Diagnosed multiple frontend regressions through Playwright screenshots and
  browser measurements, including fixed viewport budgeting, stale intent,
  hardcoded candidate poses, control shifting, and summary overflow.
- Preserved the existing API contract while adding trace, answer simulation,
  streaming presentation, and richer feedback.

## Verification and Limitations

- The exports report later Python test runs with `10 passed` and repeated
  frontend production builds passing.
- The exports report real provider-backed conversations for setup
  personalization, adaptive routing, contradiction detection, strict schemas,
  trace output, and final feedback.
- Later UI sessions report Playwright desktop/mobile checks and screenshots;
  earlier sessions explicitly record that Chrome could not be installed because
  of the container's `no new privileges` policy.
- Docker image execution was unavailable locally; deployment configuration was
  structurally checked and the live domain was reported as deployed.

## Security

`.env` is ignored and no provider key literals are committed or present in the
preserved exports. The deployment export records a prior Dokploy
inspection that exposed provider values in a tool response; those credentials
must be rotated or confirmed rotated outside this repository. No secrets are
reproduced here.

## Sources

- [`PROMPTS.MD`](PROMPTS.MD) - consolidated prompt, feature, commit, verification,
  attribution, and evidence-gap record.
- [`docs/ai-logs/opencode-phase-1-setup-2026-08-09.md`](docs/ai-logs/opencode-phase-1-setup-2026-08-09.md) - full Phase 1 through backend/UI foundation export.
- [`docs/ai-logs/opencode-ui-rebuild-2026-08-09.md`](docs/ai-logs/opencode-ui-rebuild-2026-08-09.md) - full later UI refinement export.
- [`docs/ai-logs/ai-usage-log-raw-draft.md`](docs/ai-logs/ai-usage-log-raw-draft.md) - unchanged historical draft, retained for provenance.
