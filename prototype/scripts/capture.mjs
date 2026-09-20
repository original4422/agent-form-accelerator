import path from 'node:path';
import {createHarness, fillWithExecutor} from '../bench/harness.mjs';
import {cases} from '../bench/cases.mjs';
import {projectRoot} from '../src/bridge.mjs';
const h = await createHarness();
try {
  await h.reset('plain'); await fillWithExecutor(h, cases[0]);
  await h.page.screenshot({path: path.join(projectRoot, 'prototype/reports/demo-filled.png'), fullPage: true});
  console.log('Saved prototype/reports/demo-filled.png');
} finally { await h.close(); }
