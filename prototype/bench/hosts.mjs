// Live integration smoke test. Uses existing host login; sends only fabricated data.
// This is not a native-browser speed comparison and does not install global config.
import {spawn} from 'node:child_process';
import {mkdtemp, rm, readFile, writeFile, mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHarness} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';

const h = await createHarness();
const workspace = await mkdtemp(path.join(os.tmpdir(), 'afa-host-smoke-'));
const script = path.join(projectRoot, 'prototype/src/mcp.mjs');
const skill = await readFile(path.join(projectRoot, 'prototype/skills/form-accelerator/SKILL.md'), 'utf8');
const reportPath = path.join(projectRoot, 'prototype/reports/host-smoke.json');
let rows = [];
try { rows = JSON.parse(await readFile(reportPath, 'utf8')).rows; } catch {}
const currentRows = [];
const privateDir = path.join(projectRoot, 'prototype/reports/private'); await mkdir(privateDir, {recursive: true});
const run = (command, args, prompt) => new Promise((resolve) => {
  const started = performance.now();
  const child = spawn(command, args, {cwd: workspace, env: {...process.env, AFA_SESSION_FILE: h.sessionFile}, stdio: ['pipe', 'pipe', 'pipe']});
  let stdout = '', stderr = '', timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 180000);
  child.stdout.on('data', (x) => { stdout += x; }); child.stderr.on('data', (x) => { stderr += x; });
  child.on('error', (e) => { clearTimeout(timer); resolve({exitCode: null, error: e.message, stdout, stderr, elapsedMs: performance.now() - started}); });
  child.on('close', (exitCode) => { clearTimeout(timer); resolve({exitCode, timedOut, stdout, stderr, elapsedMs: performance.now() - started}); });
  child.stdin.on('error', () => {}); child.stdin.end(prompt);
});
try {
  const hosts = process.argv.slice(2).length ? process.argv.slice(2) : ['codex', 'claude'];
  for (const host of hosts) {
    if (!['codex', 'claude'].includes(host)) throw new Error('Use codex or claude');
    await h.reset('plain');
    const task = cases[0];
    const prompt = `This is an authorized local integration test on a synthetic form already connected to the afa MCP server. Use ONLY form_inspect and form_fill to fill it from the supplied fictional facts. Do not submit, browse elsewhere, use shell tools, inspect files, or make project changes. Use one batch for independent fields and inspect after filling. Finish with a short statement of unresolved fields.\n\nWorkflow:\n${skill}\n\nTarget URL: ${h.page.url()}\nFictional facts:\n${JSON.stringify(task.fields.map(({label, value, group}) => ({label, value, group})))}`;
    const config = {mcpServers: {afa: {command: process.execPath, args: [script], env: {AFA_SESSION_FILE: h.sessionFile}}}};
    const args = host === 'codex' ? [
      'exec', '--json', '--ephemeral', '--ignore-user-config', '--skip-git-repo-check', '--approve-for-me',
      '-c', 'features.shell_tool=false', '-c', 'web_search="disabled"',
      '-c', `mcp_servers.afa.command=${JSON.stringify(process.execPath)}`,
      '-c', `mcp_servers.afa.args=${JSON.stringify([script])}`,
      '-c', `mcp_servers.afa.env.AFA_SESSION_FILE=${JSON.stringify(h.sessionFile)}`, '-',
    ] : [
      '-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--strict-mcp-config',
      '--mcp-config', JSON.stringify(config), '--setting-sources', '', '--tools', '', '--no-chrome',
      '--disable-slash-commands', '--allowedTools', 'mcp__afa__form_inspect,mcp__afa__form_fill',
      '--permission-mode', 'dontAsk', '--max-budget-usd', '2',
    ];
    console.log(`Starting ${host} against isolated synthetic form…`);
    const before = h.bridge.requestCount;
    const result = await run(host, args, prompt);
    const attempt = `${host}-${Date.now()}`;
    await writeFile(path.join(privateDir, `${attempt}.jsonl`), result.stdout, {mode: 0o600});
    await writeFile(path.join(privateDir, `${attempt}.stderr.log`), result.stderr, {mode: 0o600});
    const check = await oracle(h.page, task);
    const toolNames = [];
    let model;
    for (const line of result.stdout.split('\n')) {
      try {
        const event = JSON.parse(line);
        model ??= event.model ?? event.message?.model;
        if (event.type === 'item.completed' && event.item?.type === 'mcp_tool_call') toolNames.push(event.item.tool);
        for (const item of event.message?.content ?? []) if (item.type === 'tool_use') toolNames.push(item.name);
      } catch {}
    }
    const row = {host, attempt, date: new Date().toISOString(), elapsedMs: result.elapsedMs, exitCode: result.exitCode,
      timedOut: result.timedOut, model, bridgeRequests: h.bridge.requestCount - before, toolNames, ...check,
      configuration: 'Ephemeral invocation; explicit afa MCP only; no global config changes. Existing authentication. Default host model; no model override. Codex uses its auto-review approval workflow for synthetic local writes.',
      error: result.error};
    rows.push(row); currentRows.push(row); console.log(JSON.stringify(row));
  }
} finally {
  await writeFile(reportPath, JSON.stringify({scope: 'Single synthetic-form live host integration per host; elapsed times include CLI/model/tool overhead and are not a speedup benchmark. All attempts retained.', rows}, null, 2));
  await h.close(); await rm(workspace, {recursive: true, force: true});
}
if (currentRows.some((r) => !r.passed || r.exitCode !== 0 || r.bridgeRequests < 2)) process.exitCode = 1;
