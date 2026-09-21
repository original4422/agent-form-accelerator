import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {createHarness} from './harness.mjs';
import {runCodex,parseRun,codexArgs} from './host-driver.mjs';
import {checkConditionalProvider} from './conditional-provider-check.mjs';
import {aliasOracle} from './alias-cases.mjs';
import {parseDocument} from '../src/document-source.mjs';
import {projectRoot} from '../src/bridge.mjs';
const h=await createHarness({cdp:true,handleSignals:false}),cwd=await mkdtemp(path.join(os.tmpdir(),'afa-conditional-host-'));
const sourcePath=`${projectRoot}/prototype/fixtures/documents/alias-candidate.md`;
const expectedSource=parseDocument(await readFile(sourcePath,'utf8'));
const batchId=Date.now(),rows=[],preflight=[],controller=new AbortController();
for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>controller.abort());
const privateDir=`${projectRoot}/prototype/reports/private`;await mkdir(privateDir,{recursive:true});
const save=async()=>{
 const data={batchId,protocol:'conditional-intent-v1',date:new Date().toISOString(),aborted:controller.signal.aborted,
 scope:'Alternating existing batch discovery followed by apply versus source-derived conditional search choices inside apply. Same React Select alias/campus task, source, guard backend, existing approval/configuration and return evidence. Conditional choices require all literal phrases to match one observed enabled label; ambiguity returns actual options before fact writes. Three pairs. All host startup, model, tools, recovery and exit included; initial browser load/preflight excluded. Ten supplied targets must match entity IDs; one required date remains blank and must be reported; zero submits.',preflight,rows};
 await writeFile(`${projectRoot}/prototype/reports/codex-conditional-${batchId}.json`,JSON.stringify(data,null,2));await writeFile(`${projectRoot}/prototype/reports/codex-conditional.json`,JSON.stringify(data,null,2));
};
try{
 runs:for(let repetition=0;repetition<Number(process.env.AFA_REPEATS??3);repetition++)for(const mode of (process.env.AFA_SELECTION_MODES?.split(',')??(repetition%2?['conditional','observed']:['observed','conditional']))){
  if(!['observed','conditional'].includes(mode))throw new Error('Unknown selection mode');
  await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');preflight.push(await checkConditionalProvider({h,mode}));
  await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');if(controller.signal.aborted)break runs;
  const prompt=`Fill the connected local fictional application from the supplied unmapped Markdown facts, including BOTH education experiences in order. Match by meaning, including campus qualifiers. Use source references, not rewritten paragraphs. Context is prefetched. Search terms may translate or abbreviate supplied facts; final choices must be real observed options consistent with those facts. If conditional search choices are offered, put source-derived search terms and all necessary name/qualifier phrases in the same apply plan; they are conditions on future observations, not claims that an option already exists. If those conditions cannot be specified from supplied facts, discover the options first. If the plan returns ambiguity or no match, inspect its actual options and resolve without weakening source facts. Batch independent discoveries whenever the tool schema allows; a repeated row may use the observed template with the source for that row. Make as few host calls as necessary without skipping observation or validation. A writing call already returns verification evidence; extra inspection is unnecessary if sufficient. Fill all fields supported by source facts, leave questions lacking facts blank, and clearly report remaining required information in your final response. complete is only for requested targets, so check coverage. Never guess missing facts. Do not submit, navigate, use shell/web, read unrelated files, or inspect application-specific state globals. An independent oracle checks application state after you finish. Intended page: ${h.page.url()}`;
  const timingFile=path.join(cwd,'timing.jsonl');await writeFile(timingFile,'',{mode:0o600});
  const env={AFA_TIMING_FILE:timingFile,AFA_SELECTION_MODE:mode,AFA_DOCUMENT_FILE:sourcePath,AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url(),AFA_CONTEXT_MODE:'prefetch',AFA_DISCOVERY_MODE:'batch'};
  console.log(`START ${repetition+1}/${Number(process.env.AFA_REPEATS??3)} ${mode}`);
  const r=await runCodex({cwd,args:codexArgs(`${projectRoot}/prototype/bench/playwright-bindings-mcp.mjs`,env),prompt,signal:controller.signal});
  const attempt=`${batchId}-${repetition}-conditional-${mode}`;
  await writeFile(`${privateDir}/${attempt}.jsonl`,r.stdout,{mode:0o600});await writeFile(`${privateDir}/${attempt}.stderr.log`,r.stderr,{mode:0o600});
  let oracle;try{oracle=await aliasOracle(h.page,expectedSource.entries.find(e=>e.label==='个人介绍').value);}catch(e){oracle={passed:false,errors:[e.message]};}
  const events=r.stdout.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
  const finalText=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text;
  const evidence=events.filter(e=>e.type==='item.completed'&&e.item?.type==='mcp_tool_call').flatMap(e=>{try{return [JSON.parse(e.item.result.content.find(c=>c.type==='text').text)];}catch{return [];}});
  const finalApply=evidence.filter(e=>e.completionScope==='requested-targets').at(-1);
  const reportsMissingDate=/到岗|入职|available.*start|start date/i.test(finalText??'');
  const coverageCorrect=finalApply?.complete===true&&finalApply.coverage?.visibleRequiredCovered===false&&JSON.stringify(finalApply.coverage.unresolvedRequired.map(f=>f.label))===JSON.stringify(['Earliest available start date']);
  const serverTimings=(await readFile(timingFile,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse).map(e=>({...e,atMs:e.epochMs-r.startedEpochMs}));
  const calls=events.filter(e=>e.type==='item.completed'&&e.item?.type==='mcp_tool_call').map(e=>({tool:e.item.tool,argumentBytes:Buffer.byteLength(JSON.stringify(e.item.arguments))}));
  const equalWork=finalApply?.bindings?.length===10&&finalApply?.evidence?.length===10;
  rows.push({startedEpochMs:r.startedEpochMs,serverTimings,calls,equalWork,attempt,repetition,mode,elapsedMs:r.elapsedMs,exitCode:r.exitCode,timedOut:r.timedOut,aborted:r.aborted,...oracle,coverageCorrect,reportsMissingDate,finalText,...parseRun(r),timeline:r.timeline});
  await save();console.log(JSON.stringify({mode,seconds:r.elapsedMs/1000,passed:oracle.passed,equalWork,coverageCorrect,reportsMissingDate,calls:rows.at(-1).toolCalls.length}));
  if(controller.signal.aborted)break runs;
 }
}finally{await save();await h.close();await rm(cwd,{recursive:true,force:true});}
if(controller.signal.aborted||rows.some(r=>!r.passed||!r.equalWork||!r.coverageCorrect||!r.reportsMissingDate||r.exitCode!==0))process.exitCode=1;
