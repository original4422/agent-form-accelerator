// Same Codex invocation and fictional task, counterbalanced tool surfaces.
// Retains every attempt; a failed run stays in both correctness and time data.
import {spawn} from 'node:child_process';
import {mkdtemp, rm, readFile, writeFile, mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createHarness} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';

const h = await createHarness();
const workspace = await mkdtemp(path.join(os.tmpdir(), 'afa-codex-goal-'));
const reportPath = `${projectRoot}/prototype/reports/codex-goals.json`;
const privateDir = `${projectRoot}/prototype/reports/private`; await mkdir(privateDir, {recursive: true});
const token = randomBytes(32).toString('hex');
// Browser scripts can only reach these synthetic fixture assets, not other origins
// or local control endpoints. There are no credentials or user files in the profile.
await h.context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin === h.bridge.config.bridge && /^\/fixtures\/[a-z0-9-]+\.(html|js|css)$/.test(url.pathname)) await route.continue();
  else await route.abort();
});
const server = http.createServer(async (req, res) => {
  const reply = (x, status = 200) => { res.writeHead(status, {'Content-Type': 'application/json'}); res.end(JSON.stringify(x)); };
  if (req.method !== 'POST' || req.url !== '/rpc' || req.headers.origin || req.headers.authorization !== `Bearer ${token}` || !/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '')) return reply({error: 'Forbidden'}, 403);
  try {
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 65536) throw new Error('Too large'); }
    const request = JSON.parse(body);
    if (request.op === 'inspect') return reply(await h.bridge.request({op: 'inspect'}));
    if (request.op !== 'script' || typeof request.code !== 'string' || request.code.length > 30000) throw new Error('Invalid request');
    const before = await h.bridge.request(request.snapshot ? {op: 'validate', snapshot: request.snapshot, url: request.url} : {op: 'inspect'});
    if (before.url !== request.url) throw new Error('WRONG_PAGE');
    const started = performance.now();
    let timer;
    try {
      await Promise.race([h.page.evaluate(request.code), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('SCRIPT_TIMEOUT')), 8000); })]);
    } finally { clearTimeout(timer); }
    await new Promise((r) => setTimeout(r, 120));
    const observation = await h.bridge.request({op: 'inspect'});
    if (observation.documentId !== before.documentId || observation.url !== before.url) throw new Error('PAGE_CHANGED');
    reply({observation, elapsedMs: performance.now() - started});
  } catch (e) { reply({error: e.message}); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const benchSession = path.join(workspace, 'script-session.json');
await writeFile(benchSession, JSON.stringify({url: `http://127.0.0.1:${server.address().port}/rpc`, token}), {mode: 0o600});

const run = (args, prompt) => new Promise((resolve) => {
  const started = performance.now(), timeline = [];
  const child = spawn('codex', args, {cwd: workspace, env: process.env, stdio: ['pipe', 'pipe', 'pipe']});
  let stdout = '', stderr = '', partial = '', timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 180000);
  child.stdout.on('data', (x) => {
    stdout += x; partial += x; const lines = partial.split('\n'); partial = lines.pop();
    for (const line of lines) try {
      const e = JSON.parse(line), item = e.item;
      timeline.push({atMs: performance.now() - started, event: e.type, itemId: item?.id, itemType: item?.type, tool: item?.tool, status: item?.status});
    } catch {}
  });
  child.stderr.on('data', (x) => { stderr += x; });
  child.on('error', (e) => { clearTimeout(timer); resolve({error: e.message, stdout, stderr, timeline, elapsedMs: performance.now() - started}); });
  child.on('close', (exitCode) => { clearTimeout(timer); resolve({exitCode, timedOut, stdout, stderr, timeline, elapsedMs: performance.now() - started}); });
  child.stdin.on('error', () => {}); child.stdin.end(prompt);
});
const rows = [];
const batchId = Date.now();
const save = async () => { const report = JSON.stringify({date: new Date().toISOString(), batchId,
  scope: 'Codex CLI cold-task end-to-end comparison on fictional local forms; warmed browser. No native Codex browser tool comparison. Default CLI model/config is shared across modes, no model override. Same auto-review approval policy; shell/web disabled; only test MCP server. Alternating AB/BA/AB order for goal vs one-shot script. Neither mode requires host-side initial or final inspection. Same 120ms local final observation delay; independent app-state oracle. All attempts retained.',
  rows}, null, 2); await writeFile(reportPath, report); await writeFile(`${projectRoot}/prototype/reports/codex-goals-${batchId}.json`, report); };
