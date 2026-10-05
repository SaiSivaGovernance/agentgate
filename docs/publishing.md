# Public showcase and LinkedIn

The intended visitor journey is **LinkedIn Featured → one public AgentGate project page → interactive demo, source code, architecture, verification evidence and a short walkthrough**. This gives a recruiter a fast demonstration and a route into the whole project without requiring them to install tools first.

## Current publication status

| Item | Status |
|---|---|
| Local application | Working; 25/25 automated tests and 8/8 local integration checks passed |
| Local Ollama inference | Real Qwen3 answers verified through the application and browser |
| Public AgentGate page or app URL | Not created |
| Public source repository | Published: [SaiSivaGovernance/agentgate](https://github.com/SaiSivaGovernance/agentgate), including application source, tests, documentation and preview |
| Walkthrough recording | Not created |
| AgentGate LinkedIn Featured item | Not added |
| Collibra environment connection | Not available |

The existing TrustCost AI deployment is a different project. Its public URL should not be used as an AgentGate demo link.

## What belongs on the public page

1. A clear introduction: “Explore how role and source-access policies shape an AI assistant's answers.”
2. A visible **Try the demo** link and a concise three-step scenario: permitted account answer, role-based denial, revoked-source denial.
3. An actual screenshot or short recording of the verified local AI flow, with its recording date and model named.
4. A **View source** link to the complete reproducible source repository, including synthetic fixtures and startup instructions.
5. Architecture, API details and a dated verification record that distinguishes deterministic checks, HTTP tests and real model tests.
6. Scope in plain language: synthetic data, simulated roles, no Collibra connection, and the public demo's actual inference mode.

Do not publish nonfunctional buttons, invented repository links, or an “AI powered” badge on a deterministic-only hosted demonstration.

## Local AI and public hosting

The current model runs on the user's Mac. A visitor opening a Cloudflare page cannot reach that Mac's `127.0.0.1` endpoint; `localhost` refers to each visitor's own computer. The current Node server also deliberately binds to loopback and accepts only local app origins. It needs a deployment-specific implementation before being reachable publicly.

Two publication approaches are possible:

| Approach | What visitors can use | What remains to decide |
|---|---|---|
| Public project page and hosted evidence-mode lab | Interactive governance rules, sources, masking, revocation and receipts; a recorded real local-AI walkthrough | Hosting adaptation and clear evidence-mode labels; no real public inference claim |
| Public project page and live AI service | The same governed interaction with fresh model-generated answers | A reachable inference host/provider, credentials if applicable, operating cost, availability and request limits |

A static GitHub Pages site can host the project explanation, documentation and recording links, but the current Node session and policy API needs a backend. Cloudflare can serve a project page; deploying the interactive backend still requires porting the session/runtime design or connecting to an appropriate service. Merely uploading `public/` does not create a functioning AI application.

Exposing a developer's computer continuously would tie uptime to that computer, its network and running processes. That has not been configured. There is no tunnel, cloud API or public inference endpoint in this build. The local model has no per-request API bill; always-available public AI is a separate hosting decision.

## Publish only verified artifacts

The source distribution should include the application source, fictional fixture catalog, automated tests, docs and model provenance. Exclude `.local/`, `.env`, local logs and installed model weights. The repository intentionally contains synthetic fixture values so others can reproduce the checks; the demonstration should not imply that those fictional values are secret from someone reading its code.

Before saving the LinkedIn link, verify that a signed-out visitor can open the page over HTTPS and follow every displayed source/demo/documentation link. Run the advertised public scenario against the deployed service. Record its actual inference mode and limitations in the verification document.

## Suggested Featured copy after publication

**Title:** AgentGate — Governed Data Access for AI

**Description:** Explore how server-side access rules, field masking and source revocation change an assistant's answers. Inspect permitted citations and downloadable policy evidence, then review the architecture and reproducible tests. Built with synthetic data and simulated roles; no Collibra tenant is connected.

Add a sentence describing the deployed inference mode only after it is selected and verified. A local recording should say “Recorded local Qwen3 demonstration,” while a genuinely live hosted model should identify its provider and model accurately. Do not substitute a placeholder URL in a real LinkedIn entry.
