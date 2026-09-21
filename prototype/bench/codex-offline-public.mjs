import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createOfflinePublicHarness} from './offline-public-harness.mjs';
import {serveOfflinePage} from './offline-public-bridge.mjs';
import {runCodex,parseRun,codexArgs} from './host-driver.mjs';
import {PUBLIC_URL,publicOracle} from './offline-public-cases.mjs';
import {parseDocument} from '../src/document-source.mjs';
import {projectRoot} from '../src/bridge.mjs';
const cwd=await mkdtemp(path.join(os.tmpdir(),'afa-public-host-')),sourcePath=`${projectRoot}/prototype/fixtures/documents/public-candidate.md`,source=parseDocument(await readFile(sourcePath,'utf8'));
const script=`${projectRoot}/prototype/bench/offline-public-bindings-mcp.mjs`,batchId=Date.now(),rows=[],controller=new AbortController();
for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>controller.abort());
const privateDir=`${projectRoot}/prototype/reports/private`;await mkdir(privateDir,{recursive:true});
const save=async()=>{const data={batchId,date:new Date().toISOString(),aborted:controller.signal.aborted,scope:'Real public Lever page loaded in disposable browser with read-only traffic, then offline before fictional input. Internal full-vs-projected-context comparison; same observer, executor, source, prompt, verification. Browser/public load and metadata-only preflight excluded; CLI/model/MCP/tools/recovery/exit included. Not server acceptance or complete real application: location and resume remain unresolved. No personal profile, application upload or submission.',rows};await writeFile(`prototype/reports/codex-offline-public-${batchId}.json`,JSON.stringify(data,null,2));await writeFile('prototype/reports/codex-offline-public.json',JSON.stringify(data,null,2));};
try{
 runs:for(let repetition=0;repetition<Number(process.env.AFA_REPEATS??1);repetition++)for(const mode of (process.env.AFA_PUBLIC_MODES?.split(',')??(repetition%2?['compact','full']:['full','compact']))){
  if(!['full','compact'].includes(mode))throw new Error('INVALID_MODE');if(controller.signal.aborted)break runs;
  let h,bridge;
  try{
   h=await createOfflinePublicHarness(PUBLIC_URL);bridge=await serveOfflinePage(h);const configFile=path.join(cwd,'controller.json');await writeFile(configFile,JSON.stringify(bridge.config),{mode:0o600});
   const env={AFA_DOCUMENT_FILE:sourcePath,AFA_OFFLINE_CONFIG:configFile,AFA_OPTIONS_MODE:mode};
   const client=new Client({name:'offline-public-preflight',version:'0.0.1'});let preflight;
   try{
    await client.connect(new StdioClientTransport({command:process.execPath,args:[script],env:{...process.env,...env},stderr:'pipe'}));
    const listed=await client.listTools(),apply=listed.tools.find(t=>t.name==='form_apply_bindings'),c=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
    assert.equal(listed.tools.length,4);assert.equal(c.page.url,PUBLIC_URL);assert.ok(c.page.fields.some(f=>f.label.startsWith('Preferred Name')));
    const big=c.page.fields.find(f=>f.label.startsWith('Which university'));assert.ok(big.options.some(o=>o.label==='Tsinghua University'));
    if(mode==='compact')assert.ok(big.optionCount>3000&&big.options.length<40);else assert.ok(big.options.length>3000);
    preflight={passed:true,tools:4,sourceEntries:c.source.entries.length,fields:c.page.fields.length,contextBytes:Buffer.byteLength(JSON.stringify(c)),schoolOptionsShown:big.options.length};
   }finally{await client.close();}
   const prompt=`Fill every source-supported field in the connected disposable browser using the supplied unmapped fictional Markdown profile. This is a network-isolated local dry run of an already-loaded public form: a controller blocks ALL network traffic before input, so no application can be sent. Context is prefetched. Match facts by meaning, including grouped choices; use source references without rewriting paragraphs. A large option list may be projected: source-exact candidates are actual observed values, not semantic recommendations, and form_search can discover omitted options. Batch known bindings. Do not guess missing facts, consent preferences, or conditional answers. Do not submit, navigate, upload files, use shell/web, or inspect application-specific state. A writing call returns read-back evidence; no extra inspection is needed if sufficient. Report unresolved required information and unsupported attachments. complete only covers requested targets. Existing location lookup and resume upload cannot be certified offline. Intended page: ${PUBLIC_URL}`;
   console.log(`START ${repetition+1} ${mode} context=${preflight.contextBytes}`);
   const r=await runCodex({cwd,args:codexArgs(script,env),prompt,signal:controller.signal});const attempt=`${batchId}-${repetition}-public-${mode}`;
   await writeFile(`${privateDir}/${attempt}.jsonl`,r.stdout,{mode:0o600});await writeFile(`${privateDir}/${attempt}.stderr.log`,r.stderr,{mode:0o600});
   const oracle=await publicOracle(h.page,source).catch(e=>({passed:false,errors:[e.message]}));
   const events=r.stdout.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}}),finalText=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text;
   rows.push({attempt,repetition,mode,preflight,elapsedMs:r.elapsedMs,exitCode:r.exitCode,timedOut:r.timedOut,aborted:r.aborted,...oracle,guard:h.guard(),finalText,...parseRun(r),timeline:r.timeline});
   await save();console.log(JSON.stringify({mode,seconds:r.elapsedMs/1000,passed:oracle.passed,errors:oracle.errors,calls:rows.at(-1).toolCalls.length,submits:oracle.submitAttempts}));
   if(controller.signal.aborted)break runs;
  }finally{await bridge?.close();await h?.close();}
 }
}finally{await save();await rm(cwd,{recursive:true,force:true});}
if(controller.signal.aborted||rows.some(r=>!r.passed||r.exitCode!==0||r.submitAttempts))process.exitCode=1;
