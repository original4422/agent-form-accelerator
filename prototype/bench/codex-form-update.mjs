// Actual Codex + production MCP on a controlled local async fixture. No speed baseline.
import {mkdtemp,writeFile,readFile,readdir,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
import {createFormUpdateFixture} from './form-update-fixture.mjs';
import {createBrowserController} from '../src/browser-controller.mjs';
import {runCodex,codexArgs,parseRun} from './host-driver.mjs';
const batchId=Date.now(),report={batchId,date:new Date().toISOString(),scope:'Actual Codex, local controlled async protocol. Not a live server acceptance or speed comparison.',runs:[]};
const root=await mkdtemp(path.join(os.tmpdir(),'afa-update-host-')),repo=process.cwd(),browser=await chromium.launch({channel:'chromium',headless:true});
const digest=v=>createHash('sha256').update(v).digest('hex'),files=['package-lock.json','prototype/bench/playwright-backend.mjs','prototype/bench/form-update-tracker.mjs','prototype/bench/form-update-fixture.mjs'];
for(const dir of ['prototype/src','prototype/extension'])for(const f of await readdir(dir))if(/\.(js|mjs|py)$/.test(f))files.push(dir+'/'+f);
files.sort();const fingerprints=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,digest(await readFile(f))])));report.before=await fingerprints();
const prompt='Fill the connected local test form with the supplied fictional facts. Respect observed requirements and returned evidence. Use as few calls as necessary. Do not invent missing facts, submit, navigate, use shell/web, or inspect app-specific state. Report incomplete work and any failures. A completed binding plan does not mean the entire application is complete.';
let fixture,controller,page;const abortController=new AbortController(),abort=()=>abortController.abort();for(const s of ['SIGINT','SIGTERM'])process.once(s,abort);
try{
 const sourcePath=path.join(root,'facts.md');await writeFile(sourcePath,'地点：Fictional Place\n姓名：Fictional Name\n');
 for(const mode of ['delayed','new-field','network-failure']){
  if(abortController.signal.aborted)break;console.log('START '+mode);fixture=await createFormUpdateFixture(mode);page=await browser.newPage();await page.goto(fixture.url);controller=await createBrowserController(page);
  const sessionPath=path.join(root,mode+'.json');await writeFile(sessionPath,JSON.stringify({kind:'afa-browser-session-v1',endpoint:controller.endpoint,token:controller.token,sourcePath}),{mode:0o600});
  const run=await runCodex({cwd:root,args:codexArgs(path.join(repo,'prototype/src/browser-bindings-mcp.mjs'),{AFA_BROWSER_SESSION:sessionPath}),prompt,signal:abortController.signal});
  await mkdir('prototype/reports/private',{recursive:true});await writeFile(`prototype/reports/private/${batchId}-update-${mode}.jsonl`,run.stdout,{mode:0o600});await writeFile(`prototype/reports/private/${batchId}-update-${mode}.stderr.log`,run.stderr,{mode:0o600});
  const events=run.stdout.split('\n').flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}}),finalText=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text;
  const actual=await page.evaluate(()=>({first:document.querySelector('#first').value,second:document.querySelector('#second').value,early:window.secondBeforeResponse,firstEvents:window.firstEvents,rendered:!!window.rendered,newFieldValue:document.querySelector('#extra input')?.value}));
  const parsed=parseRun(run),allCalls=parsed.toolCalls,apply=allCalls.filter(c=>c.tool==='form_apply_bindings');
  const checks={process:run.exitCode===0&&!run.timedOut&&!run.aborted,oneWrite:actual.firstEvents===1,noEarlyFollowup:actual.early===false,correctFirst:actual.first==='Fictional Place'};
  if(mode==='delayed')Object.assign(checks,{correctSecond:actual.second==='Fictional Name',rendered:actual.rendered,complete:apply.at(-1)?.complete===true});
  if(mode==='new-field')Object.assign(checks,{changeReturned:apply.some(c=>c.reason==='SERVER_FORM_CHANGED'),missingFactLeftEmpty:actual.newFieldValue==='',missingFactReported:/authorization|authorisation|work.{0,15}eligib|工作许可|工作授权|工作资格/i.test(finalText??'')});
  if(mode==='network-failure')Object.assign(checks,{failureReturned:apply.some(c=>c.reason==='FORM_UPDATE_NETWORK_FAILED'),noFalseComplete:apply.every(c=>c.complete===false),failureReported:/fail|network|blocked|错误|失败|网络|阻止|拦截/i.test(finalText??'')});
  const result={mode,elapsedMs:run.elapsedMs,...parsed,actual,server:fixture.diagnostic(),checks,finalText,promptHash:digest(prompt),sourceHash:digest(await readFile(sourcePath)),passed:Object.values(checks).every(Boolean)};report.runs.push(result);console.log(JSON.stringify(result));
  await controller.close();controller=undefined;await page.close();page=undefined;await fixture.close();fixture=undefined;
 }
 report.after=await fingerprints();report.runtimeUnchanged=JSON.stringify(report.before)===JSON.stringify(report.after);report.passed=report.runs.length===3&&report.runs.every(r=>r.passed)&&report.runtimeUnchanged;if(!report.passed)process.exitCode=1;
}catch(e){report.error=e.stack;process.exitCode=1;console.error(e.message);}
finally{await controller?.close();await page?.close();await fixture?.close();await browser.close();await rm(root,{recursive:true,force:true});for(const s of ['SIGINT','SIGTERM'])process.removeListener(s,abort);await writeFile(`prototype/reports/codex-form-update-${batchId}.json`,JSON.stringify(report,null,2));await writeFile('prototype/reports/codex-form-update.json',JSON.stringify(report,null,2));}
