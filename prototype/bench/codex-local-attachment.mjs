import assert from 'node:assert/strict';
import {mkdtemp,mkdir,chmod,readFile,writeFile,access,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';import os from 'node:os';
import {appServer,isolatedConfig,beginTurn} from './app-server-driver.mjs';
import {createAttachmentApproval} from './attachment-smoke-guards.mjs';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion} from '../src/browser-companion.mjs';

const args=process.argv.slice(2);if(args.some(a=>!['--model','--preflight'].includes(a))||args.length>1)throw new Error('Use --preflight (no model) or --model (one bounded turn)');
const model=args.includes('--model'),hash=value=>createHash('sha256').update(value).digest('hex');
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
const identity=pid=>({pid,started:execFileSync('ps',['-p',String(pid),'-o','lstart='],{encoding:'utf8'}).trim()});
const privateBase=path.join(projectRoot,'prototype/reports/private');await mkdir(privateBase,{recursive:true,mode:0o700});await chmod(privateBase,0o700);
const root=await mkdtemp(path.join(privateBase,'attachment-'));await chmod(root,0o700);
const cwd=await mkdtemp(path.join(os.tmpdir(),'afa-attachment-cwd-')),tracePath=path.join(root,'mcp.jsonl');
const configPath=path.join(process.env.CODEX_HOME??path.join(os.homedir(),'.codex'),'config.toml'),configBefore=hash(await readFile(configPath));
const sourcePath=path.join(root,'facts.md'),filePath=path.join(root,'fictional.pdf');
const pdf=await readFile(path.join(projectRoot,'prototype/fixtures/pdf/image-facts.pdf'));await writeFile(filePath,pdf,{mode:0o600});await writeFile(sourcePath,'Name: Fictional Candidate',{mode:0o600});
const measuredFiles=['prototype/bench/app-server-driver.mjs','prototype/bench/mcp-observer.mjs','prototype/bench/attachment-smoke-guards.mjs','prototype/bench/codex-local-attachment.mjs','prototype/bench/playwright-backend.mjs','prototype/bench/form-update-tracker.mjs','prototype/fixtures/attachment-form.html'];
for(const dir of ['prototype/src','prototype/extension'])for(const entry of await readdir(path.join(projectRoot,dir),{withFileTypes:true}))if(entry.isFile()&&/\.(mjs|js|py)$/.test(entry.name))measuredFiles.push(`${dir}/${entry.name}`);
const report={kind:'afa-local-attachment-model-v1',mode:model?'model':'preflight',baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8'}).trim(),cli:execFileSync('codex',['--version'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(await Promise.all(measuredFiles.map(async f=>[f,hash(await readFile(path.join(projectRoot,f)))]))),limits:{turns:model?1:0,seconds:180,forwardedToolCalls:12,approvals:1},checks:{},approvals:[]};
let fixture,companion,host,threadId,turnId,owner,cdp,hostId,browserId,sessionConfigPath,completed=false,poll,timer;
const abort=new AbortController(),stop=()=>abort.abort();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
const readTrace=async()=>{try{const text=await readFile(tracePath,'utf8');return text.slice(0,text.lastIndexOf('\n')).split('\n').filter(Boolean).map(JSON.parse);}catch(error){if(error.code==='ENOENT')return [];throw error;}};
const controllerCall=async(endpoint,payload)=>{
 const config=JSON.parse(await readFile(companion.configPath,'utf8'));const response=await fetch(config.endpoint.replace('/request',endpoint),{method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});assert.ok(response.ok);return response.json();
};
const pageState=()=>companion.page.evaluate(async()=>{
 const files=[];
 for(const el of document.querySelectorAll('input[type=file]')){
  const selected=[];
  for(const file of el.files){
   const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
   selected.push({name:file.name,size:file.size,sha256:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')});
  }
  files.push({id:el.id,files:selected});
 }
 return {changes:{...window.attachmentChanges},submits:window.submissionCount,text:document.querySelector('#name').value,files};
});
try{
 fixture=await createBridge({port:0});const url=fixture.config.bridge+'/fixtures/attachment-form.html';
 companion=await createBrowserCompanion({url,sourcePath,attachment:{filePath,label:'Resume/CV',group:'Application'},temporary:true,headless:true,baseDir:root,signal:abort.signal});sessionConfigPath=companion.configPath;
 const registered=await controllerCall('/request',{op:'inspect'}),a=registered.attachments[0];owner={url,attachmentId:a.attachmentId,ref:a.target.ref};assert.equal(a.sha256,hash(pdf));
 report.attachment={attachmentId:a.attachmentId,sha256:a.sha256,bytes:a.bytes,filename:a.filename,ref:a.target.ref,label:a.target.label,group:a.target.group};report.before=await pageState();
 cdp=await companion.context.browser().newBrowserCDPSession();const browsers=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.filter(p=>p.type==='browser');assert.equal(browsers.length,1);browserId=identity(browsers[0].id);
 const approve=createAttachmentApproval();host=await appServer({cwd,logPath:path.join(root,'app-server.jsonl'),onRequest:message=>{
  const result=approve(message,{threadId,turnId,owner});report.approvals.push({threadId,turnId,tool:'form_attach_file',action:'accept',persisted:false});return result;
 }});hostId=identity(host.child.pid);
 const {config}=await host.request('config/read',{cwd,includeLayers:false});
 const overrides={...isolatedConfig(config,{node:process.execPath,proxy:path.join(projectRoot,'prototype/bench/mcp-observer.mjs'),sessionPath:companion.configPath,tracePath}),
  'mcp_servers.afa.env.AFA_MCP_TOOL_LIMIT':'12','features.multi_agent':false,'project_doc_max_bytes':0,model:'gpt-6-astra',model_reasoning_effort:'low'};
 const started=await host.request('thread/start',{cwd,ephemeral:true,sandbox:'read-only',approvalPolicy:'on-request',approvalsReviewer:'user',config:overrides});
 threadId=started.thread.id;report.threadId=threadId;report.model=started.model;report.reasoningEffort=started.reasoningEffort;
 assert.equal(started.thread.ephemeral,true);assert.equal(started.thread.path,null);assert.equal(started.sandbox.type,'readOnly');assert.equal(started.approvalPolicy,'on-request');assert.equal(started.approvalsReviewer,'user');assert.equal(started.model,'gpt-6-astra');assert.equal(started.reasoningEffort,'low');report.checks.ephemeralReadOnly=true;
 await host.waitFor(e=>e.method==='mcpServer/startupStatus/updated'&&e.params.threadId===threadId&&e.params.name==='afa'&&e.params.status==='ready',30000);
 const ready=host.events.filter(e=>e.method==='mcpServer/startupStatus/updated'&&e.params.threadId===threadId&&e.params.status==='ready');assert.deepEqual(ready.map(e=>e.params.name),['afa']);
 const catalog=(await readTrace()).filter(e=>e.kind==='wire'&&e.direction==='response').map(e=>JSON.parse(e.line)).find(e=>e.result?.tools)?.result.tools;
 assert.ok(catalog);assert.deepEqual(catalog.map(t=>t.name).sort(),['form_apply_bindings','form_attach_file','form_context','form_expand','form_reload_source','form_search']);report.checks.onlySixAfaTools=true;
 assert.equal(hash(await readFile(configPath)),configBefore);report.checks.configUnchangedBeforeTurn=true;
 console.log('READY six AFA tools, owner-bound attachment, read-only ephemeral thread, no model request yet');
 if(model){
  const began=Date.now(),deadline=began+180000;
  const interrupted=new Promise((_,reject)=>{
   const fail=message=>{reject(new Error(message));abort.abort();};
   timer=setTimeout(()=>fail('TURN_DEADLINE'),180000);
   poll=setInterval(()=>{void readTrace().then(trace=>{if(trace.some(e=>e.kind==='tool-budget'&&!e.allowed))fail('TOOL_CALL_BUDGET_EXCEEDED');}).catch(error=>fail(error.message));},100);
   abort.signal.addEventListener('abort',()=>reject(new Error('TURN_ABORTED')),{once:true});
  });
  const run=(async()=>{
   const started=await beginTurn(host,{threadId,signal:abort.signal,text:'用户已单独登记一份虚构 PDF，并明确授权当前 localhost 表单的 Application / Resume/CV 正式附件控件。请使用 AFA 的真实上下文将这份已登记附件选入该控件；不要使用简历自动解析或 Cover letter 入口，不改变已有文本，不提交或导航。读取并报告实际文件字节核对结果及当前页面状态。'});turnId=started.turn.id;
   const done=await host.waitFor(e=>e.method==='turn/completed'&&e.params.threadId===threadId&&e.params.turn.id===turnId,Math.max(1,deadline-Date.now()));
   report.turn={id:turnId,status:done.params.turn.status,durationMs:Date.now()-began};assert.equal(done.params.turn.status,'completed');turnId=undefined;
  })();
  await Promise.race([run,interrupted]);clearTimeout(timer);clearInterval(poll);
 }else{
  await host.request('mcpServer/tool/call',{threadId,server:'afa',tool:'form_context',arguments:{}});
  assert.equal(report.approvals.length,0);
 }
 const trace=await readTrace(),starts=trace.filter(e=>e.kind==='start');assert.equal(starts.length,1);assert.ok(!trace.some(e=>e.kind==='exit'));report.identities={appServer:hostId,chromium:browserId,mcp:identity(starts[0].pid),proxy:identity(starts[0].proxyPid),nonce:starts[0].nonce};report.checks.singleMcpBrowser=true;
 const wire=trace.filter(e=>e.kind==='wire').map(e=>({...e,message:JSON.parse(e.line)}));
 report.calls=wire.filter(e=>e.direction==='request'&&e.message.method==='tools/call').map(e=>({id:e.message.id,tool:e.message.params.name,arguments:e.message.params.arguments}));
 report.budget=trace.filter(e=>e.kind==='tool-budget').at(-1);assert.ok(report.budget);assert.ok(report.budget.forwarded<=12&&report.budget.allowed);
 report.after=await pageState();const receipt=await controllerCall('/receipt',{op:'export'});await writeFile(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2),{mode:0o600});
 report.receipt={asOf:receipt.asOf,operation:receipt.operation,attachment:receipt.result.page.attachments[0]};
 if(model){
  const calls=report.calls.filter(c=>c.tool==='form_attach_file');assert.equal(calls.length,1);assert.deepEqual(calls[0].arguments,owner);assert.equal(report.approvals.length,1);
  const response=wire.find(e=>e.direction==='response'&&e.message.id===calls[0].id);assert.ok(response&&!response.message.result.isError);const result=JSON.parse(response.message.result.content[0].text);assert.equal(result.attachment.status,'verified');
  assert.deepEqual(report.after.changes,{autofill:0,resume:1,cover:0});assert.equal(report.after.text,report.before.text);assert.equal(report.after.submits,0);
  assert.deepEqual(report.after.files,[{id:'autofill',files:[]},{id:'resume',files:[{name:'fictional.pdf',size:pdf.length,sha256:hash(pdf)}]},{id:'cover',files:[]}]);
  assert.equal(report.receipt.attachment.attachmentId,owner.attachmentId);assert.equal(report.receipt.attachment.sha256,hash(pdf));assert.equal(report.receipt.attachment.status,'verified');report.checks.modelCalledAttachmentAndOraclePassed=true;
 }else{assert.deepEqual(report.after,report.before);assert.ok(report.calls.every(c=>c.tool==='form_context'));report.checks.preflightNoAttachmentOrModel=true;}
 completed=true;
}catch(error){report.error=error.message.replaceAll(root,'<PRIVATE>').replaceAll(projectRoot,'<REPO>').replaceAll(os.homedir(),'<HOME>');console.error('FAILED:',report.error);}
finally{
 clearTimeout(timer);clearInterval(poll);
 const cleanup=[],clean=async(name,fn)=>{try{await fn();cleanup.push({name,ok:true});}catch(error){cleanup.push({name,ok:false,error:error.code??error.name});}};
 if(turnId&&host)await clean('interrupt',()=>host.request('turn/interrupt',{threadId,turnId},3000));
 await clean('app-server',()=>host?.close());await clean('cdp',()=>cdp?.detach());await clean('companion',()=>companion?.close());await clean('fixture',()=>fixture?.close());await clean('cwd',()=>rm(cwd,{recursive:true,force:true}));
 for(const signal of ['SIGINT','SIGTERM'])process.removeListener(signal,stop);
 const finalTrace=await readTrace(),starts=finalTrace.filter(e=>e.kind==='start');
 report.budget=finalTrace.filter(e=>e.kind==='tool-budget').at(-1)??{attempted:0,forwarded:0,limit:12};
 report.calls=finalTrace.filter(e=>e.kind==='wire'&&e.direction==='request').map(e=>JSON.parse(e.line)).filter(e=>e.method==='tools/call').map(e=>({id:e.id,tool:e.params.name,arguments:e.params.arguments}));
 report.checks.ownedProcessesExited=[hostId?.pid,browserId?.pid,...starts.flatMap(e=>[e.pid,e.proxyPid])].filter(Boolean).every(pid=>!alive(pid));
 report.checks.configUnchangedAfterCleanup=hash(await readFile(configPath))===configBefore;
 for(const [key,target]of [['sessionConfigRemoved',sessionConfigPath],['profileRemoved',companion?.profilePath]])if(target){try{await access(target);report.checks[key]=false;}catch(error){if(error.code!=='ENOENT')throw error;report.checks[key]=true;}}
 report.cleanup=cleanup;report.passed=completed&&Object.values(report.checks).every(Boolean)&&cleanup.every(c=>c.ok);
 const out=path.join(projectRoot,'prototype/reports',`local-attachment-${model?'model':'preflight'}-${Date.now()}.json`);await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,report:path.relative(projectRoot,out),checks:report.checks}));if(!report.passed)process.exitCode=1;
}