try {
  const order = [['goal', 'script'], ['script', 'goal'], ['goal', 'script']];
  const selectedCases = process.argv.slice(2).length ? process.argv.slice(2) : ['plain', 'dependent', 'repeat'];
  for (const name of selectedCases) {
    const task = cases.find((t) => t.name === name); if (!task) throw new Error(`Unknown case: ${name}`);
    for (let repetition = 0; repetition < order.length; repetition++) for (const mode of order[repetition]) {
      await h.reset(name);
      const tool = mode === 'goal' ? 'form_apply_goal' : 'browser_script';
      const prompt = `This is an authorized local benchmark using ONLY fabricated facts on a disposable synthetic form already connected to the afa MCP server. Complete the form using form_inspect and ${tool}. Use the supplied facts only. Do not submit, navigate, fetch, run shell commands, or inspect files. Minimize tool calls. Prior form_inspect is optional: your tool can inspect and act locally in one request. Use the returned evidence/observation to verify all supplied facts, including repeated groups; an additional inspection is optional if needed. Handle dependencies and extra rows as your tool allows. Use native option values. Report any unresolved fields briefly. This test authorizes writing these fictional values and adding the required education row on this local fixture.\nTarget URL: ${h.page.url()}\nFictional facts:\n${JSON.stringify(task.fields.map(({label, value, group}) => ({label, value, group})))}`;
      const script = mode === 'script' ? `${projectRoot}/prototype/bench/oneshot-script-mcp.mjs` : `${projectRoot}/prototype/src/mcp.mjs`;
      const args = ['exec', '--json', '--ephemeral', '--ignore-user-config', '--skip-git-repo-check', '--approve-for-me',
        '-c', 'features.shell_tool=false', '-c', 'web_search="disabled"',
        '-c', `mcp_servers.afa.command=${JSON.stringify(process.execPath)}`,
        '-c', `mcp_servers.afa.args=${JSON.stringify([script])}`,
        '-c', `mcp_servers.afa.env.AFA_SESSION_FILE=${JSON.stringify(h.sessionFile)}`,
        '-c', `mcp_servers.afa.env.AFA_TOOL_MODE=${JSON.stringify(mode)}`,
        '-c', `mcp_servers.afa.env.AFA_BENCH_SESSION=${JSON.stringify(benchSession)}`, '-'];
      console.log(`START ${name} ${repetition + 1}/3 ${mode}`);
      const before = h.bridge.requestCount, r = await run(args, prompt), attempt = `${batchId}-${name}-${repetition}-${mode}`;
      await writeFile(`${privateDir}/${attempt}.jsonl`, r.stdout, {mode: 0o600});
      await writeFile(`${privateDir}/${attempt}.stderr.log`, r.stderr, {mode: 0o600});
      const toolCalls = []; let usage;
      for (const line of r.stdout.split('\n')) try {
        const e = JSON.parse(line);
        if (e.type === 'turn.completed') usage = e.usage;
        if (e.type === 'item.completed' && e.item?.type === 'mcp_tool_call') {
          const item = e.item, start = r.timeline.find((x) => x.itemId === item.id && x.event === 'item.started');
          const end = r.timeline.find((x) => x.itemId === item.id && x.event === 'item.completed');
          const content = item.result?.content?.find((c) => c.type === 'text')?.text;
          let result; try { result = JSON.parse(content); } catch {}
          toolCalls.push({tool: item.tool, status: item.status, isError: item.result?.isError,
            startMs: start?.atMs, endMs: end?.atMs, durationMs: start ? end.atMs - start.atMs : undefined,
            returnedBytes: content ? Buffer.byteLength(content) : undefined, executionMs: result?.elapsedMs,
            complete: result?.complete, reason: result?.reason, primitiveCalls: result?.primitiveCalls});
        }
      } catch {}
      // The app-state oracle is outside the model and outside measured CLI time.
      const check = await oracle(h.page, task);
      const row = {attempt, case: name, repetition, mode, elapsedMs: r.elapsedMs, exitCode: r.exitCode, timedOut: r.timedOut,
        error: r.error, ...check, bridgeRequests: h.bridge.requestCount - before, toolCalls, timeline: r.timeline, usage};
      rows.push(row); await save();
      console.log(JSON.stringify({case: name, repetition, mode, seconds: (r.elapsedMs / 1000).toFixed(2), passed: check.passed, calls: toolCalls.length, errors: check.errors}));
    }
  }
} finally {
  await save(); await new Promise((r) => server.close(r)); await h.close(); await rm(workspace, {recursive: true, force: true});
}
if (rows.some((r) => !r.passed || r.exitCode !== 0)) process.exitCode = 1;
