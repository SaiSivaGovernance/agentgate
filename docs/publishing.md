# Public showcase and LinkedIn

Recruiters can open the [AgentGate public demo](https://agentgate.trustcost-cloudflare-tooling.workers.dev/) without signing in, try its governance controls, and follow **View on GitHub** to the complete source, architecture, setup instructions, and verification evidence.

## Current publication status

| Item | Status |
|---|---|
| Public interactive app | [Live on Cloudflare](https://agentgate.trustcost-cloudflare-tooling.workers.dev/); synthetic Evidence mode, no public AI generation |
| Public source repository | [SaiSivaGovernance/agentgate](https://github.com/SaiSivaGovernance/agentgate); Cloudflare release pushed at commit [`0273f50`](https://github.com/SaiSivaGovernance/agentgate/commit/0273f50) |
| Public verification | 15/15 HTTP smoke checks against local Workers and the deployed service; browser masking, denial, revocation, evidence, and 8/8 policy checks verified |
| Automated regression tests | 34/34 passed: 19 core, 6 local HTTP, and 9 Cloudflare adapter tests |
| Local Ollama inference | Real Qwen3 answers verified; 8/8 local-model integration checks recorded October 5, 2026 |
| AgentGate LinkedIn project | Saved and verified in [Projects](https://www.linkedin.com/in/sai-siva-m-942179419/details/projects/), project ID `235092861`; includes live-demo and GitHub URLs plus an attached GitHub media card |
| AgentGate LinkedIn Featured item | Pending; not saved |
| Walkthrough recording | Not created |
| Collibra environment connection | Not connected |

The existing TrustCost AI deployment is a separate project. Use the AgentGate URL above for this showcase.

## Visitor walkthrough

1. Select **Load first scenario**, then **Ask question** as Support analyst. Inspect the permitted account and adjustment evidence with masked fields.
2. Switch to Marketing analyst and repeat **Customer account**. The same request is blocked by its source policy.
3. Select **Inspect evidence** to review the decision receipt. For revocation, ask **Product knowledge**, revoke **Atlas Flex · product guide**, and ask again. The previous conversation clears and the revoked source cannot support the answer.

The app provides a visible GitHub link, author attribution, a short guide, and social-preview metadata. Its source repository also contains the verified local-model setup and architecture. A walkthrough video remains optional follow-up work.

## Public demo and local AI

The public Cloudflare Worker executes the policy engine and returns permitted synthetic excerpts; it does **not** call an AI model or expose the author's computer. Requests for public AI generation are explicitly rejected. The local Node application can use Ollama with `qwen3:1.7b` for generated answers under the same governance checks.

Each public visitor receives an isolated session with a fixed 30-minute lifetime. Questions and decisions are stored temporarily, so use fictional scenarios only. Expired session state cannot be read; cleanup alarms perform physical deletion on a best-effort schedule. Roles remain simulated, and there is no identity-provider or Collibra integration. See [Cloudflare deployment details](../cloudflare/README.md).

## Saved LinkedIn project

The project was saved on October 5, 2026 as **AgentGate — Governed Data Access for AI**, dated **October 2026–October 2026**, with **Data Governance**, **Data Privacy**, and **Metadata Management** skills. Both the live demo and source repository are included in the description, with GitHub also attached as a media card. The saved project was verified in the profile’s Projects list.

A separate Featured item has not been saved. The Projects entry is complete independently of Featured.

## Project links and description

**Title:** AgentGate — Governed Data Access for AI

**Project URL:** https://agentgate.trustcost-cloudflare-tooling.workers.dev/

**Description:** Built a governed data-access lab that demonstrates role-based source filtering, field masking, source revocation, and inspectable JSON decision receipts. Try the public Evidence demo without signing in: ask as Support, switch to Marketing, or revoke a source to see policy change the result. The hosted demo returns permitted synthetic excerpts; the complete GitHub project also supports local AI generation with Ollama and Qwen3. Uses fictional data and simulated roles; no Collibra connection.

**Source code, architecture, setup, and tests:** https://github.com/SaiSivaGovernance/agentgate

The saved Projects entry includes both links above. A future Featured item can use the same live demo URL. Public Evidence mode and local AI remain distinct in the portfolio description.
