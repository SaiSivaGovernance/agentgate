# Public AgentGate demo on Cloudflare

This adapter publishes the existing interface and governance engine as a **synthetic, evidence-only demo**. Visitors can ask supported questions, switch simulated roles, revoke sources, inspect masking and authorization decisions, run eight deterministic policy checks, and download metadata receipts. No login or API key is required to try it.

The public service does not call an AI model or connect to the author's computer. `mode: "ai"` is rejected by the server. Run the main project's local setup with Ollama to use generated AI answers. This demo is not a real identity provider, enterprise authorization system, or Collibra integration.

## Run or deploy

Use Node.js 24 or newer and an authenticated Cloudflare account. From the project root:

```sh
node --test tests/*.test.mjs
npx wrangler@4.147.0 dev --config cloudflare/wrangler.jsonc --port 8793
```

For deployment:

```sh
npx wrangler@4.147.0 login
npx wrangler@4.147.0 deploy --config cloudflare/wrangler.jsonc
```

The Worker is named `agentgate`; Wrangler returns the account-specific public URL. Static files come only from `public/`. No `.env`, local model, source directory, or credentials are static assets. The configuration creates a SQLite-backed Durable Object namespace with one object per visitor session. No account ID or secret is committed.

SQLite Durable Objects are supported on Workers Free. This app uses no paid AI API and does not require a paid-plan upgrade. Platform request, CPU, and storage quotas still apply; availability is not guaranteed once a free quota is exhausted. Deployment under an already-paid account follows that account's billing rules.

## Session and request boundaries

- An opaque `__Host-agentgate_demo` cookie uses `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/`.
- Roles, revocations, answers, caches, and receipts are isolated per Durable Object. State is restored on every request, including `Set` and `Map` values. Serialized updates prevent lost concurrent changes.
- A session has a fixed **30-minute lifetime from creation**, rather than a sliding inactivity timeout. An alarm deletes expired data; the next access also checks expiry before reading any old state. Alarm scheduling is best effort, so physical deletion may occur later than expiry. Reset clears the conversation, decisions, and access changes immediately.
- Questions and synthetic answers are temporarily stored to support conversation continuity. Use only fictional questions; this portfolio demo is not a place to enter personal or company data. The UI marks the synthetic scope.
- POST requests require the same Origin as the Worker and JSON content. Cross-site browser API requests, extra request fields, invalid methods, and unknown routes are rejected. These checks supplement the cookie policy; they do not authenticate a person.
- Request bodies are limited to 4 KiB and questions to 800 characters. Each session allows 90 API requests, 20 questions, and three policy-test runs per minute. Reset preserves rate counters. Creating a fresh session can bypass per-session limits, so these are demo safeguards rather than comprehensive abuse prevention.
- Stored history is capped at 30 receipts, eight turns, eight cached answers, and an 80 KiB serialized state budget. Older entries are removed as needed. Metadata receipt exports contain no question or answer text, although the temporary conversation state does.
- Assets and API responses use restrictive security headers and `no-store`. Application observability is disabled; this is not a promise about Cloudflare's platform logging or retention.

## Verification

`tests/cloudflare.test.mjs` verifies durable state reconstruction with isolated storage doubles, evidence-only enforcement, policy denial and masking, cookie flags and origin checks, request limits, metadata export isolation, expiry, reset, and state bounds. These tests do not replace an actual Workers runtime test. After starting Wrangler or deploying, run the project's public smoke script against the resulting URL if present:

```sh
node scripts/public-smoke.mjs http://127.0.0.1:8793
```

The engine's eight policy checks use isolated synthetic sessions and do not invoke an AI model. Passing them is not a universal security or data-leak guarantee.
