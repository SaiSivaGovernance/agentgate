# Verification record

**Build date:** October 5, 2026. **Status:** 34/34 automated tests passed, followed by 15/15 public smoke checks against both the local Workers runtime and the [deployed Cloudflare app](https://agentgate.trustcost-cloudflare-tooling.workers.dev/). Public browser verification confirmed masked support evidence, marketing denial, product-source revocation, evidence inspection, and 8/8 policy checks. The public app uses **Evidence mode without an AI model**. Earlier 8/8 local-model HTTP integration checks verified real Qwen3 inference. Native file-download completion in the in-app browser remains unconfirmed.

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
| Automated regression suite | `npm test` | **34/34 passed:** 19 core tests, 6 local HTTP tests, and 9 Cloudflare adapter tests. The original 25-test core/HTTP suite also passed from a fresh unauthenticated clone of the earlier published source |
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
| Public deployment | HTTPS URL and deployed API scenarios | [Live Cloudflare Evidence demo](https://agentgate.trustcost-cloudflare-tooling.workers.dev/), no sign-in; **15/15** checks passed in the local Workers runtime and against the deployed service; [public report](public-smoke-report.json) |
| Public browser flow | Support, Marketing, source revocation, evidence, policy tests | Verified masked Support evidence with two citations; Marketing denial for the same customer question; permitted product answer, then revoked-source denial with prior turns cleared; evidence inspection and **8/8** isolated policy checks |
| Public source | Source distribution | [SaiSivaGovernance/agentgate](https://github.com/SaiSivaGovernance/agentgate). Initial publication on October 5, 2026 verified all 24 then-published file hashes and an unauthenticated clone; Cloudflare publication adds the public adapter, tests, and deployment documentation; pushed at commit [`0273f50`](https://github.com/SaiSivaGovernance/agentgate/commit/0273f50) |
| LinkedIn Projects | Saved AgentGate project | Verified in the [profile Projects list](https://www.linkedin.com/in/sai-siva-m-942179419/details/projects/), project ID `235092861`; October 2026–October 2026; Data Governance, Data Privacy, and Metadata Management skills; live-demo and GitHub URLs in the description and an attached GitHub media card |
| LinkedIn Featured | Separate Featured link | Pending; not saved |

The integration report was recorded at **3:07 PM America/New_York on October 5, 2026** (`2026-10-05T19:07:03.497Z`). It records eight observed scenario results. Several scenarios check policy decisions without generation; “8/8” does not mean eight separate AI completions.

## Public deployment verification

The deployed version is `d79a1ee3-7fe3-40f8-b1d3-8d22199ee89f`. The public HTTP report was recorded at **5:30 PM America/New_York on October 5, 2026** (`2026-10-05T21:30:19.853Z`). Its 15 checks cover unauthenticated availability, Evidence-only enforcement, session isolation, masking, source denial, revocation and cache clearing, metadata exports, strict request handling, static-file boundaries, and reset. Run `node scripts/public-smoke.mjs https://agentgate.trustcost-cloudflare-tooling.workers.dev` to repeat them.

Public sessions expire 30 minutes after creation. The adapter rejects access to expired state and schedules deletion through a cleanup alarm; physical deletion is best effort and can occur later. These limits are distinct from the local Node server’s in-memory lifecycle. No public model endpoint or connection to the author’s Ollama process is exposed.

## What the automated cases check

The core and local HTTP test sources cover server-only fixture boundaries, source authorization and field masking, role-specific permitted questions, restricted-source denial, cache invalidation, metadata-only receipts, session isolation, model prompt inputs, citation rejection, known-value disclosure detection, in-flight policy changes, explicit AI failure behavior, request validation and bounded session history. HTTP cases cover origin and media checks, size limits, role/context forgery attempts, static-file exclusions and evidence ownership.

The nine Cloudflare adapter tests additionally check durable state reconstruction with isolated storage doubles, explicit public AI rejection, cookie and origin checks, per-session limits, export isolation, expiry, reset, and bounded state. The local Workers and deployed HTTP smoke checks provide separate runtime evidence.

The in-app evaluator executes a smaller set of deterministic isolated policy cases. The HTTP integration smoke confirmed all returned cases passed and that the case count was at least eight. The exact current count can be read from the evaluator response. It does not measure model answer quality, production authentication, arbitrary prompt-injection resistance, or public-service availability.

## Interpretation

These tests use fictional data and intentionally simulated roles. Passing specific fixture cases does not establish universal security. The source filter and revision checks enforce the demonstrated access boundary, while the known-value and instruction-pattern checks have a deliberately limited scope. Citation membership checks do not prove every generated claim is supported by the source. Manual review of actual model answers remains a separate validation step.

The public app is an interactive synthetic Evidence demo; real Qwen3 inference is available through the local setup. Neither version provides a real identity provider, a Collibra connection, or production data. The public service does not generate AI answers. Claims in a portfolio or LinkedIn entry should match the completed rows above.
