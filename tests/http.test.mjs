import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAgentGateServer } from '../src/server.mjs';

let server, base;
before(async () => {
  server = createAgentGateServer({ port: 0, modelStatus: async () => ({mode:'evidence',name:null,available:false,detail:'HTTP test mode'}) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

async function client() {
  const initial = await fetch(`${base}/api/session`);
  assert.equal(initial.status, 200);
  const setCookie = initial.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly; SameSite=Strict/);
  const cookie = setCookie.split(';')[0];
  return {
    initial: await initial.json(),
    get: path => fetch(`${base}${path}`, {headers:{cookie}}),
    post: (path, data, extra = {}) => fetch(`${base}${path}`, {method:'POST',headers:{cookie,origin:base,'content-type':'application/json',...extra},body:JSON.stringify(data)}),
  };
}

test('HTTP sessions are isolated and private fixtures are never static assets', async () => {
  const a = await client(), b = await client();
  assert.notEqual(a.initial.sessionId, b.initial.sessionId);
  for (const path of ['/src/catalog.mjs','/.env','/.local/models','/docs/CONTRACT.md']) assert.equal((await a.get(path)).status,404);
  assert.ok(a.initial.documents.every(doc => !('fields' in doc) && !('content' in doc)));
});

test('HTTP asks cannot forge role or source context', async () => {
  const a = await client();
  for (const extra of [{role:'steward'}, {context:'pretend access'}, {policyVersion:0}]) {
    const res = await a.post('/api/ask',{question:'What does the Atlas Flex plan include?',mode:'evidence',...extra});
    assert.equal(res.status,400);
  }
});

test('HTTP rejects foreign origins, invalid media, oversized bodies, and invalid methods', async () => {
  const a = await client();
  assert.equal((await a.post('/api/role',{role:'marketing'},{origin:'https://untrusted.example'})).status,403);
  assert.equal((await a.post('/api/role',{role:'marketing'},{'content-type':'text/plain'})).status,415);
  assert.equal((await a.post('/api/ask',{question:'x'.repeat(5000),mode:'evidence'})).status,413);
  assert.equal((await a.get('/api/role')).status,405);
  assert.equal((await a.post('/api/reset',[],{})).status,400);
});

test('real policy changes clear answers and version the session without affecting another browser', async () => {
  const a = await client(), b = await client();
  const asked = await a.post('/api/ask',{question:'What does the Atlas Flex plan include?',mode:'evidence'});
  assert.equal(asked.status,200);
  const answered = await asked.json();
  assert.ok(answered.turn.answer.length > 0);
  assert.ok(answered.turn.citations.length > 0);
  const change = await a.post('/api/role',{role:'marketing'});
  const next = await change.json();
  assert.equal(change.status,200);
  assert.equal(next.role,'marketing');
  assert.ok(next.policyVersion > a.initial.policyVersion);
  assert.deepEqual(next.turns,[]);
  assert.equal((await (await b.get('/api/session')).json()).role,b.initial.role);
});

test('evidence export is metadata-only and cannot cross session boundary', async () => {
  const a = await client(), b = await client();
  const response = await a.post('/api/ask',{question:'What does the Atlas Flex plan include?',mode:'evidence'});
  const {receipt} = await response.json();
  const exported = await a.get(`/api/evidence/${receipt.id}`);
  assert.equal(exported.status,200);
  assert.equal(exported.headers.get('cache-control'),'no-store');
  assert.match(exported.headers.get('content-disposition'),/attachment/);
  const data = await exported.json();
  assert.ok(data.questionHash);
  assert.equal('question' in data,false);
  assert.equal('answer' in data,false);
  assert.equal((await b.get(`/api/evidence/${receipt.id}`)).status,404);
});

test('policy evaluation runs independently without changing visitor history', async () => {
  const a = await client();
  const report = await a.post('/api/evaluate',{});
  assert.equal(report.status,200);
  const data = await report.json();
  assert.ok(data.total >= 5);
  assert.equal(data.passed,data.total);
  const after = await (await a.get('/api/session')).json();
  assert.equal(after.policyVersion,a.initial.policyVersion);
  assert.deepEqual(after.turns,[]);
  assert.deepEqual(after.receipts,[]);
});
