import { createSession, getSnapshot, switchRole, changeAccess, resetSession, ask, evaluate, getReceipt } from '../src/engine.mjs';

export const TTL = 30 * 60 * 1000;
export const COOKIE = '__Host-agentgate_demo';
const MAX_BODY = 4096;
const MAX_STATE = 80 * 1024;
const ASSETS = new Set(['/', '/index.html', '/app.js', '/styles.css', '/favicon.svg', '/share-preview.jpg']);
const ROUTES = new Map([
  ['/api/session', 'GET'], ['/api/health', 'GET'], ['/api/role', 'POST'],
  ['/api/access', 'POST'], ['/api/reset', 'POST'], ['/api/ask', 'POST'], ['/api/evaluate', 'POST'],
]);
export const modelStatus = () => ({ mode: 'evidence', name: 'Evidence answer · no AI model', available: false,
  detail: 'Public demo uses permitted synthetic source excerpts. AI generation is available only when you run the project locally with Ollama. Demo sessions expire after 30 minutes.' });
const disabledModel = { getStatus: async () => modelStatus(), generate: async () => { throw new Error('Public AI generation is disabled.'); } };
const headers = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
function fail(statusCode, message, code = 'invalid_request') { const error = new Error(message); error.statusCode = statusCode; error.code = code; throw error; }
function json(value, status = 200, extra = {}) { return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', ...extra } }); }
function errorResponse(error) {
  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  return json({ error: status >= 500 ? 'The demo could not complete this request. Please retry shortly.' : error.message, code: error.code || 'server_error' }, status, status === 429 ? { 'Retry-After': '60' } : {});
}
function envelope(snapshot, expiresAt) {
  return { ...snapshot, model: modelStatus(), deployment: { kind: 'public-demo', label: 'Public evidence demo', expiresAt: new Date(expiresAt).toISOString() } };
}
export function serializeSession(session) {
  return { ...session, revoked: [...session.revoked], cache: [...session.cache] };
}
export function restoreSession(stored) {
  return { ...stored, revoked: new Set(stored.revoked), cache: new Map(stored.cache), modelStatus: modelStatus() };
}
async function readBody(request, keys) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) fail(415, 'Send an application/json request.');
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY)) fail(413, 'This request is too large.');
  const reader = request.body?.getReader();
  const chunks = []; let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); fail(413, 'This request is too large.'); }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let data;
  try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail(400, 'The request must contain valid JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !keys.includes(key))) fail(400, 'Unexpected request fields.');
  return data;
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/')) {
        if (!ASSETS.has(url.pathname)) fail(404, 'Page not found.');
        if (!['GET', 'HEAD'].includes(request.method)) fail(405, 'Method not allowed.');
        const response = await env.ASSETS.fetch(request);
        const secured = new Response(response.body, response);
        for (const [key, value] of Object.entries(headers)) secured.headers.set(key, value);
        return secured;
      }
      if (url.search) fail(400, 'API query parameters are not supported.');
      const method = ROUTES.get(url.pathname) || (/^\/api\/evidence\/[a-zA-Z0-9-]{1,64}$/.test(url.pathname) ? 'GET' : null);
      if (!method) fail(404, 'Endpoint not found.');
      if (request.method !== method) fail(405, 'Method not allowed.');
      if (request.headers.get('sec-fetch-site') === 'cross-site') fail(403, 'Cross-site API requests are not allowed.');
      if (method === 'POST' && request.headers.get('origin') !== url.origin) fail(403, 'The request must originate from this AgentGate app.');
      if (url.pathname === '/api/health') return json({ ok: true, mode: 'public-evidence-demo', model: modelStatus() });
      const tokens = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${COOKIE}=`));
      let id; let fresh = false;
      if (tokens.length === 1) {
        const token = tokens[0].slice(COOKIE.length + 1);
        if (/^[a-f0-9]{64}$/.test(token)) {
          try { id = env.DEMO_SESSIONS.idFromString(token); } catch { /* Reject invalid namespace IDs by starting a fresh session. */ }
        }
      }
      if (!id) { id = env.DEMO_SESSIONS.newUniqueId(); fresh = true; }
      const response = await env.DEMO_SESSIONS.get(id).fetch(request);
      const result = new Response(response.body, response);
      if (fresh) result.headers.set('Set-Cookie', `${COOKIE}=${id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`);
      return result;
    } catch (error) { return errorResponse(error); }
  },
};

// One SQLite-backed Durable Object per browser session. Never use a singleton:
// roles, revocations, cached answers and receipts must not cross visitor boundaries.
export class DemoSession {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    // Serializes updates through hydration, policy execution and durable persistence.
    return this.ctx.blockConcurrencyWhile(async () => {
      let saved;
      try {
        const now = Date.now();
        saved = await this.ctx.storage.get('session');
        if (!saved || saved.version !== 1 || saved.expiresAt <= now) {
          await this.ctx.storage.deleteAll();
          saved = { version: 1, expiresAt: now + TTL, state: serializeSession(createSession()), rate: { all: [], ask: [], evaluate: [] } };
          await this.ctx.storage.setAlarm(saved.expiresAt);
        }
        const session = restoreSession(saved.state);
        const path = new URL(request.url).pathname;
        for (const key of ['all', 'ask', 'evaluate']) saved.rate[key] = saved.rate[key].filter(time => now - time < 60_000);
        if (saved.rate.all.length >= 90) fail(429, 'This demo allows 90 requests per minute per session. Please wait a moment.');
        saved.rate.all.push(now);
        if (path === '/api/ask' && saved.rate.ask.length >= 20) fail(429, 'This demo allows 20 questions per minute per session. Please wait a moment.');
        if (path === '/api/evaluate' && saved.rate.evaluate.length >= 3) fail(429, 'This demo allows three policy test runs per minute per session. Please wait a moment.');
        let response;
        if (path === '/api/session') response = json(envelope(getSnapshot(session), saved.expiresAt));
        else if (path.startsWith('/api/evidence/')) {
          const receipt = getReceipt(session, path.split('/').at(-1));
          response = json(receipt, 200, { 'Content-Disposition': `attachment; filename="agentgate-evidence-${receipt.id}.json"` });
        } else if (path === '/api/evaluate') {
          await readBody(request, []); saved.rate.evaluate.push(now);
          response = json(await evaluate());
        } else if (path === '/api/ask') {
          const data = await readBody(request, ['question', 'mode']);
          if (data.mode !== 'evidence') fail(403, 'The public demo supports Evidence mode only. Run the project locally with Ollama for AI answers.', 'AI_DISABLED');
          saved.rate.ask.push(now);
          const answer = await ask(session, data, { model: disabledModel });
          this.trim(session);
          response = json({ ...answer, session: envelope(getSnapshot(session), saved.expiresAt) });
        } else {
          if (path === '/api/role') { const data = await readBody(request, ['role']); switchRole(session, data.role); }
          else if (path === '/api/access') { const data = await readBody(request, ['documentId', 'revoked']); changeAccess(session, data.documentId, data.revoked); }
          else if (path === '/api/reset') { await readBody(request, []); resetSession(session); }
          else fail(404, 'Endpoint not found.');
          response = json(envelope(getSnapshot(session), saved.expiresAt));
        }
        saved.state = serializeSession(session);
        await this.ctx.storage.put('session', saved);
        return response;
      } catch (error) {
        // Preserve request limits after invalid requests as well; reset never resets them.
        if (saved) await this.ctx.storage.put('session', saved);
        return errorResponse(error);
      }
    });
  }
  trim(session) {
    session.receipts = session.receipts.slice(0, 30);
    session.turns = session.turns.slice(-8);
    while (session.cache.size > 8) session.cache.delete(session.cache.keys().next().value);
    const bytes = () => new TextEncoder().encode(JSON.stringify(serializeSession(session))).byteLength;
    while (bytes() > MAX_STATE) {
      if (session.cache.size) session.cache.delete(session.cache.keys().next().value);
      else if (session.receipts.length > 1) session.receipts.pop();
      else if (session.turns.length > 1) session.turns.shift();
      else throw new Error('Session exceeds storage budget.');
    }
  }
  async alarm() {
    return this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get('session');
      if (!saved || saved.expiresAt <= Date.now()) await this.ctx.storage.deleteAll();
      else await this.ctx.storage.setAlarm(saved.expiresAt);
    });
  }
}
