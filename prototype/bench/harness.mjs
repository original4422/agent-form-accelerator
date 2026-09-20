import {chromium} from 'playwright';
import {mkdir, rm, readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {createBridge, projectRoot} from '../src/bridge.mjs';

export async function createHarness({headless = true, sessionFile, port = 0, extensionDirectory, cdp = false} = {}) {
  const runId = randomUUID();
  const profile = path.join(projectRoot, '.profiles', runId);
  const session = sessionFile || path.join(projectRoot, '.runtime', `${runId}.json`);
  const bridge = await createBridge({port, sessionFile: session});
  const extensionPath = extensionDirectory || path.join(projectRoot, 'prototype/extension');
  await mkdir(profile, {recursive: true});
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless, viewport: {width: 1280, height: 1000},
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`, ...(cdp ? ['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1'] : [])],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const page = context.pages()[0] || await context.newPage();
    const extensionPage = await context.newPage();
    await extensionPage.goto(`chrome-extension://${extensionId}/popup.html`);
    const attach = async () => {
      const tabId = await extensionPage.evaluate(async (url) => {
        const tab = (await chrome.tabs.query({})).find((t) => t.url === url);
        if (!tab) throw new Error('Fixture tab not found');
        return tab.id;
      }, page.url());
      const result = await extensionPage.evaluate((config) => chrome.runtime.sendMessage({type: 'connect', config}), {...bridge.config, tabId});
      if (result?.error) throw new Error(result.error);
      const deadline = Date.now() + 3000;
      while (!bridge.connected && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
      if (!bridge.connected) throw new Error('Extension handshake failed');
      await page.bringToFront();
    };
    const reset = async (name) => { await page.goto(`${bridge.config.bridge}/fixtures/${name}.html`); await attach(); };
    const cdpEndpoint = cdp ? `http://127.0.0.1:${(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]}` : undefined;
    return {bridge, context, page, extensionPage, sessionFile: session, reset, attach, cdpEndpoint,
      async close() { await context.close(); await bridge.close(); await rm(profile, {recursive: true, force: true}); await rm(session, {force: true}); },
    };
  } catch (e) { await context?.close(); await bridge.close(); await rm(profile, {recursive: true, force: true}); throw e; }
}

export async function fillWithExecutor(harness, task, {single = false, request = (r) => harness.bridge.request(r)} = {}) {
  let observation = await request({op: 'inspect'});
  let rounds = 0, calls = 1, expanded = false;
  const done = new Set();
  const trace = [];
  while (done.size < task.fields.length && rounds++ < task.fields.length + 5) {
    const actions = [], planned = [];
    for (const target of task.fields) {
      if (done.has(target.id)) continue;
      const field = observation.fields.find((f) => f.label === target.label && f.group === target.group && !f.disabled);
      if (!field) continue;
      if (field.kind === 'select' && !field.options.some((o) => o.value === target.value)) continue;
      actions.push({ref: field.ref, op: 'set', value: target.value}); planned.push(target.id);
      if (single) break;
    }
    if (!actions.length && task.name === 'repeat' && !expanded) {
      const add = observation.controls.find((c) => c.label === '添加教育经历');
      if (!add) throw new Error('Expected add-row control');
      actions.push({ref: add.ref, op: 'expand'}); expanded = true;
    }
    if (!actions.length) {
      // Wait for the fixture's documented async option load; also counted in elapsed time.
      await new Promise((r) => setTimeout(r, 80));
      observation = await request({op: 'inspect'}); calls++; continue;
    }
    const result = await request({op: 'fill', snapshot: observation.snapshot, url: observation.url, actions}); calls++;
    for (let i = 0; i < planned.length; i++) if (result.results[i]?.status === 'verified') done.add(planned[i]);
    trace.push({actions: actions.length, results: result.results.map((r) => r.status)});
    observation = result.observation;
  }
  if (done.size !== task.fields.length) throw new Error(`Incomplete: ${done.size}/${task.fields.length}`);
  return {calls, rounds, trace};
}

// Competent scripted baseline: one outer invocation, native Playwright locators,
// independent fields filled in one script; no invented per-action LLM latency.
export async function fillWithPlaywright(page, task) {
  let expanded = false;
  for (const f of task.fields) {
    if (f.group === '教育经历 2' && !expanded) {
      await page.getByRole('button', {name: '添加教育经历', exact: true}).click(); expanded = true;
    }
    const group = page.getByRole('group', {name: f.group, exact: true});
    const locator = group.getByLabel(f.label, {exact: true});
    if (typeof f.value === 'boolean') await locator.setChecked(f.value);
    else if (['degree', 'country', 'city', 'degree-1', 'degree-2'].includes(f.id) && (f.id !== 'city' || task.name === 'dependent')) {
      await locator.selectOption(f.value);
    } else await locator.fill(f.value);
  }
  return {calls: 1, rounds: 1};
}
