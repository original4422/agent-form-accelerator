import {mkdtemp,writeFile,mkdir,rm,readFile,readdir} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {createBridge,projectRoot} from '../src/bridge.mjs';import {createBrowserCompanion} from '../src/browser-companion.mjs';import {readDocumentSource} from '../src/source-reader.mjs';import {runCodex,codexArgs,parseRun} from './host-driver.mjs';import {aliasOracle} from './alias-cases.mjs';import '../scripts/build-fixtures.mjs';import {companionVariantsContext} from './companion-variants-check.mjs';
if(process.env.AFA_PDF_SOURCE!=='1'||!process.env.AFA_PYTHON)throw new Error('Set explicit PDF experiment and Python interpreter');
const root=await mkdtemp(path.join(os.tmpdir(),'afa-companion-variants-host-')),fixture=await createBridge({port:0}),batchId=Date.now(),report={batchId,date:new Date().toISOString(),scope:'Four Codex companion integration runs, PDF A single/variants then identical-visible PDF B variants/single. Same prompt and normalization of source/page context within each pair; full latency includes all model recovery. This is a small internal comparison on the same synthetic task, not independent real application speed evidence.',runs:[]};let app;
const variants=process.env.AFA_PROBE_VARIANT?[process.env.AFA_PROBE_VARIANT]:['two-columns','reverse-draw-order'];
if(variants.some(v=>!['two-columns','reverse-draw-order'].includes(v)))throw new Error('Unknown probe variant');
report.variants=variants;if(variants.length===1)report.scope='One paired Codex companion probe after a shared tool-guidance change; same source/context/prompt with optional query variants enabled/disabled. Hypothesis check, not stable speed evidence.';
const controller=new AbortController(),abort=()=>controller.abort();for(const s of ['SIGINT','SIGTERM'])process.once(s,abort);
const files=['package.json','package-lock.json','prototype/requirements-pdf.txt','prototype/bench/playwright-backend.mjs'];
for(const dir of ['prototype/src','prototype/extension','prototype/fixtures'])for(const file of await readdir(path.join(projectRoot,dir),{recursive:true}))if(/\.(mjs|js|py|html|md|pdf)$/.test(file))files.push(dir+'/'+file);
files.sort();const fingerprints=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(path.join(projectRoot,file))).digest('hex')])));report.before=await fingerprints();

try{
 for(const variant of variants)for(const enabled of (variant==='two-columns'?[false,true]:[true,false])){
  if(controller.signal.aborted)break;
  console.log('START '+variant+' '+(enabled?'variants':'single'));
  const started=performance.now(),sourcePath=path.join(projectRoot,`prototype/fixtures/pdf/${variant}.pdf`),s=await readDocumentSource(sourcePath),extractionMs=performance.now()-started;
  app=await createBrowserCompanion({url:`${fixture.config.bridge}/fixtures/alias-form.html`,sourcePath,temporary:true,headless:true,baseDir:root,signal:controller.signal});await app.page.waitForSelector('[role=combobox]');await app.context.route('**/*',r=>r.request().url().startsWith(fixture.config.bridge+'/')?r.continue():r.abort());
  const preflight=await companionVariantsContext(app,{enabled,pdf:true});
  const setupMs=performance.now()-started;
  const prompt='Fill the connected local fictional application using the supplied PDF source. Include both education experiences in order and preserve campus qualifiers. Include the complete personal introduction from its source passage. Use observed form refs and source-backed bindings. Make as few tool calls as necessary while checking returned evidence and coverage. Do not submit, upload, navigate, use shell/web, or inspect application-specific state. Report missing required information and any facts you cannot copy faithfully; never invent facts. complete is only for requested targets.';
  const r=await runCodex({cwd:root,args:codexArgs(`${projectRoot}/prototype/src/browser-bindings-mcp.mjs`,{AFA_BROWSER_SESSION:app.configPath,AFA_PDF_SOURCE:'1',AFA_PYTHON:process.env.AFA_PYTHON,AFA_QUERY_VARIANTS:enabled?'1':'0'}),prompt,signal:controller.signal});
  const privateDir=path.join(projectRoot,'prototype/reports/private');await mkdir(privateDir,{recursive:true});await writeFile(path.join(privateDir,`${batchId}-companion-variants-${variant}-${enabled}.jsonl`),r.stdout,{mode:0o600});await writeFile(path.join(privateDir,`${batchId}-companion-variants-${variant}-${enabled}.stderr.log`),r.stderr,{mode:0o600});
  const events=r.stdout.split('\n').flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}}),finalText=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text;
  if(r.aborted){report.runs.push({variant,enabled,aborted:true,exitCode:r.exitCode,elapsedMs:r.elapsedMs,...parseRun(r),passed:false});await app.close();app=undefined;break;}
  // Independent expected data: not imported by the provider/extractor.
  const intro='我参与过虚构的校园资料整理项目，负责检查字段含义与数据格式。\n这份资料中的人物、学校与经历仅用于本地测试。';
  const oracle=await aliasOracle(app.page,intro),missingReported=/到岗|入职|available.*start|start date/i.test(finalText??'');
  const calls=events.filter(e=>e.type==='item.completed'&&e.item?.type==='mcp_tool_call').map(e=>({tool:e.item.tool,arguments:e.item.arguments}));
  const searchLog=await app.page.evaluate(()=>window.searchRequests);
  const run={variant,enabled,preflight,calls,searchLog,promptHash:createHash('sha256').update(prompt).digest('hex'),sourceHash:s.sha256,entries:s.entries.length,extractionMs,setupMs,elapsedMs:r.elapsedMs,totalMs:performance.now()-started,exitCode:r.exitCode,timedOut:r.timedOut,aborted:r.aborted,...parseRun(r),oracle,missingReported,finalText};run.passed=oracle.passed&&missingReported&&r.exitCode===0&&!r.timedOut&&!r.aborted;report.runs.push(run);await writeFile(`prototype/reports/codex-companion-variants-${batchId}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({variant,enabled,seconds:run.elapsedMs/1000,calls:run.toolCalls.length,passed:run.passed}));await app.close();app=undefined;if(controller.signal.aborted)break;
 }
 report.after=await fingerprints();report.runtimeUnchanged=JSON.stringify(report.before)===JSON.stringify(report.after);report.passed=report.runs.length===variants.length*2&&report.runs.every(r=>r.passed)&&report.runtimeUnchanged;if(!report.passed)process.exitCode=1;
} catch(e){report.error=e.stack;report.passed=false;process.exitCode=1;console.error(e.message);}
finally{await app?.close();await fixture.close();await rm(root,{recursive:true,force:true});for(const s of ['SIGINT','SIGTERM'])process.removeListener(s,abort);await writeFile(`prototype/reports/codex-companion-variants-${batchId}.json`,JSON.stringify(report,null,2));await writeFile('prototype/reports/codex-companion-variants.json',JSON.stringify(report,null,2));}
