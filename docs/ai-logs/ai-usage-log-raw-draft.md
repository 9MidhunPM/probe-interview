# AI Usage Log — Probe Interview

This project was built using two AI tools in distinct, complementary roles:

- **Claude (Anthropic)** — architecture and product planning, technical decision-making,
  debugging guidance, infrastructure troubleshooting, prompt engineering for the
  implementation agent, and UI/UX direction. Claude did not write code directly;
  it produced the detailed prompts executed by the implementation agent below.
- **GPT-5.6 Terra (via OpenCode / OpenChamber)** — the implementation agent. Executed
  the prompts from the Claude planning sessions: wrote code, ran tests, verified
  behavior against live LLM providers, committed, and opened PRs.

Full raw transcripts for both are included in [`/docs/ai-logs/`](./docs/ai-logs/):
- `claude-planning-log.md` — the complete planning conversation
- `opencode-implementation-log.md` — the complete implementation session export

## Summary: prompts → features → commits

| Phase | Feature | AI Tool(s) | Commit / PR |
|---|---|---|---|
| Planning | Architecture design: LangGraph multi-agent pipeline, provider strategy (Groq + OpenAI), PRD.md / AGENT.md | Claude | — (docs) |
| 1 | Repo scaffold, FastAPI + LangGraph skeleton, Interviewer + Evaluator nodes, checkpointer-based session resumption | Claude (prompt) → GPT-5.6 Terra (impl) | Initial commit |
| 2 | Strengths Finder, Weaknesses Finder, Topic Planner — personalized topic selection from candidate mission history | Claude → GPT-5.6 Terra | `89247f9` |
| 3 | Response Reviewer + adaptive difficulty routing (escalate/simplify/advance/end) | Claude → GPT-5.6 Terra | `38c8bd3` |
| 4 | Consistency Checker — cross-turn contradiction detection | Claude → GPT-5.6 Terra | `b947d82` |
| 5 | Rate limiting, payload validation, prompt-injection hardening | Claude → GPT-5.6 Terra | PR #5 (hardening) |
| — | Interviewer conversational quality redesign (probe-before-advancing, peer-framed reactions, based on external interview review) | Claude → GPT-5.6 Terra | PR #5 (conversation) |
| 6 | Deployment: Dockerfile, Dokploy/Traefik config, live domain | Claude → GPT-5.6 Terra | `ccf6848` (PR #1) |
| — | Password access gate (temporary, later removed) | Claude → GPT-5.6 Terra | PR #2 |
| — | OpenAI model routing (Groq → OpenAI migration after rate-limit incident), schema fixes | Claude → GPT-5.6 Terra | PR #3 |
| — | Agent reasoning-trail trace panel (API + UI) | Claude → GPT-5.6 Terra | PR #6 |
| 7 | React frontend rebuild (Vite + React), custom-generated character/scene art, `/classic` fallback | Claude → GPT-5.6 Terra | PR #7 |
| — | Split-view interview layout, simulate-answer feature, agent-aware UI | Claude → GPT-5.6 Terra | PR #8 |
| — | Iterative UI/UX refinement (layout, pacing, avatars, speech bubbles) — multiple rounds based on live screenshot review | Claude → GPT-5.6 Terra | PRs #9–#16 |
| — | Full viewport layout rebuild (fixed-height, no page scroll, flex-based sizing) | Claude → GPT-5.6 Terra | `0027954`, `a239940` |
| — | Dr. Probey character/personality, moment callouts, shortened turn budget, post-interview approach recap | Claude → GPT-5.6 Terra | (final UI pass) |
| — | Home/landing page, candidate detail editor, `/classic` parity rebuild | Claude → GPT-5.6 Terra | (final UI pass) |
| — | Guided tutorial overlay | Claude → GPT-5.6 Terra | (final UI pass) |
| — | Password gate removal, README, LICENSE, final cleanup | Claude → GPT-5.6 Terra | (final commit) |

*(Fill in the remaining commit hashes/PR numbers from `git log` before submitting — several are referenced above from memory of the build session; double-check against `git log --oneline` for exact accuracy.)*

## Notable AI-assisted problem-solving

- Diagnosed and fixed an OpenAI strict-JSON-schema incompatibility (`additionalProperties`
  requirement) discovered via live testing, not caught by static checks.
- Diagnosed a Groq daily token-limit exhaustion during testing and redesigned provider
  routing (Groq for high-frequency agents, OpenAI for Interviewer/Evaluator) in response.
- Debugged container permission/ownership drift (uid mismatch between host and
  OpenChamber container) recurring across multiple sessions, resolved via shared group
  + setgid configuration.
- Diagnosed a Linux/ARM64 incompatibility with Playwright's Chrome channel and resolved
  it by switching to the system-installed Chromium binary with explicit executable path
  configuration.
