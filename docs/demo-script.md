# Demo script

This script uses fictional records. It is written for a local screen-share or a future recording; no recording or public project page has been published yet. Leave the model status visible so viewers can distinguish real Qwen3 answers from evidence excerpts.

## Prepare

Start Ollama and AgentGate using the [README](../README.md), open `http://127.0.0.1:8790`, and reset the session. Wait for the configured local model to be reachable. Choose **AI** before the first model example. If it is unavailable, describe that state and use **Evidence** explicitly; do not present evidence output as AI generation.

## 1. A useful answer with a visible boundary

Select **Support analyst** and ask:

> Summarize Avery Reed’s account and recent adjustment.

Explain: “The server permits this fictional support role to use account and adjustment records, but removes contact and payment identifiers before the model receives them.”

Inspect the answer and citation excerpts. The expected policy verdict is **Masked**. The fixture includes an active Atlas Flex membership, an $84.50 balance, and a completed $14.50 service credit. Generated wording may vary; verify the actual answer instead of promising a fixed sentence.

## 2. Change the role, change the answer

Switch to **Marketing analyst**. Point out that the previous conversation disappears and the policy revision advances. Ask the identical account question again.

Expected result: **Blocked**, with no customer source excerpts. Then ask:

> What are the marketing campaign results?

Expected result: permitted aggregate campaign data. Explain: “The policy should block unauthorized records while preserving useful authorized questions.”

## 3. Revoke a source that was just used

Ask:

> What does the Atlas Flex plan include?

Ask the exact question again, then inspect its evidence receipt for the cache hit. Revoke **Atlas Flex · product guide** in the source panel. Observe the cleared turns and higher revision; ask the plan question again.

Expected result: **Blocked**. The previous cached answer cannot bypass the revoked source. Restore the source and ask once more to obtain a fresh answer under the latest policy. Clarify that revocation affects subsequent requests and cannot erase something already seen or downloaded.

## 4. Stewardship is not unrestricted access

Select **Data steward** and ask:

> Explain the governance policy and ownership.

Inspect the permitted governance metadata. Then ask for Avery Reed's account again: the steward role is also denied that business record. This demonstrates separation between catalog stewardship and business-data permission.

## 5. Show the proof and its scope

Open **Evidence**, inspect a successful or masked receipt and a blocked receipt, then export one JSON receipt. Explain the revision, source IDs, decision checks, cache event and question hash. The receipt does not include raw question text, answer text, or source bodies.

Open **Policy tests** and run the checks. These cases execute actual deterministic policy functions over isolated fixtures without invoking the AI model or changing the visitor's session. State the observed count, not an anticipated result.

For an engineering interview, open `tests/core.test.mjs` and discuss the deferred-model tests: they change policy while generation is pending and confirm that the earlier response is discarded. A normal fast response in the UI is not, by itself, evidence of that race-case behavior.

## Suggested closing explanation

“AgentGate combines local AI generation with server-enforced source access, pre-generation field masking, policy-version checks, cache invalidation and downloadable decision metadata. This is a reproducible synthetic lab, with a role simulator and explicit limitations. A future Collibra connection could supply classifications and ownership; no tenant is connected today.”

Keep a short recording focused on support access, marketing denial and source revocation. Link the complete architecture and test record from the eventual public project page for viewers who want implementation detail.
