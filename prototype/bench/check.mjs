import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness, fillWithExecutor} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';

const h = await createHarness(), results = [];
const check = async (name, fn) => {
  try { await fn(); results.push({name, passed: true}); console.log(`PASS ${name}`); }
  catch (error) { results.push({name, passed: false, error: error.message}); console.error(`FAIL ${name}: ${error.message}`); }
};
const inspect = () => h.bridge.request({op: 'inspect'});
const fill = (o, actions) => h.bridge.request({op: 'fill', url: o.url, snapshot: o.snapshot, actions});
try {
  for (const task of cases) await check(`extension path and independent app-state oracle: ${task.name}`, async () => {
    await h.reset(task.name); await fillWithExecutor(h, task);
    assert.deepEqual(await oracle(h.page, task), {passed: true, correct: task.fields.length, total: task.fields.length, errors: []});
  });
  await check('stale snapshot rejected after a new inspection', async () => {
    await h.reset('plain'); const old = await inspect(); await inspect();
    await assert.rejects(fill(old, [{ref: old.fields[0].ref, op: 'set', value: 'old'}]), /STALE_SNAPSHOT/);
  });
  await check('page navigation invalidates old references', async () => {
    await h.reset('plain'); const old = await inspect(); await h.page.reload();
    await assert.rejects(fill(old, [{ref: old.fields[0].ref, op: 'set', value: 'old'}]), /STALE_SNAPSHOT/);
  });
  await check('relabelled target stops the batch', async () => {
    await h.reset('plain'); const o = await inspect();
    await h.page.locator('#name').evaluate((el) => el.setAttribute('aria-label', '银行账户'));
    const r = await fill(o, o.fields.slice(0, 2).map((f) => ({ref: f.ref, op: 'set', value: 'should not fill'})));
    assert.equal(r.results[0].reason, 'FIELD_CHANGED'); assert.equal(r.results[1].status, 'not-attempted');
    assert.equal(await h.page.locator('#name').inputValue(), ''); assert.equal(await h.page.locator('#email').inputValue(), '');
  });
  await check('replaced DOM node is not silently retargeted', async () => {
    await h.reset('plain'); const o = await inspect();
    await h.page.locator('#name').evaluate((el) => el.replaceWith(el.cloneNode(true)));
    const r = await fill(o, [{ref: o.fields[0].ref, op: 'set', value: 'stale'}]);
    assert.equal(r.results[0].reason, 'STALE_OR_MISSING_FIELD');
  });
  await check('invalid email is not reported as verified', async () => {
    await h.reset('plain'); const o = await inspect(); const email = o.fields.find((f) => f.label === '邮箱');
    const r = await fill(o, [{ref: email.ref, op: 'set', value: 'invalid'}]);
    assert.equal(r.complete, false); assert.equal(r.results[0].reason, 'HTML_VALIDATION_FAILED');
  });
  await check('hidden fields omitted; passwords never read or filled; submit excluded', async () => {
    await h.reset('plain');
    await h.page.evaluate(() => {
      const form = document.querySelector('form');
      const password = document.createElement('input'); password.type = 'password'; password.setAttribute('aria-label', '密码'); password.value = 'not-returned'; form.append(password);
      const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'csrf'; hidden.value = 'not-returned'; form.append(hidden);
    });
    const o = await inspect(); assert.ok(!JSON.stringify(o).includes('not-returned'));
    const password = o.fields.find((f) => f.kind === 'password'); assert.equal(password.supported, false);
    const r = await fill(o, [{ref: password.ref, op: 'set', value: 'no'}]);
    assert.equal(r.results[0].reason, 'UNSUPPORTED_CONTROL'); assert.equal(o.controls.length, 0);
  });
  await check('read-back detects framework rejecting an input', async () => {
    await h.reset('plain');
    await h.page.locator('#name').evaluate((el) => el.addEventListener('change', () => { el.value = ''; }));
    const o = await inspect(); const r = await fill(o, [{ref: o.fields[0].ref, op: 'set', value: 'rejected'}]);
    assert.equal(r.results[0].reason, 'VALUE_NOT_RETAINED');
  });
  await check('HTTP control endpoint rejects web origins and missing authentication', async () => {
    const target = `${h.bridge.config.bridge}/rpc`;
    const a = await fetch(target, {method: 'POST', body: '{}'}); assert.equal(a.status, 403);
    const b = await fetch(target, {method: 'POST', headers: {Origin: 'https://example.test', Authorization: `Bearer ${h.bridge.config.token}`}, body: '{}'});
    assert.equal(b.status, 403);
  });
  await check('real stdio MCP handshake, schema discovery, inspect and fill', async () => {
    await h.reset('plain');
    const client = new Client({name: 'prototype-protocol-check', version: '0.0.1'});
    const transport = new StdioClientTransport({command: process.execPath, args: [path.join(projectRoot, 'prototype/src/mcp.mjs')], env: {...process.env, AFA_SESSION_FILE: h.sessionFile}, stderr: 'pipe'});
    try {
      await client.connect(transport);
      const tools = await client.listTools(); assert.deepEqual(tools.tools.map((t) => t.name).sort(), ['form_execute_plan', 'form_fill', 'form_inspect']);
      const request = async ({op, ...args}) => {
        const response = await client.callTool({name: op === 'inspect' ? 'form_inspect' : 'form_fill', arguments: args});
        if (response.isError) throw new Error(response.content[0].text);
        return JSON.parse(response.content[0].text);
      };
      await fillWithExecutor(h, cases[0], {request}); assert.equal((await oracle(h.page, cases[0])).passed, true);
    } finally { await client.close(); }
  });
} finally {
  await writeFile(path.join(projectRoot, 'prototype/reports/functional-checks.json'), JSON.stringify({date: new Date().toISOString(), scope: 'Real Chromium extension and MCP protocol; not live host model testing', results}, null, 2));
  await h.close();
}
console.log(`${results.filter((r) => r.passed).length}/${results.length} checks passed`);
if (results.some((r) => !r.passed)) process.exitCode = 1;
