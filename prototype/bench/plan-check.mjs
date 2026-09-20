import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';

export function planFor(task, observation) {
  const fields = task.fields.map(({group, label, value}) => ({group, label, value}));
  let steps;
  if (task.name === 'repeat') steps = [
    {op: 'fill', fields: fields.filter((f) => f.group !== '教育经历 2')},
    {op: 'expand', ref: observation.controls[0].ref, expectGroup: '教育经历 2'},
    {op: 'fill', fields: fields.filter((f) => f.group === '教育经历 2')},
  ];
  else if (task.name === 'dependent') steps = [
    {op: 'fill', fields: fields.filter((f) => f.label !== '城市')},
    {op: 'fill', fields: fields.filter((f) => f.label === '城市')},
  ];
  else steps = [{op: 'fill', fields}];
  return {op: 'plan', snapshot: observation.snapshot, url: observation.url, steps};
}
const h = await createHarness(), results = [];
const check = async (name, fn) => {
  try { await fn(); results.push({name, passed: true}); console.log(`PASS ${name}`); }
  catch (e) { results.push({name, passed: false, error: e.message}); console.error(`FAIL ${name}: ${e.message}`); }
};
const inspect = () => h.bridge.request({op: 'inspect'});
const one = (o, label = '姓名', value = '林示例') => ({op: 'plan', snapshot: o.snapshot, url: o.url, steps: [{op: 'fill', fields: [{group: '基本信息', label, value}]}]});
try {
  for (const task of cases) await check(`plan and independent application oracle: ${task.name}`, async () => {
    await h.reset(task.name);
    const r = await h.bridge.request(planFor(task, await inspect()));
    assert.equal(r.complete, true, JSON.stringify(r)); assert.equal((await oracle(h.page, task)).passed, true);
  });
  await check('old plan snapshot cannot start', async () => {
    await h.reset('plain'); const o = await inspect(); await inspect();
    await assert.rejects(h.bridge.request(one(o)), /STALE_SNAPSHOT/);
  });
  await check('changed label invalidates initial plan without writing', async () => {
    await h.reset('plain'); const o = await inspect();
    await h.page.locator('#name').evaluate((el) => el.setAttribute('aria-label', '银行账户'));
    await assert.rejects(h.bridge.request(one(o)), /FIELD_CHANGED/);
    assert.equal(await h.page.locator('#name').inputValue(), '');
  });
  await check('ambiguous exact labels stop before writing', async () => {
    await h.reset('plain'); await h.page.locator('#name').evaluate((el) => {
      const copy = el.cloneNode(); copy.id = 'second-name'; copy.setAttribute('aria-label', '姓名'); el.after(copy);
    });
    const r = await h.bridge.request(one(await inspect())); assert.match(r.reason, /AMBIGUOUS/);
    assert.equal(await h.page.locator('#name').inputValue(), '');
  });
  await check('unknown field is returned rather than guessed', async () => {
    await h.reset('plain'); const r = await h.bridge.request(one(await inspect(), '未观察到的字段'));
    assert.match(r.reason, /UNPLANNED_FIELD/); assert.equal(r.complete, false);
  });
  await check('missing option times out without writing', async () => {
    await h.reset('plain'); const started = performance.now();
    const r = await h.bridge.request(one(await inspect(), '学历', 'not-an-option'));
    assert.equal(r.reason, 'FIELDS_NOT_READY'); assert.ok(performance.now() - started < 2000);
  });
  await check('expansion without expected group stops and clicks only once', async () => {
    await h.reset('repeat'); await h.page.evaluate(() => {
      const old = document.querySelector('button[type=button]'); const copy = old.cloneNode(true); old.replaceWith(copy);
      window.addClicks = 0; copy.onclick = () => window.addClicks++;
    });
    const o = await inspect(), p = one(o); p.steps.unshift({op: 'expand', ref: o.controls[0].ref, expectGroup: '教育经历 2'});
    const r = await h.bridge.request(p); assert.equal(r.reason, 'EXPECTED_GROUP_NOT_FOUND');
    assert.equal(await h.page.evaluate(() => window.addClicks), 1);
  });
  await check('late rejection of an earlier step fails final verification', async () => {
    await h.reset('repeat');
    await h.page.locator('#name').evaluate((el) => el.addEventListener('change', () => setTimeout(() => { el.value = ''; }, 100)));
    const r = await h.bridge.request(planFor(cases[2], await inspect()));
    assert.equal(r.complete, false); assert.equal(r.reason, 'FINAL_VERIFICATION_FAILED');
  });
  await check('navigation between steps cannot retarget the plan', async () => {
    await h.reset('plain');
    await h.page.locator('#name').evaluate((el) => el.addEventListener('change', () => history.pushState({}, '', '?changed')));
    const r = await h.bridge.request(one(await inspect())); assert.equal(r.reason, 'PAGE_CHANGED');
  });
  await check('plan works through actual stdio MCP', async () => {
    await h.reset('repeat'); const client = new Client({name: 'plan-check', version: '0.0.1'});
    try {
      await client.connect(new StdioClientTransport({command: process.execPath, args: [`${projectRoot}/prototype/src/mcp.mjs`], env: {...process.env, AFA_SESSION_FILE: h.sessionFile, AFA_TOOL_MODE: 'plan'}}));
      assert.deepEqual((await client.listTools()).tools.map((t) => t.name).sort(), ['form_execute_plan', 'form_inspect']);
      const observed = await client.callTool({name: 'form_inspect', arguments: {}});
      const {op, ...args} = planFor(cases[2], JSON.parse(observed.content[0].text));
      const filled = await client.callTool({name: 'form_execute_plan', arguments: args});
      assert.equal(JSON.parse(filled.content[0].text).complete, true); assert.equal((await oracle(h.page, cases[2])).passed, true);
    } finally { await client.close(); }
  });
} finally {
  await writeFile(`${projectRoot}/prototype/reports/plan-checks.json`, JSON.stringify({date: new Date().toISOString(), results}, null, 2));
  await h.close();
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
