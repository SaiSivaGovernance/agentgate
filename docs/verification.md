# Verification record

**Build date:** October 5, 2026. **Status:** 25/25 automated tests and 8/8 real-model HTTP integration checks passed. Browser verification confirmed support, marketing, revocation, policy-test controls and responsive layouts. Native file-download completion in the in-app browser remains unconfirmed; no public deployment has been verified.

## Completed local-model installation check

| Check | Observed result |
|---|---|
| Official Ollama runtime | Version 0.35.1 downloaded from the official GitHub release |
| Runtime archive integrity | SHA-256 matched the release asset digest |
| Apple executable signature | `codesign --verify --strict` passed |
| Model download | `qwen3:1.7b`, Q4_K_M, model manifest digest recorded in `local-model.md` |
| Model API availability | `GET /api/version` and `GET /api/tags` returned expected version/model |
| Real model generation | `POST /api/chat` returned “River Labs has a trial subscription.” from a supplied fictional fact; `done: true` |
| Local runtime | Bound to `127.0.0.1:11434`, cloud features disabled; GPU-backed inference confirmed by `/api/ps` |

The standalone model smoke check used `think: false`, `stream: false`, temperature 0 and 4,096 context tokens. Its approximately 0.89-second total duration was one observed request, not a performance guarantee. The reproducible application-level checks and their results are included as `scripts/smoke.mjs` and [live-model-report.json](live-model-report.json). See [model provenance](local-model.md) for hashes and installation details.

## Application verification

| Area | Command or scenario | Status and evidence |
|---|---|---|
| Core and HTTP regression suite | `npm test` | **25/25 passed:** 19 core tests and 6 HTTP tests, including a fresh unauthenticated clone of the published repository |
| Real-model HTTP integration suite | `node scripts/smoke.mjs` | **8/8 passed** against local AgentGate with `qwen3:1.7b`; [JSON report](live-model-report.json) |
| Interactive deterministic evaluation | `POST /api/evaluate {}` | Passed HTTP checks and the browser Run policy tests control: 8/8 isolated cases, no AI calls |
| Real AI support answer | Support role; account and adjustment question | Passed HTTP and browser checks: real Qwen3 answer, **Masked** verdict, two permitted citations, three masked fields; fixture contact/payment values excluded |
| Role-based denial | Marketing role; same customer question | Passed HTTP and browser checks: **Blocked**, no customer citations; browser labels it **Policy decision** |
| Useful authorized access | Marketing campaign question | Passed real-model HTTP and browser checks: permitted campaign citation and answer including **48 sign-ups** |
| Stewardship scope | Steward governance question and customer denial | Passed core deterministic cases; real-model browser walkthrough not yet recorded |
| Source revocation | Warm account-answer cache; revoke adjustment source; ask for adjustment | Passed real-model HTTP flow: old turns cleared, revision advanced, revoked-source follow-up blocked without a cache hit. Browser verified a permitted product answer, revoked its source, observed prior turns clear, then received a blocked answer for the same question |
| Policy change during generation | Deferred-model unit cases for revocation, role switch and reset | Passed core cases; controlled test doubles exercise race timing and confirm generated content is discarded |
| Model failure behavior | Unavailable, failed or malformed model response | Passed core cases; explicit blocked/error result with no silent evidence fallback |
| Evidence export | Fetch receipt, parse JSON, inspect fields and attempt cross-session read | Passed HTTP suite and integration smoke: question hash present; question, answer and source bodies absent; other-session access denied. Browser Download JSON button invoked; the automation download event timed out and no saved file was confirmed. HTTP attachment content and ownership checks passed |
| Browser presentation | Actual support/marketing questions and answer states | Completed desktop (1360 px) and mobile (390 px) checks with no horizontal overflow, masked citation disclosure, source revocation and the policy-test button. No browser console warnings/errors observed. [Screenshot](agentgate-preview.jpg). Native download completion remains unconfirmed |
| Public deployment | HTTPS URL and deployed API scenarios | Not deployed |
| Public source | Source distribution | Complete source published and all 24 remote file hashes verified at [SaiSivaGovernance/agentgate](https://github.com/SaiSivaGovernance/agentgate) on October 5, 2026; unauthenticated clone succeeded |
| LinkedIn | AgentGate Featured entry | Not added |

The integration report was recorded at **3:07 PM America/New_York on October 5, 2026** (`2026-10-05T19:07:03.497Z`). It records eight observed scenario results. Several scenarios check policy decisions without generation; “8/8” does not mean eight separate AI completions.

## What the automated cases check

The current test sources cover server-only fixture boundaries, source authorization and field masking, role-specific permitted questions, restricted-source denial, cache invalidation, metadata-only receipts, session isolation, model prompt inputs, citation rejection, known-value disclosure detection, in-flight policy changes, explicit AI failure behavior, request validation and bounded session history. HTTP cases cover origin and media checks, size limits, role/context forgery attempts, static-file exclusions and evidence ownership.

The in-app evaluator executes a smaller set of deterministic isolated policy cases. The HTTP integration smoke confirmed all returned cases passed and that the case count was at least eight. The exact current count can be read from the evaluator response. It does not measure model answer quality, production authentication, arbitrary prompt-injection resistance, or public-service availability.

## Interpretation

These tests use fictional data and intentionally simulated roles. Passing specific fixture cases does not establish universal security. The source filter and revision checks enforce the demonstrated access boundary, while the known-value and instruction-pattern checks have a deliberately limited scope. Citation membership checks do not prove every generated claim is supported by the source. Manual review of actual model answers remains a separate validation step.

The current application is local and has no real identity provider, Collibra tenant, production data or deployed public inference service. Claims in a portfolio or LinkedIn entry should match the completed rows above.
