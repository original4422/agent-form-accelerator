import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion} from '../src/browser-companion.mjs';
import {runCodex,codexArgs,parseRun} from './host-driver.mjs';
import {aliasOracle} from './alias-cases.mjs';
import {parseDocument} from '../src/document-source.mjs';
import {readFile} from 'node:fs/promises';
import '../scripts/build-fixtures.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'afa-companion-host-')),fixture=await createBridge({port:0}),batchId=Date.now();
const sourcePath=path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md');
const source=parseDocument(await readFile(sourcePath,'utf8')),controller=new AbortController(),abort=()=>controller.abort();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,abort);
let app;const report={batchId,date:new Date().toISOString(),scope:'One actual Codex integration task through the user-facing browser companion and its real local authenticated MCP provider. Local fictional alias/campus form, two education rows, ten source-backed targets, missing date left unresolved, no submits. Integration correctness only, not a speed comparison or real application validation.'};
try {
  app=await createBrowserCompanion({url:`${fixture.config.bridge}/fixtures/alias-form.html`,sourcePath,temporary:true,headless:true,baseDir:root,signal:controller.signal});
  await app.page.waitForSelector('[role=combobox]');
  await app.context.route('**/*',r=>r.request().url().startsWith(fixture.config.bridge+'/')?r.continue():r.abort());
  const prompt='Fill the connected local fictional application using the supplied Markdown source. Include both education experiences in order and preserve campus qualifiers. Use source references and observed form refs. Conditional searches can express source-backed intended names; never guess missing facts or weaken an ambiguous qualifier. Use the observed repeat template when appropriate. Make as few tool calls as necessary while checking returned evidence and coverage. Do not submit, upload, navigate, use shell/web, or inspect application-specific state. Report missing required information; complete is only for requested targets.';
  const r=await runCodex({cwd:root,args:codexArgs(`${projectRoot}/prototype/src/browser-bindings-mcp.mjs`,{AFA_BROWSER_SESSION:app.configPath}),prompt,signal:controller.signal});
  const privateDir=path.join(projectRoot,'prototype/reports/private');await mkdir(privateDir,{recursive:true});
  await writeFile(path.join(privateDir,`${batchId}-companion.jsonl`),r.stdout,{mode:0o600});await writeFile(path.join(privateDir,`${batchId}-companion.stderr.log`),r.stderr,{mode:0o600});
  const events=r.stdout.split('\n').flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}});
  const finalText=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text;
  const oracle=await aliasOracle(app.page,source.entries.find(e=>e.label==='个人介绍').value);
  const missingReported=/到岗|入职|available.*start|start date/i.test(finalText??'');
  Object.assign(report,{elapsedMs:r.elapsedMs,exitCode:r.exitCode,timedOut:r.timedOut,aborted:r.aborted,...parseRun(r),oracle,missingReported,finalText});
  report.passed=oracle.passed&&missingReported&&r.exitCode===0&&!r.timedOut&&!r.aborted;
  console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}catch(e){report.error=e.stack;report.passed=false;process.exitCode=1;console.error(e.message);}
finally {
  await app?.close();await fixture.close();await rm(root,{recursive:true,force:true});
  for(const signal of ['SIGINT','SIGTERM'])process.removeListener(signal,abort);
  await writeFile(`prototype/reports/codex-companion-${batchId}.json`,JSON.stringify(report,null,2));await writeFile('prototype/reports/codex-companion.json',JSON.stringify(report,null,2));
}
