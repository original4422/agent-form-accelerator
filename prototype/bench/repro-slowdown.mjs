// A small red-capable reproducer: fail when the repeated-section executor is slower.
import assert from 'node:assert/strict';
import {createHarness, fillWithExecutor, fillWithPlaywright} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
const h = await createHarness();
const task = process.argv.includes('--minimal') ? {...cases[0], fields: cases[0].fields.slice(0, 1)} : cases.find((c) => c.name === 'repeat');
const measurements = {script: [], executor: []};
try {
  for (let i = 0; i < 4; i++) for (const mode of i % 2 ? ['executor', 'script'] : ['script', 'executor']) {
    await h.reset(task.name);
    const start = performance.now();
    if (mode === 'script') await fillWithPlaywright(h.page, task); else await fillWithExecutor(h, task);
    assert.equal((await oracle(h.page, task)).passed, true, 'The speed comparison requires correct results');
    if (i) measurements[mode].push(performance.now() - start);
  }
  const median = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const scriptMs = median(measurements.script), executorMs = median(measurements.executor);
  console.log(JSON.stringify({case: task.name, scriptMs, executorMs, ratio: executorMs / scriptMs}, null, 2));
  assert.ok(executorMs <= scriptMs, 'Reproduced: executor is slower than scripted batching');
} finally { await h.close(); }
