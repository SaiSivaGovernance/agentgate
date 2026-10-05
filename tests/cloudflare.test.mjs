import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import worker, { DemoSession, TTL, COOKIE, serializeSession, restoreSession } from '../cloudflare/worker.mjs';
import { createSession, ask, changeAccess } from '../src/engine.mjs';

const base = 'https://agentgate.example';
function environment() {
  const stores = new Map();
  const context = id => {
    if (!stores.has(id)) stores.set(id, { values: new Map(), alarm: null });
    const store = stores.get(id);
    return {
      blockConcurrencyWhile: callback => callback(),
      storage: {
        get: async key => structuredClone(store.values.get(key)),
        put: async (key, value) => { store.values.set(key, structuredClone(value)); },
        deleteAll: async () => { store.values.clear(); },
        setAlarm: async timestamp => { store.alarm = timestamp; },
      },
    };
  };
  return { stores, context, ASSETS: { fetch: async () => new Response('static fixture', { headers: { 'Content-Type': 'text/html' } }) },
    DEMO_SESSIONS: {
      newUniqueId: () => randomBytes(32).toString('hex'),
      idFromString: token => { if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid ID'); return token; },
      // Reconstruct on each request to exercise durable hydration, not memory survival.
      get: id => ({ fetch: request => new DemoSession(context(String(id))).fetch(request) }),
    },
  };
}
async function client(env) {
  const initial = await worker.fetch(new Request(`${base}/api/session`), env);
  assert.equal(initial.status, 200);
  const cookieHeader = initial.headers.get('Set-Cookie');
  assert.match(cookieHeader, /HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=1800/);
  const cookie = cookieHeader.split(';')[0];
  const token = cookie.slice(COOKIE.length + 1);
  return { cookie, token, initial: await initial.json(),
    get: path => worker.fetch(new Request(`${base}${path}`, { headers: { cookie } }), env),
    post: (path, value, extra = {}) => worker.fetch(new Request(`${base}${path}`, { method: 'POST', headers: { cookie, Origin: base, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(value) }), env),
  };
}
const plan = { question: 'What does the Atlas Flex plan include?', mode: 'evidence' };

test('Cloudflare snapshots identify evidence-only deployment and durable isolated sessions', async () => {
  const env = environment(); const a = await client(env); const b = await client(env);
  assert.notEqual(a.initial.sessionId, b.initial.sessionId);
  assert.equal(a.initial.model.available, false);
  assert.equal(a.initial.model.mode, 'evidence');
  assert.equal(a.initial.deployment.kind, 'public-demo');
  assert.ok(Date.parse(a.initial.deployment.expiresAt) > Date.now());
  assert.equal((await (await a.post('/api/role', { role: 'marketing' })).json()).role, 'marketing');
  assert.equal((await (await a.get('/api/session')).json()).role, 'marketing');
  assert.equal((await (await b.get('/api/session')).json()).role, 'support');
});

test('Set and Map survive serialization; revoked and cached state survive object eviction', async () => {
  const original = createSession();
  await ask(original, plan);
  changeAccess(original, 'avery-account', true);
  await ask(original, plan);
  const restored = restoreSession(JSON.parse(JSON.stringify(serializeSession(original))));
  assert.ok(restored.revoked instanceof Set);
  assert.ok(restored.cache instanceof Map);
  assert.deepEqual([...restored.revoked], [...original.revoked]);
  assert.deepEqual([...restored.cache], [...original.cache]);
  const env = environment(); const a = await client(env);
  await a.post('/api/ask', plan);
  assert.equal((await (await a.post('/api/ask', plan)).json()).receipt.cache.hit, true);
  await a.post('/api/access', { documentId: 'atlas-plan', revoked: true });
  const latest = await (await a.get('/api/session')).json();
  assert.equal(latest.documents.find(doc => doc.id === 'atlas-plan').revoked, true);
  assert.deepEqual(latest.turns, []);
  const denied = await (await a.post('/api/ask', plan)).json();
  assert.equal(denied.turn.verdict, 'Blocked');
  assert.deepEqual(denied.turn.citations, []);
});

test('public asks enforce evidence-only mode and deny unauthorized sources', async () => {
  const a = await client(environment());
  const ai = await a.post('/api/ask', { ...plan, mode: 'ai' });
  assert.equal(ai.status, 403);
  assert.equal((await ai.json()).code, 'AI_DISABLED');
  assert.equal((await a.post('/api/ask', { ...plan, role: 'steward' })).status, 400);
  const masked = await (await a.post('/api/ask', { question: 'Summarize Avery Reed account and recent adjustment.', mode: 'evidence' })).json();
  assert.equal(masked.turn.verdict, 'Masked');
  assert.match(masked.turn.answer, /\[MASKED\]/);
  assert.ok(!masked.turn.answer.includes('synthetic.example'));
  await a.post('/api/role', { role: 'marketing' });
  const denied = await (await a.post('/api/ask', { question: 'Summarize Avery Reed account.', mode: 'evidence' })).json();
  assert.equal(denied.turn.verdict, 'Blocked');
  assert.deepEqual(denied.turn.citations, []);
});

test('CSRF, strict request fields, media, body size, method and asset boundaries', async () => {
  const env = environment(); const a = await client(env);
  assert.equal((await a.post('/api/reset', {}, { origin: 'https://foreign.example' })).status, 403);
  assert.equal((await a.post('/api/reset', {}, { origin: '' })).status, 403);
  assert.equal((await a.post('/api/reset', {}, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await a.post('/api/reset', {}, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await a.post('/api/reset', [])).status, 400);
  assert.equal((await a.post('/api/ask', { ...plan, question: 'a'.repeat(5000) })).status, 413);
  assert.equal((await a.post('/api/ask', { ...plan, question: 'a'.repeat(801) })).status, 400);
  assert.equal((await a.get('/api/role')).status, 405);
  assert.equal((await a.get('/api/session?role=steward')).status, 400);
  for (const path of ['/.env', '/src/catalog.mjs', '/cloudflare/worker.mjs', '/api/missing']) assert.equal((await a.get(path)).status, 404);
  const asset = await a.get('/share-preview.jpg');
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.ok(asset.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.equal((await a.get('/?utm_source=linkedin')).status, 200);
});

test('receipt exports are session-private metadata and reset clears them', async () => {
  const env = environment(); const a = await client(env); const b = await client(env);
  const result = await (await a.post('/api/ask', plan)).json();
  const path = `/api/evidence/${result.receipt.id}`;
  const exported = await a.get(path);
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get('content-disposition'), /attachment/);
  assert.equal(exported.headers.get('cache-control'), 'no-store');
  const data = await exported.json();
  assert.equal('question' in data, false); assert.equal('answer' in data, false);
  assert.equal((await b.get(path)).status, 404);
  const reset = await (await a.post('/api/reset', {})).json();
  assert.deepEqual(reset.receipts, []); assert.deepEqual(reset.turns, []);
  assert.equal((await a.get(path)).status, 404);
});

test('per-session limits survive reset and do not throttle independent visitors', async () => {
  const env = environment(); const a = await client(env); const b = await client(env);
  for (let i = 0; i < 20; i++) assert.equal((await a.post('/api/ask', plan)).status, 200);
  assert.equal((await a.post('/api/reset', {})).status, 200);
  const limited = await a.post('/api/ask', plan);
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('Retry-After'), '60');
  assert.equal((await b.post('/api/ask', plan)).status, 200);
  for (let i = 0; i < 3; i++) {
    const evaluated = await (await a.post('/api/evaluate', {})).json();
    assert.equal(evaluated.passed, evaluated.total);
  }
  assert.equal((await a.post('/api/evaluate', {})).status, 429);
});

test('expiry and alarm delete persisted state; a later request starts a fresh session', async () => {
  const env = environment(); const a = await client(env);
  assert.ok(env.stores.get(a.token).alarm <= Date.now() + TTL);
  await a.post('/api/role', { role: 'marketing' });
  const store = env.stores.get(a.token);
  store.values.get('session').expiresAt = Date.now() - 1;
  const fresh = await (await a.get('/api/session')).json();
  assert.notEqual(fresh.sessionId, a.initial.sessionId);
  assert.equal(fresh.role, 'support');
  store.values.get('session').expiresAt = Date.now() - 1;
  await new DemoSession(env.context(a.token)).alarm();
  assert.equal(store.values.size, 0);
});

test('the overall API request budget also bounds repeated reads', async () => {
  const a = await client(environment());
  for (let i = 0; i < 89; i++) assert.equal((await a.get('/api/session')).status, 200);
  const blocked = await a.get('/api/session');
  assert.equal(blocked.status, 429);
  assert.match((await blocked.json()).error, /90 requests/);
});

test('public state remains bounded even with many answers across rate windows', async () => {
  const env = environment(); const a = await client(env);
  for (let i = 0; i < 50; i++) {
    env.stores.get(a.token).values.get('session').rate = { all: [], ask: [], evaluate: [] };
    assert.equal((await a.post('/api/ask', { ...plan, question: `${plan.question} ${i}` })).status, 200);
  }
  const persisted = env.stores.get(a.token).values.get('session');
  assert.ok(persisted.state.receipts.length <= 30);
  assert.ok(persisted.state.turns.length <= 8);
  assert.ok(persisted.state.cache.length <= 8);
  assert.ok(Buffer.byteLength(JSON.stringify(persisted.state)) <= 80 * 1024);
});
