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

## Complete Prompt Inventory

The following inventory includes every `**User**` prompt block in the two
preserved exports, including short continuation, push, and sub-agent
publication requests. The line reference points to the complete wording; the
raw exports remain the authoritative full-text record.

### Phase 1 and Backend Export

1. **P1.1 - Phase 1 setup** (`opencode-phase-1-setup-2026-08-09.md:7`): Read the project specifications, create the repository, implement the two-node Phase 1 graph, exact API contract, checkpointer, environment template, README, commit, push, and curl verification.
2. **P1.2 - Install without a virtual environment** (`:1611`): Check whether the required libraries can be installed directly with system Python.
3. **P1.3 - Retry installation** (`:1649`): Try the direct installation again after the user reported that the environment was fixed.
4. **P1.4 - Verify installed requirements** (`:1675`): Verify the user's reported dependency installation and run the Phase 1 flow.
5. **P1.5 - Verify pip permissions** (`:1701`): Recheck permissions and install with the newly granted system access.
6. **P1.6 - Real Phase 1 and Phase 2** (`:1761`): Use live providers, update model defaults, implement setup agents, test personalization, and publish the changes.
7. **P1.7 - Phase 3 approval** (`:1980`): Proceed with Response Reviewer and adaptive `simplify`, `escalate`, `advance`, and `end` routing.
8. **P1.8 - Phase 4 approval** (`:2114`): Implement Consistency Checker state, contradiction accumulation, evaluator input, and clean/contradiction live tests.
9. **P1.9 - Phase 5 and Phase 7 approval** (`:2241`): Add hardening and the frontend while explicitly skipping deployment until later.
10. **P1.10 - Deployment PR** (`:2411`): Build Docker/Dokploy/Traefik configuration, no-index protections, a selected subdomain, and a review-only PR.
11. **P1.11 - Create the hosted service** (`:2519`): Create the Dokploy project/application and host the service with the selected domain.
12. **P1.12 - Conversational quality and temporary gate** (`:2586`): Improve reactions, openings, closings, disengagement handling, and add the temporary password gate while keeping deployment on `main`.
13. **P1.13 - Continue the active feature work** (`:2772`): Continue with the next implementation, verification, and PR steps.
14. **P1.14 - Provider migration planning** (`:2859`): Replace normal Groq traffic with cost-appropriate OpenAI models, search for suitable model allocation, and ask clarifying questions before implementation.
15. **P1.15 - Implement provider migration** (`:2946`): Implement role-based OpenAI routing, retries, mocked tests, usage logging, and production `.env` instructions without changing credentials.
16. **P1.16 - Strict schema production failure** (`:3076`): Fix the OpenAI `additionalProperties` error centrally for every structured agent, preserve the orchestrator model, test all seven agents, and open a focused PR.
17. **P1.17 - Conversational review redesign** (`:3162`): Add one targeted probe per topic, peer framing, sequential questions, specific closings, evidence-calibrated evaluation, live tests, and comparison excerpts.
18. **P1.18 - Agent trace** (`:3320`): Add an additive per-turn `trace` response field, safe structured outputs, a collapsed UI reasoning panel, documentation updates, and contract-preservation tests.
19. **P1.19 - React frontend rebuild** (`:3446`): Preserve the old interface at `/classic`, build the Vite/React scene, add answer simulation, supplied artwork, poses, trace UI, Docker build support, and live flow tests.
20. **P1.20 - Restore access to continue** (`:3532`): Continue the React branch after workspace permissions were restored.
21. **P1.21 - Split interview layout** (`:3641`): Rebuild the scene as interviewer/candidate zones with speech bubbles, editable generated answers, explicit Next gating, and a persistent agent sidebar.
22. **P1.22 - Stop using isolated clones** (`:3817`): Work in the real workspace, verify write access, attempt Chromium installation, and rebuild the UI as one bright unified room with both characters visible.
23. **P1.23 - Root access continuation** (`:3864`): Confirm that root access is available and continue the unified-scene repair.
24. **P1.24 - Interaction polish** (`:4007`): Fix bubble overlap, avatar placement, pacing gates, poses, answer-generator status, Markdown, transcript, feedback modal, and screenshot verification.
25. **P1.25 - Fixed frame and conversation layout** (`:4136`): Remove the rendered preview, create top/bottom conversation panels, restore a fixed frame, add speaker focus, and open a follow-up PR.
26. **P1.26 - Composer and speech tails** (`:4219`): Fix the cramped composer, put generated and typed text in one input, add speech tails, and slow interviewer streaming.
27. **P1.27 - Agent output controls** (`:4289`): Move style buttons beside the composer, align tails, cap generated answers, preserve historical agent output, and open output modals.
28. **P1.28 - Compact response rail** (`:4352`): Compact controls, align speaker tails, stream candidate answers, map thinking poses correctly, and let the transcript use available space.
29. **P1.29 - Viewport and onboarding** (`:4417`): Lock the interview viewport, close overlays by clicking outside, hide controls during send, add candidate profiles, and improve the home experience.
30. **P1.30 - Static frame and intent** (`:4495`): Keep the room fixed, reduce the candidate area, align actions, auto-scroll the transcript, distinguish agent states, and show question intent.
31. **P1.31 - Direct single-commit workflow** (`:4577`): Restore the missing background, fix composer placement and scrolling, keep intent above the interviewer, and switch from PRs to single commits.
32. **P1.32 - Always push `main`** (`:4635`): Push the current direct-commit work to `main`.
33. **P1.33 - Composer clipping** (`:4677`): Rebalance the fixed-height layout so the full Send row is visible at 800px and 900px, with real screenshot confirmation.
34. **P1.34 - Continue the height fix** (`:4699`): Continue the viewport-budget correction after the initial browser limitation.
35. **P1.35 - Publish deployment branch** (`:4753`): Publish exactly the requested deployment patches through authenticated GitHub tooling without modifying Dokploy or local files.
36. **P1.36 - Publish Phase 7** (`:4822`): Publish the Phase 7 tree to `main` and verify the frontend route, static bundle, and README instructions.
37. **P1.37 - Publish Phase 5** (`:4873`): Publish only the hardening commit, excluding untracked frontend output, and verify limiter/token-cap changes.
38. **P1.38 - Publish Phase 4** (`:4929`): Publish the consistency-checking snapshot and verify the checker and evaluator flags.
39. **P1.39 - Publish Phase 3** (`:4979`): Publish the reviewer implementation and conditional routing to `main`.
40. **P1.40 - Publish Phase 2** (`:5022`): Publish the setup agents, personalization script, and Phase 2 graph edges.
41. **P1.41 - Publish evaluator fix** (`:5075`): Publish only the evaluator-resumption fix through the authenticated API and verify the invocation.
42. **P1.42 - Publish the repository** (`:5113`): Publish all tracked Phase 1 files to the empty public repository and verify the remote tree.
43. **P1.43 - Publish missing documentation** (`:5155`): Add `README.md`, `PRD.md`, and `AGENT.md` to the remote in one authenticated commit.

