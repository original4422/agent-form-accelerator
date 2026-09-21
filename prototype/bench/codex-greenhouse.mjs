import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createOfflinePublicHarness} from './offline-public-harness.mjs';
import {serveOfflinePage} from './offline-public-bridge.mjs';
import {GREENHOUSE_URL,greenhouseOracle} from './greenhouse-cases.mjs';
import {runCodex,parseRun,codexArgs} from './host-driver.mjs';
import {projectRoot} from '../src/bridge.mjs';

// Migration smoke test, deliberately not a comparative speed benchmark.
const cwd=await mkdtemp(path.join(os.tmpdir(),'afa-greenhouse-host-'));
const batchId=Date.now(),controller=new AbortController();
for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>controller.abort());
const report={batchId,date:new Date().toISOString(),scope:'Single Codex migration smoke test on an actual public Greenhouse page, loaded GET/HEAD-only and network-frozen before fictional input. Public DOM oracle for ten supported targets; education and city queries cannot complete offline. No server acceptance, full application completion, or speed comparison.'};
let h,bridge;
try {
  h=await createOfflinePublicHarness(GREENHOUSE_URL,{loadReadiness:'networkidle'});
  bridge=await serveOfflinePage(h);
  const configFile=path.join(cwd,'controller.json'),timingFile=path.join(cwd,'timing.jsonl');
  await writeFile(configFile,JSON.stringify(bridge.config),{mode:0o600});
  await writeFile(timingFile,'',{mode:0o600});
  const script=`${projectRoot}/prototype/bench/offline-public-bindings-mcp.mjs`;
  const env={AFA_DOCUMENT_FILE:`${projectRoot}/prototype/fixtures/documents/greenhouse-candidate.md`,AFA_OFFLINE_CONFIG:configFile,AFA_SELECTION_MODE:'conditional',AFA_TIMING_FILE:timingFile};
  const client=new Client({name:'greenhouse-preflight',version:'0.0.1'});
  try {
    await client.connect(new StdioClientTransport({command:process.execPath,args:[script],env:{...process.env,...env},stderr:'pipe'}));
    const {tools}=await client.listTools(),apply=tools.find(t=>t.name==='form_apply_bindings');
    assert.equal(tools.length,4);assert.ok(JSON.stringify(apply.inputSchema).includes('labelParts'));
    const context=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
    assert.equal(context.page.url,GREENHOUSE_URL);assert.equal(context.source.entries.length,14);
    assert.ok(context.page.fields.some(f=>f.label==='Country'&&f.kind==='autocomplete'));
    report.preflight={passed:true,tools:tools.length,sourceEntries:context.source.entries.length,fields:context.page.fields.length,contextBytes:Buffer.byteLength(JSON.stringify(context))};
  } finally {await client.close();}
  const prompt=`Fill all source-supported fields in the connected disposable browser from the supplied fictional Markdown profile. This is a network-isolated dry run: ALL page network traffic is blocked before any input. Context is prefetched. Match facts by meaning and use source IDs. When supplied facts determine an intended option and its qualifiers, express a conditional search choice in the apply plan to reduce host calls. Conditions still require unique actual observed options. If some queries cannot complete offline, use the returned evidence to finish the supported subset; do not keep retrying unavailable queries or claim no matching option exists. Source-provided facts in unavailable fields must be reported as unresolved. Do not guess consent, demographic or missing facts. No upload, submission, navigation, shell/web, or inspection of application-specific internal state. A write returns evidence and coverage: complete only means requested targets, not the entire application. Report what was filled and every source-supported field that remains unavailable, plus missing required consent and unsupported attachment. Intended page: ${GREENHOUSE_URL}`;
  console.log('START Codex Greenhouse migration smoke');
  const r=await runCodex({cwd,args:codexArgs(script,env),prompt,signal:controller.signal});
  const privateDir=`${projectRoot}/prototype/reports/private`;await mkdir(privateDir,{recursive:true});
  await writeFile(`${privateDir}/${batchId}-greenhouse.jsonl`,r.stdout,{mode:0o600});
  await writeFile(`${privateDir}/${batchId}-greenhouse.stderr.log`,r.stderr,{mode:0o600});
  const events=r.stdout.split('\n').flatMap(line=>{try{return[JSON.parse(line)];}catch{return[];}});
  const finalText=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text;
  const evidence=events.filter(e=>e.type==='item.completed'&&e.item?.type==='mcp_tool_call').flatMap(e=>{try{return[JSON.parse(e.item.result.content.find(c=>c.type==='text').text)];}catch{return[];}});
  Object.assign(report,{elapsedMs:r.elapsedMs,exitCode:r.exitCode,timedOut:r.timedOut,aborted:r.aborted,...parseRun(r),timeline:r.timeline,finalText,oracle:await greenhouseOracle(h.page),guard:h.guard(),evidence});
  report.serverTimings=(await readFile(timingFile,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
  console.log(JSON.stringify({passed:report.oracle.passed,errors:report.oracle.errors,seconds:r.elapsedMs/1000,calls:report.toolCalls.length,exitCode:r.exitCode,finalText},null,2));
  if(!report.oracle.passed||r.exitCode!==0||r.timedOut||r.aborted)process.exitCode=1;
} catch(e) {report.error=e.stack;process.exitCode=1;console.error(e.message);}
finally {
  await writeFile(`prototype/reports/codex-greenhouse-${batchId}.json`,JSON.stringify(report,null,2));
  await writeFile('prototype/reports/codex-greenhouse.json',JSON.stringify(report,null,2));
  await bridge?.close();await h?.close();await rm(cwd,{recursive:true,force:true});
}
