# AgentGate implementation contract

Independent portfolio lab; all customers, documents, values and roles are synthetic. Role switching is an intentional simulation, not production identity authentication. No Collibra tenant is connected. Node 24, ESM, native HTTP server at http://127.0.0.1:8790, no frontend framework/dependencies. Server-only fixtures must never be served as public files.

## API

Every API response is JSON, no-store. Each browser gets its own HttpOnly SameSite=Strict session cookie. Writes require application/json and same-origin requests. Reject unknown request fields and oversized payloads. Never accept role/policy/context from the question request. Session state and revocations are server-owned. Lab role switching is allowed only via its explicit endpoint. No arbitrary URL, SQL, file or tool execution.

- GET /api/session -> {sessionId, role, policyVersion, model:{mode,name,available,detail}, roles:[{id,label,description}], documents:[{id,title,classification,owner,revoked,access,reason}], receipts:[receipt], turns:[turn], stats:{queries,allowed,blocked,masked}, simulation:true}
- POST /api/role {role} -> session snapshot. IDs support, marketing, steward. Clears all prior turns and content caches, increments policyVersion on change. Receipts retain only metadata (no question, response or retrieved source body).
- POST /api/access {documentId,revoked:boolean} -> session snapshot. Revocation is per-session, applies to all its roles; clears turns/cache, increments policyVersion on change.
- POST /api/reset {} -> resets this session; returns snapshot.
- POST /api/ask {question:string,mode:'evidence'|'ai'} -> {turn,receipt,session}. question 1..800 chars. Current server policy is checked before retrieval/model call and again before return (handle revocation during model request). Only authorized/masked current sources enter model prompt; previous conversation turns are never forwarded. Unsupported requests return a clear blocked/no-source result, not invented answers.
- GET /api/evidence/:id -> metadata-only receipt from current session or 404. No cross-session access.
- GET /api/health -> {ok:true,mode:'synthetic-governance-lab',model:...}
- POST /api/evaluate {} -> {passed,total,cases:[{name,passed,detail}],scope:string}. Executes real isolated checks using core policy functions, cannot change visitor state. No AI/API calls or made-up test results.

turn = {id,question,answer,verdict:'Allowed'|'Masked'|'Blocked',mode:'evidence'|'ai',modelName,createdAt,citations:[{id,title,excerpt}],receiptId}. Citations only from allowed, field-masked sources; must match response source IDs. Evidence mode must be visibly called 'Evidence answer · no AI model'. Configured AI failure returns an explicit error; never falsely describe a fallback as AI.

receipt = {id,createdAt,role,policyVersion,verdict,mode,modelName,questionHash,allowedSources:[id],deniedSources:[id],maskedFields:[string],checks:[{name,passed,detail}],cache:{hit,cleared,reason},latencyMs}. No raw question, answer or source content stored here. No fabricated performance/security claims. History in memory is bounded and clears on server restart; metadata receipts are session isolated. Evaluate rejection/masking using exact test cases, not a universal security guarantee.

## Experience

Single app with three views: Playground, Evidence, Policy tests. Clean editorial security-console visual: warm ivory background, ink typography, restrained violet/teal accents, refined cards, a source-to-policy-to-answer flow. Main Playground uses role picker, guided scenario chips, composer, rich answer/citations, source decision panel with per-document revoke/restore controls. Evidence downloadable JSON. Live model status always explicit. Responsive 390px and desktop. Clear busy/errors, keyboard accessibility, semantic form labels, no innerHTML for untrusted content. Refresh keeps browser's server session. Role/policy changes clear visible turns.

Suggested questions: 'Summarize Avery Reed’s account and recent adjustment.', 'What are the marketing campaign results?', 'What does the Atlas Flex plan include?', 'Show the private settlement token.' Fixture builder must support these nouns/topics. Marketing may see aggregate campaign data, support may see selected account data with contact details masked, steward sees metadata and public policy (not automatic unrestricted business-data access). Role denial and document revocation are independent.

## AI adapter

Optional local Ollama via explicitly configured loopback URL and model; no cloud fallback, key in browser, or dependency on a paid provider. Model state reports configured/reachable status. The local build was verified with Ollama 0.35.1 and qwen3:1.7b. Runtime and model weights are not included in the source distribution; fresh installations follow docs/local-model.md. The adapter remains replaceable for a later deployment, which has not been provisioned.
