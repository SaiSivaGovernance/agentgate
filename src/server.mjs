import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createSession, getSnapshot, switchRole, changeAccess, resetSession, ask, evaluate, getReceipt } from './engine.mjs';
import { getModelStatus } from './model.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const COOKIE = 'agentgate_session';
const TTL = 30 * 60 * 1000;
const MAX_SESSIONS = 100;
const MAX_BODY = 4096;
const ASSETS = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/share-preview.jpg', ['share-preview.jpg', 'image/jpeg']],
]);

class HttpError extends Error {
  constructor(statusCode, message, code = 'invalid_request') { super(message); this.statusCode = statusCode; this.code = code; }
}

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};

function send(res, status, data, extra = {}) {
  res.writeHead(status, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', ...extra });
  res.end(JSON.stringify(data));
}

async function body(req, keys) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || ''))
    throw new HttpError(415, 'Send an application/json request.');
  const declared = req.headers['content-length'];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY))
    throw new HttpError(413, 'This request is too large.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'This request is too large.');
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'The request must contain valid JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !keys.includes(key)))
    throw new HttpError(400, 'Unexpected request fields.');
  return data;
}

export function createAgentGateServer({ port = Number(process.env.PORT || 8790), modelStatus = getModelStatus } = {}) {
  const sessions = new Map();
  let activeRequests = 0;

  function findSession(req, res) {
    const now = Date.now();
    for (const [key, value] of sessions) if (!value.busy && now - value.seen > TTL) sessions.delete(key);
    const raw = (req.headers.cookie || '').split(';').find(x => x.trim().startsWith(`${COOKIE}=`));
    const token = raw?.trim().slice(COOKIE.length + 1);
    if (token && sessions.has(token)) { const slot = sessions.get(token); slot.seen = now; return slot; }
    if (sessions.size >= MAX_SESSIONS) throw new HttpError(503, 'The local lab is full. Try again after a session expires.');
    const next = randomBytes(32).toString('hex');
    const slot = { state: createSession(), seen: now, busy: false, requests: [] };
    sessions.set(next, slot);
    res.setHeader('Set-Cookie', `${COOKIE}=${next}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`);
    return slot;
  }

  const server = http.createServer(async (req, res) => {
    const started = performance.now();
    let pathname = '/';
    try {
      const boundPort = server.address()?.port || port;
      const origins = new Set([`http://127.0.0.1:${boundPort}`, `http://localhost:${boundPort}`]);
      // Bind to loopback and reject alternate Host names to limit DNS-rebinding access.
      if (![...origins].some(origin => origin.slice(7) === req.headers.host))
        throw new HttpError(403, 'This lab is available through localhost only.');
      const url = new URL(req.url, `http://${req.headers.host}`);
      pathname = url.pathname;
      if (url.search) throw new HttpError(400, 'Query parameters are not supported.');
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Cross-site requests are not allowed.');
      if (req.method === 'POST' && !origins.has(req.headers.origin))
        throw new HttpError(403, 'The request must originate from this AgentGate app.');
      if (req.method === 'GET' && ASSETS.has(pathname)) {
        const [filename, type] = ASSETS.get(pathname);
        const content = await readFile(resolve(ROOT, 'public', filename));
        res.writeHead(200, { ...securityHeaders, 'Content-Type': type });
        res.end(content); return;
      }
      if (pathname === '/api/health' && req.method === 'GET') {
        send(res, 200, { ok: true, mode: 'synthetic-governance-lab', model: await modelStatus() }); return;
      }
      if (!pathname.startsWith('/api/')) throw new HttpError(404, 'Page not found.');
      const routes = new Set(['/api/session', '/api/role', '/api/access', '/api/reset', '/api/ask', '/api/evaluate']);
      if (!routes.has(pathname) && !/^\/api\/evidence\/[a-zA-Z0-9-]+$/.test(pathname))
        throw new HttpError(404, 'Endpoint not found.');
      const isRead = pathname === '/api/session' || pathname.startsWith('/api/evidence/');
      if (req.method !== (isRead ? 'GET' : 'POST')) throw new HttpError(405, 'Method not allowed.');
      const slot = findSession(req, res);
      if (pathname === '/api/session') {
        slot.state.modelStatus = await modelStatus();
        send(res, 200, getSnapshot(slot.state)); return;
      }
      if (pathname.startsWith('/api/evidence/')) {
        const receipt = getReceipt(slot.state, pathname.split('/').at(-1));
        if (!receipt) throw new HttpError(404, 'Evidence not found in this session.');
        send(res, 200, receipt, { 'Content-Disposition': `attachment; filename="agentgate-evidence-${receipt.id}.json"` }); return;
      }
      if (pathname === '/api/role') {
        const data = await body(req, ['role']); switchRole(slot.state, data.role);
      } else if (pathname === '/api/access') {
        const data = await body(req, ['documentId', 'revoked']); changeAccess(slot.state, data.documentId, data.revoked);
      } else if (pathname === '/api/reset') {
        await body(req, []); resetSession(slot.state);
      } else if (pathname === '/api/evaluate') {
        await body(req, []); send(res, 200, await evaluate()); return;
      } else if (pathname === '/api/ask') {
        const data = await body(req, ['question', 'mode']);
        const now = Date.now(); slot.requests = slot.requests.filter(t => now - t < 60_000);
        if (slot.requests.length >= 20) throw new HttpError(429, 'Please wait a moment. This local demo allows 20 questions per minute.');
        if (slot.busy) throw new HttpError(409, 'An answer is already being prepared for this session.');
        if (activeRequests >= 2) throw new HttpError(429, 'The local model is busy. Please try again shortly.');
        slot.busy = true; activeRequests += 1; slot.requests.push(now);
        try { send(res, 200, await ask(slot.state, data)); }
        finally { slot.busy = false; activeRequests -= 1; }
        return;
      }
      slot.state.modelStatus = await modelStatus();
      send(res, 200, getSnapshot(slot.state));
    } catch (error) {
      const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
      if (status >= 500) console.error(`[AgentGate] ${pathname}: ${error.code || error.name || 'error'}`);
      if (!res.headersSent) send(res, status, { error: status >= 500 && !error.statusCode ? 'Something went wrong. Please retry.' : error.message, code: error.code || 'server_error' });
      else res.end();
    } finally {
      console.info(`${req.method} ${pathname} ${res.statusCode} ${Math.round(performance.now() - started)}ms`);
    }
  });
  server.requestTimeout = 75_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8790);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be a non-privileged TCP port.');
  const server = createAgentGateServer({ port });
  server.listen(port, '127.0.0.1', () => console.info(`AgentGate ready at http://127.0.0.1:${port}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
