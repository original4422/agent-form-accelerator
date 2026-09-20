// Isolate data transcription, with equal source access for the script baseline.
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHarness} from './harness.mjs';
import {cases,oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {runCodex,parseRun,codexArgs} from './host-driver.mjs';
const h=await createHarness(),cwd=await mkdtemp(path.join(os.tmpdir(),'afa-source-bench-'));
const privateDir=`${projectRoot}/prototype/reports/private`;await mkdir(privateDir,{recursive:true});
const token=randomBytes(32).toString('hex');let source;
await h.context.route('**/*',async(route)=>{
  const url=new URL(route.request().url());
  if(url.origin===h.bridge.config.bridge&&/^\/fixtures\/[a-z0-9-]+\.(html|js|css)$/.test(url.pathname))await route.continue();else await route.abort();
});
const server=http.createServer(async(req,res)=>{
  const reply=(x,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(x));};
  if(req.method!=='POST'||req.url!=='/rpc'||req.headers.origin||req.headers.authorization!==`Bearer ${token}`||!/^127\.0\.0\.1:\d+$/.test(req.headers.host??''))return reply({error:'Forbidden'},403);
  try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw new Error('Too large');}
    const request=JSON.parse(body);if(request.op==='inspect')return reply(await h.bridge.request({op:'inspect'}));
    if(request.op!=='script'||typeof request.code!=='string'||request.code.length>30000)throw new Error('Invalid request');
    const before=await h.bridge.request(request.snapshot?{op:'validate',snapshot:request.snapshot,url:request.url}:{op:'inspect'});
    if(before.url!==request.url)throw new Error('WRONG_PAGE');
    const started=performance.now();let timer;
    try{
      await Promise.race([h.page.evaluate(({code,facts,expansions})=>new Function('facts','expansions',`return (${code})`)(facts,expansions),{code:request.code,facts:source.fields,expansions:source.expansions}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('SCRIPT_TIMEOUT')),8000);})]);
    }finally{clearTimeout(timer);}
    await new Promise((r)=>setTimeout(r,120));
    const observation=await h.bridge.request({op:'inspect'});
    if(observation.documentId!==before.documentId||observation.url!==before.url)throw new Error('PAGE_CHANGED');
    reply({observation,elapsedMs:performance.now()-started});
  }catch(e){reply({error:e.message});}
});
await new Promise((r)=>server.listen(0,'127.0.0.1',r));
const benchSession=path.join(cwd,'script-session.json');
await writeFile(benchSession,JSON.stringify({url:`http://127.0.0.1:${server.address().port}/rpc`,token}),{mode:0o600});
const batchId=Date.now(),rows=[],sourceFile=path.join(cwd,'facts.json');
const save=async()=>{
  const report=JSON.stringify({batchId,date:new Date().toISOString(),scope:'Already-structured and field-mapped fictional JSON source. Same source visible in prompt for all modes. Inline model copies values; reference passes source ID; script receives facts/expansions variables locally. Artifact serialization/write time measured and included in total; resume extraction and unseen-page mapping NOT measured. No mandatory initial/final host inspect. Equal final 120ms observation window. Same Codex defaults and auto-review. All attempts retained.',rows},null,2);
  await writeFile(`${projectRoot}/prototype/reports/codex-sources-${batchId}.json`,report);await writeFile(`${projectRoot}/prototype/reports/codex-sources.json`,report);
};
try{
  const order=[['inline','reference','script'],['reference','script','inline'],['script','inline','reference']];
  const names=process.argv.slice(2).length?process.argv.slice(2):['plain'];
  for(const name of names){
    const task=cases.find((x)=>x.name===name);if(!task)throw new Error('Unknown case');
    for(let repetition=0;repetition<order.length;repetition++)for(const mode of order[repetition]){
      await h.reset(name);
      const preparedAt=performance.now();
      source={id:'candidate',fields:task.fields.map(({group,label,value})=>({group,label,value})),expansions:name==='repeat'?[{label:'添加教育经历',expectGroup:'教育经历 2'}]:[]};
      const bytes=JSON.stringify(source);await writeFile(sourceFile,bytes,{mode:0o600});const preparationMs=performance.now()-preparedAt;
      const tool=mode==='inline'?'form_apply_inline':mode==='reference'?'form_apply_source':'browser_script';
      const script=mode==='script'?`${projectRoot}/prototype/bench/source-script-mcp.mjs`:`${projectRoot}/prototype/src/source-mcp.mjs`;
      const prompt=`Authorized local benchmark on a disposable synthetic form. Fill ONLY the supplied fictional facts using ${tool}; form_inspect is available if needed. Minimize calls: the tool can inspect and act locally. Use returned evidence/observation for final verification; extra inspection is optional. Do not submit, navigate, fetch, use shell, inspect files, or change projects. Source candidate is already provided as a local JSON artifact. Its exact contents are shown below for every mode. Native select values are supplied. Tool descriptions explain whether to copy fields, use a source ID, or reference the facts variable inside a browser script. Report unresolved fields briefly.\nTarget URL: ${h.page.url()}\nSource artifact:\n${bytes}`;
      const args=codexArgs(script,{AFA_SESSION_FILE:h.sessionFile,AFA_SOURCE_FILE:sourceFile,AFA_SOURCE_MODE:mode,AFA_BENCH_SESSION:benchSession});
      console.log(`START ${name} ${repetition+1}/3 ${mode}`);const before=h.bridge.requestCount;
      const r=await runCodex({cwd,args,prompt});const attempt=`${batchId}-${name}-${repetition}-${mode}`;
      await writeFile(`${privateDir}/${attempt}.jsonl`,r.stdout,{mode:0o600});await writeFile(`${privateDir}/${attempt}.stderr.log`,r.stderr,{mode:0o600});
      const check=await oracle(h.page,task),parsed=parseRun(r);
      rows.push({attempt,case:name,repetition,mode,preparationMs,hostElapsedMs:r.elapsedMs,elapsedMs:r.elapsedMs+preparationMs,exitCode:r.exitCode,timedOut:r.timedOut,error:r.error,...check,...parsed,bridgeRequests:h.bridge.requestCount-before,timeline:r.timeline,sourceHash:createHash('sha256').update(bytes).digest('hex')});
      await save();console.log(JSON.stringify({case:name,repetition,mode,seconds:(r.elapsedMs/1000).toFixed(2),calls:parsed.toolCalls.length,passed:check.passed}));
    }
  }
}finally{await save();await new Promise((r)=>server.close(r));await h.close();await rm(cwd,{recursive:true,force:true});}
if(rows.some((r)=>!r.passed||r.exitCode!==0))process.exitCode=1;