### UI Rebuild Export

1. **U1 - Vertical layout rebuild** (`opencode-ui-rebuild-2026-08-09.md:7`): Sync the real workspace, establish a `100dvh` grid, screenshot the skeleton, restore all interaction, and make one verified commit.
2. **U2 - Retry with corrected environment** (`:77`): Restart the server and run the actual API-backed flow instead of mocks.
3. **U3 - Ignore verification noise** (`:182`): Add targeted ignore rules for screenshots, logs, MCP state, and local tooling output, then push the layout commit.
4. **U4 - Use SSH** (`:252`): Push the verified commit through Git SSH.
5. **U5 - Persistent action layout** (`:278`): Replace fixed-height scrolling surfaces, fix intent updates, merge Send/Next into one persistent action, and verify desktop/mobile states.
6. **U6 - Push the composer fix** (`:407`): Push the verified persistent-composer commit to `main`.
7. **U7 - Dr. Probey and interview moments** (`:433`): Enlarge response controls, add Dr. Probey's personality, reduce turn count, add occasional moments, and add an approach recap.
8. **U8 - Push the Dr. Probey pass** (`:576`): Push the single committed personality and pacing change.
9. **U9 - Home, editor, and Classic parity** (`:602`): Add onboarding, guided candidate editing, and a full-featured `/classic` flow.
10. **U10 - Character brief and scope clarification** (`:644`): Supply Dr. Probey's full character brief, require a status dropdown based on real data, and approve the `/classic` rebuild.
11. **U11 - Continue onboarding work** (`:722`): Continue implementation and screenshot verification.
12. **U12 - Candidate setup scrolling and copy** (`:818`): Make candidate setup scrollable at short heights, expand Dr. Probey's explanation, and explain the named pipeline agents.
13. **U13 - Long-form landing page** (`:904`): Fix home-page clipping, add narrative sections, technical details, features, a Dr. Probey moment, and a final CTA.
14. **U14 - Remove the access gate** (`:1015`): Delete the gate and related configuration, preserve rate limits, add the MIT license, rewrite project docs, audit secrets, and verify a gate-free live interview.
15. **U15 - Mode choice** (`:1193`): Enlarge Dr. Probey artwork and add Scene Mode versus Classic Mode selection with recommendation and explanations.
16. **U16 - Continue mode-choice work** (`:1252`): Continue browser verification and commit the mode-selection change.
17. **U17 - Guided tutorial** (`:1459`): Add persisted spotlight coachmarks, skip/replay behavior, responsive positioning, and screenshot verification across the full sequence.
18. **U18 - Candidate pose investigation** (`:1588`): Find out why the candidate never moves or changes pose.
19. **U19 - Implement pose restoration** (`:1714`): Restore the candidate pose state and animation behavior identified during the investigation.
20. **U20 - Continue pose implementation** (`:1746`): Continue wiring the derived pose image state.
21. **U21 - Continue pose implementation** (`:1770`): Continue the unfinished pose wiring.
22. **U22 - Continue after handoff** (`:1786`): Continue the candidate pose fix from the previous agent state.
23. **U23 - Push-status check** (`:1862`): Ask whether the verified pose fix had been pushed.
24. **U24 - Push the pose fix** (`:1878`): Commit and push the candidate pose restoration.
25. **U25 - Deterministic poses and richer summary** (`:1904`): Remove character bobbing, enforce rule-based poses, stream answers, add End interview, and expand the summary page.
26. **U26 - Always push to GitHub** (`:2022`): Commit and push the streaming, pose, end-interview, and summary changes.
27. **U27 - Slower streams and exact intent** (`:2048`): Slow both streams, restyle and reposition End interview, fix summary columns, preserve idle agent output, align replay, and derive intent from live routing.
28. **U28 - Human answer personas and intent bubble** (`:2143`): Make unsure/vague generated answers sound human and move the exact intent into a lighter speech bubble below Dr. Probey's answer.
