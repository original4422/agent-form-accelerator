import assert from 'node:assert/strict';
import {mkdtemp,mkdir,chmod,readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';import os from 'node:os';
import {appServer,isolatedConfig,approveFixtureCall} from './app-server-driver.mjs';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion} from '../src/browser-companion.mjs';
import {aliasOracle} from './alias-cases.mjs';
import '../scripts/build-fixtures.mjs';

const model=process.argv.includes('--model');
if(process.argv.slice(2).some(a=>!['--model','--preflight'].includes(a)))throw new Error('Use --preflight (no model) or --model (one two-turn run)');
const hash=value=>createHash('sha256').update(value).digest('hex');
const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
const identity=pid=>({pid,started:execFileSync('ps',['-p',String(pid),'-o','lstart='],{encoding:'utf8'}).trim()});
const privateBase=path.join(projectRoot,'prototype/reports/private');await mkdir(privateBase,{recursive:true,mode:0o700});await chmod(privateBase,0o700);
const root=await mkdtemp(path.join(privateBase,'continuous-'));await chmod(root,0o700);
// The thread cwd lives outside the repo, so no project config layers are inherited.
const cwd=await mkdtemp(path.join(os.tmpdir(),'afa-continuous-cwd-'));
const sourcePath=path.join(root,'facts.md'),tracePath=path.join(root,'mcp.jsonl');
const configPath=path.join(process.env.CODEX_HOME??path.join(os.homedir(),'.codex'),'config.toml');
const configBefore=hash(await readFile(configPath));
const initial=await readFile(path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md'),'utf8');
await writeFile(sourcePath,initial,{mode:0o600});
const measuredFiles=['prototype/bench/app-server-driver.mjs','prototype/bench/mcp-observer.mjs','prototype/bench/codex-continuous-source.mjs','prototype/src/bindings-server.mjs','prototype/src/document-session.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(measuredFiles.map(async f=>[f,hash(await readFile(path.join(projectRoot,f)))])));
const report={sourceHashes,baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8'}).trim(),kind:'afa-continuous-source-v1',mode:model?'model':'preflight',cli:execFileSync('codex',['--version'],{encoding:'utf8'}).trim(),checks:{},turns:[],approvals:[]};
let fixture,companion,host,threadId,turnId,cdp,browserId,hostId,mcpId,sessionConfigPath,oldReceipt,originalState,completed=false;
const abort=new AbortController();const stop=()=>abort.abort();for(const s of ['SIGINT','SIGTERM'])process.on(s,stop);
const readTrace=async()=>{try{return (await readFile(tracePath,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch(e){if(e.code==='ENOENT')return [];throw e;}};
const receipt=async()=>{const c=JSON.parse(await readFile(companion.configPath,'utf8'));const r=await fetch(c.endpoint.replace('/request','/receipt'),{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json'},body:JSON.stringify({op:'export'})});assert.ok(r.ok);return r.json();};
async function observedVersion(){
 let version;
 for(const e of await readTrace())if(e.kind==='wire'&&e.direction==='response'){
  const r=JSON.parse(e.line).result;
  const description=r?.tools?.find(t=>t.name==='form_apply_bindings')?.description;
  if(description)version=JSON.parse(description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]).source.version;
  const content=r?.content?.find(c=>c.type==='text')?.text;
  if(content&&!r.isError){const value=JSON.parse(content);version=value.source?.version??value.sourceVersion??version;}
 }
 return version;
}
async function checkpoint(){
 const starts=(await readTrace()).filter(e=>e.kind==='start');assert.equal(starts.length,1);const current=identity(starts[0].pid);
 if(mcpId)assert.deepEqual(current,mcpId);else mcpId=current;
 assert.deepEqual(identity(host.child.pid),hostId);assert.deepEqual(identity(browserId.pid),browserId);
 assert.equal(await companion.page.evaluate(()=>performance.timeOrigin),report.pageTimeOrigin);
 assert.ok(!(await readTrace()).some(e=>e.kind==='exit'));assert.equal(host.failure,undefined);
 return {appServer:hostId,mcp:mcpId,chromium:browserId,mcpNonce:starts[0].nonce};
}
async function turn(text){
 const began=Date.now(),eventStart=host.events.length;const r=await host.request('turn/start',{threadId,input:[{type:'text',text,text_elements:[]}]});turnId=r.turn.id;
 const onAbort=()=>{void host.request('turn/interrupt',{threadId,turnId}).catch(()=>{});};abort.signal.addEventListener('abort',onAbort,{once:true});
 try{
  const done=await host.waitFor(e=>e.method==='turn/completed'&&e.params.threadId===threadId&&e.params.turn.id===turnId);
  report.turns.push({id:turnId,status:done.params.turn.status,durationMs:Date.now()-began});assert.equal(done.params.turn.status,'completed');
 }finally{abort.signal.removeEventListener('abort',onAbort);}
 turnId=undefined;return host.events.slice(eventStart).filter(e=>e.method==='item/completed'&&e.params?.item?.type==='agentMessage').map(e=>e.params.item.text).join('\n');
}
try{
 fixture=await createBridge({port:0});companion=await createBrowserCompanion({url:fixture.config.bridge+'/fixtures/alias-form.html',sourcePath,temporary:true,headless:true,baseDir:root,signal:abort.signal});
 sessionConfigPath=companion.configPath;
 await companion.page.getByRole('textbox',{name:'Applicant name',exact:true}).waitFor();
 report.pageTimeOrigin=await companion.page.evaluate(()=>performance.timeOrigin);
 cdp=await companion.context.browser().newBrowserCDPSession();const processes=await cdp.send('SystemInfo.getProcessInfo');const browsers=processes.processInfo.filter(p=>p.type==='browser');assert.equal(browsers.length,1);browserId=identity(browsers[0].id);
 host=await appServer({cwd,logPath:path.join(root,'app-server.jsonl'),onRequest:async message=>{
  const result=approveFixtureCall(message,{threadId,turnId,url:fixture.config.bridge+'/fixtures/alias-form.html',sourceVersion:await observedVersion()});
  report.approvals.push({turnId,tool:message.params.message.match(/"([^"]+)"/)[1],action:'accept',persisted:false});return result;
 }});hostId=identity(host.child.pid);
 const {config}=await host.request('config/read',{cwd,includeLayers:false});
 const overrides=isolatedConfig(config,{node:process.execPath,proxy:path.join(projectRoot,'prototype/bench/mcp-observer.mjs'),sessionPath:companion.configPath,tracePath});
 const started=await host.request('thread/start',{cwd,ephemeral:true,sandbox:'read-only',approvalPolicy:'on-request',approvalsReviewer:'user',config:overrides});
 threadId=started.thread.id;report.threadId=threadId;report.model=started.model;report.reasoningEffort=started.reasoningEffort;
 assert.equal(started.thread.ephemeral,true);assert.equal(started.thread.path,null);assert.equal(started.sandbox.type,'readOnly');assert.equal(started.approvalPolicy,'on-request');assert.equal(started.approvalsReviewer,'user');
 report.checks.ephemeralReadOnly=true;
 await host.waitFor(e=>e.method==='mcpServer/startupStatus/updated'&&e.params.threadId===threadId&&e.params.name==='afa'&&e.params.status==='ready',30000);
 const ready=host.events.filter(e=>e.method==='mcpServer/startupStatus/updated'&&e.params.threadId===threadId&&e.params.status==='ready');assert.deepEqual(ready.map(e=>e.params.name),['afa']);
 const catalog=(await readTrace()).filter(e=>e.kind==='wire'&&e.direction==='response').map(e=>JSON.parse(e.line)).find(m=>m.result?.tools)?.result.tools;
 assert.ok(catalog);const toolNames=catalog.map(t=>t.name);assert.equal(toolNames.length,5);assert.ok(toolNames.includes('form_reload_source'));
 report.checks.onlyAfaTools=true;report.toolCount=toolNames.length;assert.equal(hash(await readFile(configPath)),configBefore);report.checks.configUnchangedBeforeTurns=true;
 report.identities=[await checkpoint()];
 console.log('READY ephemeral read-only thread; only 5 AFA tools; global config unchanged; same-process observation ready');
 if(model){
  console.log('TURN 1 start');const firstText=await turn('请仅使用 AFA 工具，根据已提供的虚构资料填写当前 localhost 招聘示例，包含两段教育经历并保留校区限定词。批量处理已知字段；缺少到岗日期就留空并明确报告缺失，不猜日期，不提交、不导航。');
  report.checks.firstTurnReportsMissingDate=/日期/.test(firstText)&&/缺|未提供|未给|未指定|没有/.test(firstText);assert.equal(report.checks.firstTurnReportsMissingDate,true);
  const summary=initial.split('## 个人介绍\n')[1].trim();report.firstOracle=await aliasOracle(companion.page,summary);assert.equal(report.firstOracle.passed,true);
  oldReceipt=await receipt();await writeFile(path.join(root,'first-receipt.json'),JSON.stringify(oldReceipt),{mode:0o600});originalState=await companion.page.evaluate(()=>window.applicationState);
 }else{
  // Exercise the actual app-server->MCP route without model inference.
  const r=await host.request('mcpServer/tool/call',{threadId,server:'afa',tool:'form_context',arguments:{}});
  await writeFile(path.join(root,'preflight-call.json'),JSON.stringify(r),{mode:0o600});oldReceipt=await receipt();
 }
 assert.ok(oldReceipt.source.version);report.identities.push(await checkpoint());
 await writeFile(sourcePath,initial+'\n## 补充\n到岗日期：2030-07-19\n',{mode:0o600});assert.deepEqual(await receipt(),oldReceipt);
 if(model){console.log('TURN 2 start');await turn('我已在原资料文件补充到岗日期。请显式调用 form_reload_source，依据它返回的新 source.version 和条目继续填写缺少的日期；核对已有填写仍保留，不提交、不导航。');}
 else await host.request('mcpServer/tool/call',{threadId,server:'afa',tool:'form_reload_source',arguments:{}});
 report.identities.push(await checkpoint());const latest=await receipt();
 assert.equal(latest.source.generation,2);assert.notEqual(latest.source.version,oldReceipt.source.version);assert.notEqual(latest.source.sha256,oldReceipt.source.sha256);
 report.source={beforeVersion:oldReceipt.source.version,afterVersion:latest.source.version,beforeHash:oldReceipt.source.sha256,afterHash:latest.source.sha256};
 const wire=(await readTrace()).filter(e=>e.kind==='wire').map(e=>({...e,message:JSON.parse(e.line)}));
 const calls=wire.filter(e=>e.direction==='request'&&e.message.method==='tools/call');report.calls=calls.map(e=>({tool:e.message.params.name,sourceVersion:e.message.params.arguments?.sourceVersion}));
 const reload=calls.find(e=>e.message.params.name==='form_reload_source');assert.ok(reload);
 const changes=wire.filter(e=>e.message.method==='notifications/tools/list_changed');report.schemaRefresh={notifications:changes.length,toolsListRequestsAfterNotification:changes.length?wire.filter(e=>e.direction==='request'&&e.message.method==='tools/list'&&e.at>=changes[0].at).length:0};
 if(model){
  const state=await companion.page.evaluate(()=>window.applicationState);assert.deepEqual(state,{...originalState,availableFrom:'2030-07-19'});assert.equal(await companion.page.locator('input[type=date]').inputValue(),'2030-07-19');
  assert.equal(await companion.page.evaluate(()=>window.submissionCount),0);
  const afterReload=calls.filter(e=>e.at>reload.at&&e.message.params.name==='form_apply_bindings');assert.ok(afterReload.length);assert.ok(afterReload.every(e=>e.message.params.arguments.sourceVersion===latest.source.version));
  assert.deepEqual(JSON.parse(await readFile(path.join(root,'first-receipt.json'),'utf8')),oldReceipt);report.checks.firstReceiptImmutable=true;report.checks.dateAndPreviousFieldsCorrect=true;report.checks.newVersionApplied=true;
 }
 report.checks.continuousMcpBrowser=true;completed=true;
}catch(error){report.error=error.message.replaceAll(root,'<PRIVATE>').replaceAll(projectRoot,'<REPO>').replaceAll(os.homedir(),'<HOME>');console.error('FAILED:',report.error);}
finally{
 const cleanup=[];const clean=async(name,fn)=>{try{await fn();cleanup.push({name,ok:true});}catch(e){cleanup.push({name,ok:false,error:e.code??e.name});}};
 if(turnId&&host)await clean('interrupt',()=>host.request('turn/interrupt',{threadId,turnId},5000));
 await clean('app-server',()=>host?.close());await clean('cdp',()=>cdp?.detach());await clean('companion',()=>companion?.close());await clean('fixture',()=>fixture?.close());
 const {rm}=await import('node:fs/promises');await clean('temporary-cwd',()=>rm(cwd,{recursive:true,force:true}));
 for(const s of ['SIGINT','SIGTERM'])process.removeListener(s,stop);
 const starts=(await readTrace()).filter(e=>e.kind==='start');report.checks.ownedProcessesExited=[hostId?.pid,browserId?.pid,...starts.flatMap(e=>[e.pid,e.proxyPid])].filter(Boolean).every(pid=>!alive(pid));
 report.checks.configUnchangedAfterCleanup=hash(await readFile(configPath))===configBefore;
 if(companion){try{await access(sessionConfigPath);report.checks.sessionConfigRemoved=false;}catch(e){if(e.code!=='ENOENT')throw e;report.checks.sessionConfigRemoved=true;}try{await access(companion.profilePath);report.checks.profileRemoved=false;}catch(e){if(e.code!=='ENOENT')throw e;report.checks.profileRemoved=true;}}
 report.cleanup=cleanup;report.passed=completed&&Object.values(report.checks).every(Boolean)&&cleanup.every(c=>c.ok);
 const out=path.join(projectRoot,'prototype/reports',`continuous-source-${model?'model':'preflight'}-${Date.now()}.json`);await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,report:path.relative(projectRoot,out),checks:report.checks,schemaRefresh:report.schemaRefresh}));
 if(!report.passed)process.exitCode=1;
}
