import http from 'node:http';
import {randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {readFile, mkdir, writeFile, chmod} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {WebSocketServer, WebSocket} from 'ws';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const fixtureRoot = fileURLToPath(new URL('../fixtures/', import.meta.url));

export async function createBridge({port = 43187, sessionFile} = {}) {
  const token = randomBytes(32).toString('hex');
  let extension, connectedTab, count = 0;
  const pending = new Map();
  const auth = (candidate = '') => candidate.length === token.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(token));
  const send = (res, code, body) => {
    res.writeHead(code, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
    res.end(JSON.stringify(body));
  };
  const request = (payload) => new Promise((resolve, reject) => {
    if (!extension || extension.readyState !== WebSocket.OPEN || connectedTab === undefined) return reject(new Error('NO_BROWSER: connect a tab using the extension'));
    const id = randomUUID(); count++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('BROWSER_TIMEOUT: inspect before retrying; actions may already have run')); }, 15000);
    pending.set(id, {resolve, reject, timer});
    extension.send(JSON.stringify({type: 'request', id, request: payload}));
  });
  const server = http.createServer(async (req, res) => {
    try {
      if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '')) return send(res, 403, {error: 'Invalid host'});
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, {ok: true, connected: connectedTab !== undefined, requests: count});
      if (req.method === 'GET' && url.pathname.startsWith('/fixtures/')) {
        const name = url.pathname.slice('/fixtures/'.length) || 'index.html';
        if (!/^[a-z0-9-]+\.(html|js|css)$/.test(name)) return send(res, 404, {error: 'Not found'});
        const body = await readFile(path.join(fixtureRoot, name));
        res.writeHead(200, {'Content-Type': name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
        return res.end(body);
      }
      if (req.method !== 'POST' || url.pathname !== '/rpc') return send(res, 404, {error: 'Not found'});
      // Browser pages cannot call the control endpoint. MCP clients are local Node processes.
      if (req.headers.origin || !auth((req.headers.authorization ?? '').replace(/^Bearer /, ''))) return send(res, 403, {error: 'Forbidden'});
      let text = '';
      for await (const chunk of req) {
        text += chunk;
        if (text.length > 262144) return send(res, 413, {error: 'Request too large'});
      }
      const payload = JSON.parse(text);
      if (!['inspect', 'fill'].includes(payload.op)) return send(res, 400, {error: 'Unknown operation'});
      send(res, 200, await request(payload));
    } catch (e) { send(res, 400, {error: e.message}); }
  });
  const wss = new WebSocketServer({noServer: true, maxPayload: 1024 * 1024});
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '') || url.pathname !== '/extension' ||
        !/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin ?? '') || !auth(url.searchParams.get('token') ?? '')) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  });
  const rejectPending = () => {
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('BROWSER_DISCONNECTED: inspect before retrying')); }
    pending.clear();
  };
  wss.on('connection', (ws) => {
    rejectPending(); extension?.close(); extension = ws; connectedTab = undefined;
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { ws.close(); return; }
      if (msg.type === 'ready') connectedTab = msg.tabId;
      if (msg.type === 'response') {
        const p = pending.get(msg.id);
        if (!p) return;
        clearTimeout(p.timer); pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error)); else p.resolve(msg.result);
      }
    });
    ws.on('close', () => { if (extension === ws) { extension = undefined; connectedTab = undefined; rejectPending(); } });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const config = {bridge: `http://127.0.0.1:${server.address().port}`, token};
  if (sessionFile) {
    await mkdir(path.dirname(sessionFile), {recursive: true});
    await writeFile(sessionFile, JSON.stringify(config, null, 2), {mode: 0o600});
    await chmod(sessionFile, 0o600);
  }
  return {config, request, get connected() { return connectedTab !== undefined; },
    get requestCount() { return count; },
    async close() {
      rejectPending(); for (const ws of wss.clients) ws.terminate();
      await new Promise((r) => wss.close(r));
      await new Promise((r) => server.close(r));
    }};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sessionFile = path.join(projectRoot, '.runtime/session.json');
  const bridge = await createBridge({port: Number(process.env.AFA_PORT || 43187), sessionFile});
  console.log(`Prototype bridge: ${bridge.config.bridge}\nPairing configuration: ${sessionFile}\nFixtures: ${bridge.config.bridge}/fixtures/index.html`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await bridge.close(); process.exit(0); });
}
