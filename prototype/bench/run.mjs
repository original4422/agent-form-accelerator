import {writeFile, mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHarness, fillWithExecutor, fillWithPlaywright} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';

const repeats = Number(process.env.AFA_REPEATS || 5);
if (!Number.isInteger(repeats) || repeats < 3) throw new Error('Use at least 3 repeats');
const harness = await createHarness();
const rows = [];
const modes = ['single-field-control', 'playwright-batch-script', 'extension-batch'];
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
try {
  // Warm up each implementation; discard all warm-up measurements.
  for (const mode of modes) {
    await harness.reset('plain');
    if (mode === 'playwright-batch-script') await fillWithPlaywright(harness.page, cases[0]);
    else await fillWithExecutor(harness, cases[0], {single: mode === 'single-field-control'});
  }
  for (const task of cases) for (let repeat = 0; repeat < repeats; repeat++) {
    // Counterbalance order; no fixed winner always runs last.
    const order = modes.slice(repeat % modes.length).concat(modes.slice(0, repeat % modes.length));
    for (const mode of order) {
      await harness.reset(task.name);
      const started = performance.now();
      let run = {}, error;
      try {
        run = mode === 'playwright-batch-script' ? await fillWithPlaywright(harness.page, task) :
          await fillWithExecutor(harness, task, {single: mode === 'single-field-control'});
      } catch (e) { error = e.message; }
      // Independent application-state check is inside the timed boundary for every mode.
      const check = await oracle(harness.page, task);
      const elapsedMs = performance.now() - started;
      const row = {case: task.name, mode, repeat, elapsedMs, ...run, ...check, error}; rows.push(row);
      console.log(`${task.name} / ${mode} / ${repeat + 1}: ${elapsedMs.toFixed(1)} ms, ${check.correct}/${check.total}${error ? ` ERROR ${error}` : ''}`);
    }
  }
  const summary = cases.map((task) => {
    const byMode = Object.fromEntries(modes.map((mode) => {
      const group = rows.filter((r) => r.case === task.name && r.mode === mode);
      return [mode, {medianMs: median(group.map((r) => r.elapsedMs)), passed: group.filter((r) => r.passed && !r.error).length, runs: group.length}];
    }));
    return {case: task.name, ...byMode,
      speedupVsScriptedBatch: byMode['playwright-batch-script'].medianMs / byMode['extension-batch'].medianMs,
      speedupVsSingleField: byMode['single-field-control'].medianMs / byMode['extension-batch'].medianMs};
  });
  const report = {date: new Date().toISOString(), environment: {node: process.version, platform: os.platform(), arch: os.arch(), browser: harness.context.browser()?.version(), playwright: JSON.parse(await readFile(path.join(projectRoot, 'node_modules/playwright/package.json'))).version},
    scope: 'Executor-only local synthetic benchmark. Pre-resolved field/value mappings. No LLM calls, no real recruitment site, no native Codex/Claude browser benchmark. No artificial model latency.',
    timing: 'After page load and extension connection, before inspection/execution, through independent application-state verification. Excludes setup, mapping/LLM time and browser start.',
    repeats, summary, rows};
  const output = path.join(projectRoot, 'prototype/reports'); await mkdir(output, {recursive: true});
  await writeFile(path.join(output, 'executor-benchmark.json'), JSON.stringify(report, null, 2));
  const lines = ['# 本地执行层验证', '', `运行时间：${report.date}`, '',
    '> 仅测执行层。使用预先确定的字段映射和虚构资料，不包含 LLM 思考、真实招聘页或两端原生浏览器工具。不能据此宣称完整 Agent 提速。', '',
    '| 场景 | 逐字段对照 ms | Playwright 单脚本批量 ms | 扩展批量 ms | 相对批量脚本速度比 | 扩展正确运行 |',
    '|---|---:|---:|---:|---:|---:|',
    ...summary.map((s) => `| ${s.case} | ${s['single-field-control'].medianMs.toFixed(1)} | ${s['playwright-batch-script'].medianMs.toFixed(1)} | ${s['extension-batch'].medianMs.toFixed(1)} | ${s.speedupVsScriptedBatch.toFixed(2)}× | ${s['extension-batch'].passed}/${repeats} |`), '',
    '逐字段对照仅展示调用合并的上限收益，不是实际 Agent 基线。Playwright 单脚本批量是较强的工程基线，也不等于 Claude browser_batch。', '',
    '计时包括页面观察/执行/等待与独立页面状态核验；不含启动浏览器、连接扩展和预先提供字段映射的时间。每种实现预热一次，各场景交替顺序运行，所有失败保留在 JSON。', '',
    `环境：Node ${report.environment.node}，Playwright ${report.environment.playwright}，Chromium ${report.environment.browser}，${report.environment.platform}/${report.environment.arch}。`, '',
    '完整产品门槛（两端各三类真实任务、正确率不降、端到端中位耗时减半）尚未验证。', ''];
  await writeFile(path.join(output, 'executor-benchmark.md'), lines.join('\n'));
  if (rows.some((r) => !r.passed || r.error)) process.exitCode = 1;
} finally { await harness.close(); }
