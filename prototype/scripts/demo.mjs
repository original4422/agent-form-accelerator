import path from 'node:path';
import {createHarness} from '../bench/harness.mjs';
import {projectRoot} from '../src/bridge.mjs';

const harness = await createHarness({headless: false, port: Number(process.env.AFA_PORT || 43187),
  sessionFile: path.join(projectRoot, '.runtime/session.json')});
await harness.reset('plain');
console.log(`Prototype browser ready at ${harness.page.url()}\nThe extension is connected to this isolated, synthetic-data browser.\nMCP command: node ${path.join(projectRoot, 'prototype/src/mcp.mjs')}\nPress Ctrl+C to close the demo.`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await harness.close(); process.exit(0); });
await new Promise((resolve) => harness.context.on('close', resolve));
