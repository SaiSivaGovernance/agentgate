import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const base = new URL(process.argv[2] || 'http://127.0.0.1:8793').origin;
const checks = [];
async function check(name, fn) {
  await fn();
  checks.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
function client() {
  let cookie = '';
  return async (path, data, headers = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { ...(cookie ? { cookie } : {}), ...(data === undefined ? {} : { origin: base, 'content-type': 'application/json' }), ...headers },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(20000),
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
}
async function json(response, status = 200) {
  assert.equal(response.status, status);
  return response.json();
}
const a = client(), b = client();
let first, second, masked, receipt;
await check('Public HTML and recruiter links are available without login', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /AgentGate/);
  assert.match(html, /https:\/\/github.com\/SaiSivaGovernance\/agentgate/);
  assert.match(html, /og:image/);
});
await check('Public service explicitly uses evidence mode without an AI model', async () => {
  const health = await json(await a('/api/health'));
  assert.equal(health.ok, true);
  assert.equal(health.model.available, false);
  assert.equal(health.model.mode, 'evidence');
});
await check('Session cookie and visitor isolation', async () => {
  const response = await a('/api/session');
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  if (base.startsWith('https:')) assert.match(cookie, /Secure/i);
  first = await json(response);
  second = await json(await b('/api/session'));
  assert.notEqual(first.sessionId, second.sessionId);
  assert.equal((await json(await a('/api/session'))).sessionId, first.sessionId);
});
await check('Support gets masked account evidence and permitted citations', async () => {
  masked = await json(await a('/api/ask', { question: 'Summarize Avery Reed’s account and recent adjustment.', mode: 'evidence' }));
  assert.equal(masked.turn.verdict, 'Masked');
  assert.ok(masked.turn.citations.length >= 2);
  assert.match(masked.turn.answer, /\[MASKED\]/);
  assert.doesNotMatch(masked.turn.answer, /synthetic\.example/);
  receipt = masked.receipt;
});
await check('Receipt export contains metadata, and another visitor cannot read it', async () => {
  const response = await a(`/api/evidence/${receipt.id}`);
  assert.match(response.headers.get('content-disposition'), /attachment/);
  const exported = await json(response);
  assert.ok(exported.questionHash);
  assert.equal('question' in exported, false);
  assert.equal('answer' in exported, false);
  assert.equal((await b(`/api/evidence/${receipt.id}`)).status, 404);
});
await check('Role changes clear context and persist on the next request', async () => {
  const changed = await json(await a('/api/role', { role: 'marketing' }));
  assert.deepEqual(changed.turns, []);
  assert.ok(changed.policyVersion > first.policyVersion);
  assert.equal((await json(await a('/api/session'))).role, 'marketing');
  assert.equal((await json(await b('/api/session'))).role, 'support');
});
await check('Marketing cannot retrieve customer information', async () => {
  const result = await json(await a('/api/ask', { question: 'Summarize Avery Reed’s account and recent adjustment.', mode: 'evidence' }));
  assert.equal(result.turn.verdict, 'Blocked');
  assert.deepEqual(result.turn.citations, []);
});
await check('Marketing can still use campaign aggregates', async () => {
  const result = await json(await a('/api/ask', { question: 'What are the marketing campaign results?', mode: 'evidence' }));
  assert.equal(result.turn.verdict, 'Allowed');
  assert.match(result.turn.answer, /48/);
});
await check('Revocation invalidates a warm cache and blocks the source', async () => {
  const question = { question: 'What does the Atlas Flex plan include?', mode: 'evidence' };
  await json(await a('/api/ask', question));
  const cached = await json(await a('/api/ask', question));
  assert.equal(cached.receipt.cache.hit, true);
  const changed = await json(await a('/api/access', { documentId: 'atlas-plan', revoked: true }));
  assert.deepEqual(changed.turns, []);
  const blocked = await json(await a('/api/ask', question));
  assert.equal(blocked.turn.verdict, 'Blocked');
  assert.equal(blocked.receipt.cache.hit, false);
});
await check('Policy evaluation passes without altering visitor decisions', async () => {
  const before = await json(await a('/api/session'));
  const result = await json(await a('/api/evaluate', {}));
  assert.ok(result.total >= 8);
  assert.equal(result.passed, result.total);
  const after = await json(await a('/api/session'));
  assert.deepEqual(after.stats, before.stats);
  assert.deepEqual(after.turns, before.turns);
});
await check('Public AI generation is explicitly disabled', async () => {
  const response = await a('/api/ask', { question: 'What are the marketing campaign results?', mode: 'ai' });
  assert.ok(response.status >= 400 && response.status < 500);
  const result = await response.json();
  assert.match(result.error, /evidence|public|AI/i);
});
await check('Foreign-origin requests and forged policy fields are rejected', async () => {
  assert.equal((await a('/api/reset', {}, { origin: 'https://foreign.example' })).status, 403);
  assert.equal((await a('/api/ask', { question: 'Atlas Flex plan', mode: 'evidence', role: 'steward' })).status, 400);
});
await check('Invalid content types, excessive bodies and methods are rejected', async () => {
  assert.equal((await a('/api/role', { role: 'support' }, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await a('/api/ask', { question: 'x'.repeat(5000), mode: 'evidence' })).status, 413);
  assert.equal((await a('/api/role')).status, 405);
});
await check('Private files are absent from public static assets', async () => {
  for (const path of ['/src/catalog.mjs', '/.env', '/.local/models', '/cloudflare/worker.mjs']) {
    assert.equal((await a(path)).status, 404);
  }
});
await check('Reset clears only the current visitor session', async () => {
  const reset = await json(await a('/api/reset', {}));
  assert.equal(reset.role, 'support');
  assert.deepEqual(reset.receipts, []);
  assert.deepEqual(reset.turns, []);
  assert.equal((await json(await b('/api/session'))).sessionId, second.sessionId);
});
const report = { project: 'AgentGate', base, checkedAt: new Date().toISOString(), passed: checks.length, total: checks.length, inference: 'evidence-only; no public model inference', checks };
if (process.argv[3]) await writeFile(process.argv[3], `${JSON.stringify(report, null, 2)}\n`);
console.log(`${checks.length}/${checks.length} public HTTP checks passed.`);
