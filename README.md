# AgentGate — Governed Data Access for AI

AgentGate is an interactive portfolio lab that shows how a server controls the information an AI assistant can use. Ask about a fictional customer, change the simulated role, or revoke a source. Inspect the resulting answer, masked fields, permitted citations, and metadata evidence.

**[Try the public demo — no sign-in](https://agentgate.trustcost-cloudflare-tooling.workers.dev/)** · **[View the complete source on GitHub](https://github.com/SaiSivaGovernance/agentgate)**

The public Cloudflare app returns permitted synthetic source excerpts in **Evidence** mode. It demonstrates working role policies, field masking, source revocation, and decision receipts without calling an AI model. For generated AI answers, run the same project locally with Ollama and Qwen3 using the instructions below.

The core example is a policy change: an answer allowed a moment ago must not survive a role change or source revocation through cached context. AgentGate checks the policy revision before and after asynchronous generation, clears cached answers and prior turns when permissions change, and withholds responses prepared under an earlier revision.

**Verified October 5, 2026:** **34/34 automated tests** passed (19 core, 6 local HTTP, and 9 Cloudflare adapter tests), plus **15/15 public smoke checks** against both the local Workers runtime and the deployed service. Browser checks verified masked support evidence with two citations, marketing denial, source revocation, receipts, and 8/8 isolated policy checks. Earlier **8/8 local-model integration checks** verified the local Qwen3 configuration. See the [verification record](docs/verification.md), [public smoke report](docs/public-smoke-report.json), and [local-model report](docs/live-model-report.json).

![AgentGate local application preview](docs/agentgate-preview.jpg)

## Try the public demo

Open [AgentGate](https://agentgate.trustcost-cloudflare-tooling.workers.dev/) and follow **Try it in 60 seconds**. Load the customer scenario, ask as Support analyst, then switch to Marketing analyst and repeat it. Inspect the decision receipt or revoke a source to see the access boundary change.

Each visitor gets an isolated, simulated session with a fixed **30-minute lifetime**. Questions and decisions are temporarily stored; use only fictional scenarios. Expired sessions cannot return their old state; physical deletion by the cleanup alarm may happen later. No sign-in, API key, or model installation is needed for the public Evidence demo. There is no Collibra connection. [Public deployment and session details](cloudflare/README.md).

## Try it locally

Requirements: Node.js 24 or newer. Clone or download this source, then open a terminal in the project directory containing `package.json`. The app uses Node's built-in modules and has no npm runtime dependencies; no `npm install` step is required.

```sh
git clone https://github.com/SaiSivaGovernance/agentgate.git
cd agentgate
npm start
```

Open **http://127.0.0.1:8790**. Without model configuration, the explicit **Evidence** mode returns permitted source excerpts without AI.

For real local AI, [install Ollama from its official download page](https://ollama.com/download) and make sure the `ollama` command is available. No model runtime or weights are included in this repository.

Start Ollama in a separate terminal. These commands use macOS/Linux shell syntax; [Windows equivalents](docs/local-model.md#windows-powershell) are also documented. If the Ollama desktop app or another Ollama service is already running, stop that instance before starting this foreground server with cloud features disabled:

```sh
OLLAMA_NO_CLOUD=1 OLLAMA_HOST=127.0.0.1:11434 ollama serve
```

Keep that terminal open. In a second terminal, download the model and start AgentGate from the project directory:

```sh
ollama pull qwen3:1.7b
OLLAMA_MODEL=qwen3:1.7b OLLAMA_URL=http://127.0.0.1:11434 npm start
```

If AgentGate was already running in Evidence mode, stop that app process before restarting it with the model settings. Select **AI** in the question composer after the model status reports it is reachable. The app never silently substitutes evidence text when an AI request fails.

The optional `bash scripts/model-start.sh` launcher is for an existing project-local runtime at `.local/ollama/ollama`; a fresh clone does not contain that executable. Invoking it with Bash works even when the source download does not preserve the script's executable bit. [Local model setup and provenance](docs/local-model.md) explains both installation options, the tested versions, and model hashes.

## A short demonstration

1. As **Support analyst**, ask: “Summarize Avery Reed’s account and recent adjustment.” Inspect the permitted account and adjustment sources with contact and payment identifiers masked.
2. Switch to **Marketing analyst** and repeat the question. The customer sources are blocked. A campaign-results question remains answerable.
3. Ask what the Atlas Flex plan includes. Revoke its source and ask again. The prior conversation and cached answer are cleared, and the source can no longer support the answer.
4. Open **Evidence** and download the decision receipt. Run the isolated deterministic checks under **Policy tests**.

[Full demonstration script](docs/demo-script.md)

## What the project demonstrates

- Server-owned, session-specific role and source-access policies.
- Source filtering and field masking before the model receives context.
- A policy revision check after generation to handle changes while a request is in flight.
- Bounded caches and history, cleared when the applicable policy changes.
- Citation-ID validation and a bounded check for known synthetic restricted values.
- Live local Ollama inference, with a separately labeled evidence-only mode.
- Session-isolated JSON decision receipts containing metadata rather than source bodies or answers.

All customers, records, and roles are fictional. The role selector is a simulation, not identity authentication. Retrieval uses explicit lexical topics, not embeddings. Citation validation checks source eligibility, not whether every generated statement is factually supported. Known-value and instruction-pattern checks cover specific cases, not all possible disclosures. No Collibra tenant or connector is connected.

## Source map

| File | Responsibility |
|---|---|
| `src/server.mjs` | Local HTTP server, static allowlist, session cookies, request limits and API routes |
| `cloudflare/worker.mjs`, `cloudflare/wrangler.jsonc` | Public Evidence demo, isolated Durable Object sessions, expiry and deployment configuration |
| `src/catalog.mjs` | Server-only synthetic source fixtures and role definitions |
| `src/policy.mjs` | Authorization, masking, lexical retrieval and bounded output checks |
| `src/engine.mjs` | Answer orchestration, revision checks, cache invalidation, receipts and evaluation |
| `src/model.mjs` | Loopback-only Ollama adapter and structured answer request |
| `public/index.html`, `public/app.js`, `public/styles.css` | Browser interface and interaction states |
| `tests/core.test.mjs`, `tests/http.test.mjs`, `tests/cloudflare.test.mjs` | Deterministic engine, local HTTP, and Cloudflare adapter regression tests |
| `scripts/smoke.mjs` | Real local-model HTTP integration checks and JSON report generation |
| `scripts/public-smoke.mjs` | Evidence-mode HTTP checks against the local Worker or public deployment |
| `scripts/model-start.sh` | Local model startup with cloud features disabled |

Run the automated checks with `npm test`. Model-adapter test doubles are identified in the tests; passing unit tests is distinct from validating actual Qwen3 responses.

With both local services running and AgentGate configured for Qwen3, run `node scripts/smoke.mjs` for the integration checks. The script writes `docs/live-model-report.json`; supported questions call the real local model, while policy denials and the isolated policy evaluator do not invoke AI.

The deployed Evidence demo can be checked with `node scripts/public-smoke.mjs https://agentgate.trustcost-cloudflare-tooling.workers.dev`. Its checks are separate from local-model generation checks. See the [Cloudflare guide](cloudflare/README.md) to run or deploy your own copy.

## Read more

- [Architecture and trust boundaries](docs/architecture.md)
- [API and implementation contract](docs/CONTRACT.md)
- [Verification record](docs/verification.md)
- [Public showcase and LinkedIn links](docs/publishing.md)

A later Collibra extension could import classifications and ownership into an explicitly mapped policy model. Such an extension needs tenant access and live validation; it is not part of this version.
