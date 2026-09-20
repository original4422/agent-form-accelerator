// Controlled ablations. Unsafe wait removal exists ONLY in a disposable extension.
import {readFile, writeFile, mkdtemp, cp, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createHarness, fillWithExecutor, fillWithPlaywright} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';

const original = await readFile(path.join(projectRoot, 'prototype/extension/form-runtime.js'), 'utf8');
let instrumented = original;
const replace = (from, to) => {
  assert.equal(instrumented.split(from).length, 2, `Instrumentation anchor must occur exactly once: ${from.slice(0, 60)}`);
  instrumented = instrumented.replace(from, to);
};
replace('const started = performance.now();', `const started = performance.now();
  const diagnostic = {waitCalls: 0, waitMs: 0, observeMs: 0};
  const waitMode = request.diagnosticWaitMode || 'original';`);
replace('const observe = () => {', 'const observe = () => { const observationStart = performance.now();');
replace('return {snapshot: state.snapshot, documentId:', 'const observation = {snapshot: state.snapshot, documentId:');
replace("shadowRoots: Array.from(document.querySelectorAll('*')).some((el) => !!el.shadowRoot)},\n    };", "shadowRoots: Array.from(document.querySelectorAll('*')).some((el) => !!el.shadowRoot)},\n    };\n    diagnostic.observeMs += performance.now() - observationStart; return observation;");
replace('const settle = async (root = document.documentElement) => {', `const settle = async (root = document.documentElement, reason = 'intermediate') => {
    if (waitMode === 'none' || (waitMode === 'final-only' && reason !== 'final')) return true;
    const waitStart = performance.now(); diagnostic.waitCalls++;`);
replace('observer.disconnect();\n    return stable;', 'observer.disconnect();\n    diagnostic.waitMs += performance.now() - waitStart; return stable;');
replace('const settled = await settle();', "const settled = await settle(document.documentElement, 'final');");
replace('return {...observe(), elapsedMs: performance.now() - started};', 'return {...observe(), elapsedMs: performance.now() - started, diagnostic};');
replace('return {results, settled, observation, elapsedMs: performance.now() - started,', 'return {results, settled, observation, elapsedMs: performance.now() - started, diagnostic,');
const runtime = new Function(`return (${instrumented.replace('export async function', 'async function')})`)();
const temp = await mkdtemp(path.join(os.tmpdir(), 'afa-diagnostic-extension-'));
await cp(path.join(projectRoot, 'prototype/extension'), temp, {recursive: true});
await writeFile(path.join(temp, 'form-runtime.js'), instrumented);
const h = await createHarness({extensionDirectory: temp});
const modes = ['playwright-script', 'playwright-with-observations', 'extension-original', 'extension-final-only', 'extension-no-waits', 'direct-original', 'direct-no-waits'];
const rows = [], counterexamples = [];
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
try {
  for (const task of cases) for (let repeat = 0; repeat < 6; repeat++) {
    const order = modes.slice(repeat % modes.length).concat(modes.slice(0, repeat % modes.length));
    for (const mode of order) {
      await h.reset(task.name);
      let waitMs = 0, waitCalls = 0, observeMs = 0, inPageMs = 0, callWallMs = 0, bytesReturned = 0, calls = 0;
      const request = async (payload) => {
        calls++;
        const start = performance.now();
        const request = {...payload, diagnosticWaitMode: mode.includes('no-waits') ? 'none' : mode.includes('final-only') ? 'final-only' : 'original'};
        const result = mode.startsWith('direct') ? await h.page.evaluate(runtime, request) : await h.bridge.request(request);
        callWallMs += performance.now() - start;
        if (result.error) throw new Error(result.error);
        waitMs += result.diagnostic.waitMs; waitCalls += result.diagnostic.waitCalls;
        observeMs += result.diagnostic.observeMs; inPageMs += result.elapsedMs;
        bytesReturned += Buffer.byteLength(JSON.stringify(result));
        return result;
      };
      const start = performance.now();
      let error, trace;
      try {
        if (mode.startsWith('playwright')) {
          if (mode === 'playwright-with-observations') await h.page.evaluate(runtime, {op: 'inspect'});
          await fillWithPlaywright(h.page, task);
          if (mode === 'playwright-with-observations') await h.page.evaluate(runtime, {op: 'inspect'});
        } else trace = await fillWithExecutor(h, task, {request});
      } catch (e) { error = e.message; }
      const check = await oracle(h.page, task);
      const elapsedMs = performance.now() - start;
      if (repeat) rows.push({case: task.name, mode, repeat, elapsedMs, waitMs, waitCalls, observeMs,
        inPageMs, callWallMs, transportResidualMs: callWallMs - inPageMs,
        driverAndOracleMs: elapsedMs - callWallMs, bytesReturned, calls, check, error, trace});
    }
    if (repeat) console.log(`Measured ${task.name}, repetition ${repeat}/5`);
  }
  // Show why deleting waits is a diagnostic ceiling, not a correctness-preserving fix.
  for (const delayMs of [10, 100]) for (const waitMode of ['original', 'none']) {
    await h.reset('plain');
    await h.page.locator('#name').evaluate((el, delay) => {
      el.addEventListener('change', () => setTimeout(() => {
        el.value = ''; window.applicationState.name = '';
      }, delay));
    }, delayMs);
    const o = await h.bridge.request({op: 'inspect'});
    const field = o.fields.find((f) => f.label === '姓名');
    const result = await h.bridge.request({op: 'fill', snapshot: o.snapshot, url: o.url,
      diagnosticWaitMode: waitMode, actions: [{ref: field.ref, op: 'set', value: '林示例'}]});
    await h.page.waitForTimeout(150);
    const check = await oracle(h.page, {...cases[0], fields: cases[0].fields.slice(0, 1)});
    counterexamples.push({delayMs, waitMode, reportedComplete: result.complete, lateCheckPassed: check.passed});
  }
  const summary = cases.flatMap((task) => modes.map((mode) => {
    const group = rows.filter((r) => r.case === task.name && r.mode === mode);
    return {case: task.name, mode, passed: group.filter((r) => r.check.passed && !r.error).length,
      ...Object.fromEntries(['elapsedMs', 'waitMs', 'waitCalls', 'observeMs', 'inPageMs', 'transportResidualMs', 'driverAndOracleMs', 'bytesReturned', 'calls'].map((k) => [k, median(group.map((r) => r[k]))]))};
  }));
  const report = {date: new Date().toISOString(), sourceHash: createHash('sha256').update(original).digest('hex'),
    scope: 'Synthetic executor ablations, no LLM. Diagnostic wait removal never applied to the actual runtime. Node wall-clock and page durations are independently measured; residuals are not a packet-level transport profile.',
    summary, counterexamples, rows};
  await writeFile(path.join(projectRoot, 'prototype/reports/diagnosis-ablation.json'), JSON.stringify(report, null, 2));
  console.table(summary.map(({case: c, mode, elapsedMs, waitMs, transportResidualMs, calls, passed}) => ({case: c, mode, ms: elapsedMs.toFixed(1), wait: waitMs.toFixed(1), residual: transportResidualMs.toFixed(1), calls, passed})));
  console.table(counterexamples);
  assert.ok(rows.every((r) => r.check.passed && !r.error), 'All comparison runs must remain correct');
} finally { await h.close(); await rm(temp, {recursive: true, force: true}); }
