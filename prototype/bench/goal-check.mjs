import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';
const h = await createHarness(), results = [];
const goal = (task) => ({op: 'goal', url: h.page.url(), fields: task.fields.map(({group, label, value}) => ({group, label, value})),
  expansions: task.name === 'repeat' ? [{label: '添加教育经历', expectGroup: '教育经历 2'}] : []});
const check = async (name, fn) => {
  try { await fn(); results.push({name, passed: true}); console.log(`PASS ${name}`); }
  catch (e) { results.push({name, passed: false, error: e.message}); console.error(`FAIL ${name}: ${e.message}`); }
};
try {
  for (const task of cases) await check(`one goal, no host inspection: ${task.name}`, async () => {
    await h.reset(task.name); const r = await h.bridge.request(goal(task));
    assert.equal(r.complete, true, JSON.stringify(r)); assert.equal((await oracle(h.page, task)).passed, true);
    assert.equal(r.evidence.length, task.fields.length); assert.ok(r.evidence.every((x) => x.status === 'verified'));
  });
  await check('wrong page rejected before any mutation', async () => {
    await h.reset('plain'); const g = goal(cases[0]); g.url += '?other';
    await assert.rejects(h.bridge.request(g), /WRONG_PAGE/); assert.equal(await h.page.locator('#name').inputValue(), '');
  });
  await check('ambiguous exact labels reject before any mutation', async () => {
    await h.reset('plain'); await h.page.locator('#name').evaluate((el) => {
      const duplicate = el.cloneNode(); duplicate.id = 'other'; duplicate.setAttribute('aria-label', '姓名'); el.after(duplicate);
    });
    await assert.rejects(h.bridge.request(goal(cases[0])), /AMBIGUOUS_FIELD/);
    assert.equal(await h.page.locator('#name').inputValue(), '');
  });
  await check('unknown target retained as unresolved; no heuristic guess', async () => {
    await h.reset('plain'); const g = goal(cases[0]); g.fields[0].label = '紧急联系人姓名';
    const r = await h.bridge.request(g); assert.equal(r.complete, false);
    assert.equal(r.evidence[0].status, 'unresolved'); assert.equal(await h.page.locator('#name').inputValue(), '');
  });
  await check('same-semantic field replacement recovers without host', async () => {
    await h.reset('plain'); await h.page.locator('#name').evaluate((el) => el.addEventListener('change', () => {
      const email = document.getElementById('email'); email.replaceWith(email.cloneNode(true));
    }, {once: true}));
    const r = await h.bridge.request(goal(cases[0])); assert.equal(r.complete, true, JSON.stringify(r));
    assert.equal((await oracle(h.page, cases[0])).passed, true);
    assert.ok(r.trace.filter((x) => x.operation === 'fill').length >= 2);
  });
  await check('replacement with changed meaning never receives old value', async () => {
    await h.reset('plain'); await h.page.locator('#name').evaluate((el) => el.addEventListener('change', () => {
      const email = document.getElementById('email'); email.setAttribute('aria-label', '推荐人邮箱');
    }, {once: true}));
    const r = await h.bridge.request(goal(cases[0])); assert.equal(r.complete, false);
    assert.equal(await h.page.locator('#email').inputValue(), '');
  });
  await check('kind change is not silently repaired', async () => {
    await h.reset('plain'); await h.page.locator('#name').evaluate((el) => el.addEventListener('change', () => {
      document.getElementById('email').type = 'text';
    }, {once: true}));
    const r = await h.bridge.request(goal(cases[0])); assert.equal(r.reason, 'FIELD_KIND_CHANGED');
    assert.equal(await h.page.locator('#email').inputValue(), '');
  });
  await check('100 ms delayed rejection does not become successful completion', async () => {
    await h.reset('plain'); await h.page.locator('#language').evaluate((el) => el.addEventListener('change', () => {
      setTimeout(() => { el.value = ''; window.applicationState.language = ''; }, 100);
    }));
    const r = await h.bridge.request(goal(cases[0])); assert.equal(r.complete, false);
    assert.equal(r.evidence.find((x) => x.label === '语言能力').status, 'unresolved');
  });
  await check('missing expansion stops after one click', async () => {
    await h.reset('repeat'); await h.page.locator('button[type=button]').evaluate((el) => {
      const replacement = el.cloneNode(true); el.replaceWith(replacement); window.clickCount = 0; replacement.onclick = () => window.clickCount++;
    });
    const r = await h.bridge.request(goal(cases[2])); assert.equal(r.complete, false);
    assert.equal(await h.page.evaluate(() => window.clickCount), 1);
  });
  await check('goals already satisfied do not fire duplicate change events', async () => {
    await h.reset('plain'); await h.bridge.request(goal(cases[0]));
    await h.page.evaluate(() => { window.extraEvents = 0; document.querySelector('form').addEventListener('change', () => window.extraEvents++); });
    const r = await h.bridge.request(goal(cases[0])); assert.equal(r.complete, true);
    assert.equal(await h.page.evaluate(() => window.extraEvents), 0);
  });
  await check('actual MCP goal mode discovery and one-call execution', async () => {
    await h.reset('dependent'); const client = new Client({name: 'goal-check', version: '0.0.1'});
    try {
      await client.connect(new StdioClientTransport({command: process.execPath, args: [`${projectRoot}/prototype/src/mcp.mjs`], env: {...process.env, AFA_SESSION_FILE: h.sessionFile, AFA_TOOL_MODE: 'goal'}}));
      assert.deepEqual((await client.listTools()).tools.map((t) => t.name).sort(), ['form_apply_goal', 'form_inspect']);
      const {op, ...args} = goal(cases[1]);
      const r = await client.callTool({name: 'form_apply_goal', arguments: args});
      assert.equal(JSON.parse(r.content[0].text).complete, true);
      assert.equal((await oracle(h.page, cases[1])).passed, true);
    } finally { await client.close(); }
  });
} finally {
  await writeFile(`${projectRoot}/prototype/reports/goal-checks.json`, JSON.stringify({date: new Date().toISOString(), results}, null, 2));
  await h.close();
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
