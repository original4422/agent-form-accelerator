import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {createHarness} from './harness.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {runCodex,parseRun,codexArgs} from './host-driver.mjs';
import {checkFrameworkProvider} from './framework-preflight.mjs';
import '../scripts/build-fixtures.mjs';
const scenario=process.env.AFA_SCENARIO??'radix';
if(!['radix','search'].includes(scenario))throw new Error('Unknown scenario');
const fixture=scenario==='search'?'search-form':'react-form',reportStem=scenario==='search'?'codex-search':'codex-framework';
const h=await createHarness({cdp:true}),cwd=await mkdtemp(path.join(os.tmpdir(),'afa-framework-host-'));
const sourceFile=`${projectRoot}/prototype/fixtures/documents/framework-candidate.md`;
const markdown=await readFile(sourceFile,'utf8');
const expected={fullName:'林示例',email:'candidate@example.test',country:'cn',city:'hz',degree:'pg',schools:[{school:scenario==='search'?'school-south':'南方示例学院',major:'软件工程'},{school:scenario==='search'?'school-north':'北方示例大学',major:'计算机科学'}],summary:markdown.split('## 个人介绍\n')[1].trim()};
const privateDir=`${projectRoot}/prototype/reports/private`;await mkdir(privateDir,{recursive:true});
const localLoopHint=process.env.AFA_LOCAL_LOOP_HINT==='1';
const batchId=Date.now(),rows=[],preflight=[];
const controller=new AbortController();
for(const name of ['SIGINT','SIGTERM'])process.once(name,()=>controller.abort());
const save=async()=>{const data=JSON.stringify({batchId,scenario,localLoopHint,preflight,aborted:controller.signal.aborted,date:new Date().toISOString(),scope:(scenario==='search'?'Independent React 19.3.0 / React Select 5.10.2 async single-select fixture, three 450ms searches including repeated education, native country/degree. Transfer test of the cached Playwright backend only, not a speed comparison. ':'React 19.3.0 / Radix Select 2.3.7 fixture, dependent remounted city, 700ms explicit validation, repeating education. Three rotated modes by default. ')+ 'Unmapped Markdown parsed during timed MCP startup; prefetch, source binding and observed repeat templates. Browser load/build excluded; CLI/model/tools/recovery/exit included. Independent DOM and React-state oracle after timing, zero submits. All attempts retained.',rows},null,2);await writeFile(`${projectRoot}/prototype/reports/${reportStem}-${batchId}.json`,data);await writeFile(`${projectRoot}/prototype/reports/${reportStem}.json`,data);};
try{
 const rotation=[['binding-explicit','binding-repeat','playwright-ref'],['binding-repeat','playwright-ref','binding-explicit'],['playwright-ref','binding-explicit','binding-repeat']];
 runs:for(let repetition=0;repetition<Number(process.env.AFA_REPEATS??3);repetition++)for(const mode of((process.env.AFA_FRAMEWORK_MODES?(repetition%2?process.env.AFA_FRAMEWORK_MODES.split(',').reverse():process.env.AFA_FRAMEWORK_MODES.split(',')):scenario==='search'?['binding-playwright']:rotation[repetition%3]))){
  if(scenario==='search'&&mode!=='binding-playwright')throw new Error('Search transfer batch currently supports the cached Playwright provider only');
  if(!['binding-explicit','binding-repeat','binding-playwright','playwright-ref'].includes(mode))throw new Error('Unknown framework mode');
  await h.reset(fixture);await h.page.waitForSelector('input');
  const common=`Authorized local experiment: fill the existing local React application from the supplied fictional candidate Markdown document. All source entries are provided in tool metadata, with no website field mappings. Include BOTH education experiences in their order. Match by meaning. Use source references to avoid rewriting long text. The initial page context is prefetched; avoid redundant observations. Use the supplied tools or a batch/script as appropriate. Repeating groups may use an observed template only with exact expected group, labels and kinds; unknown structure must stop. Custom select-only widgets and autocomplete search fields require selecting an actual exact visible option; typed search text alone is not completion. Wait for explicitly pending aria-busy validation and check aria-invalid plus DOM/native validity before reporting completion. DOM read-back in the same writing call is sufficient when complete; a separate driver checks React state afterward. Do not read or write application-specific state globals, submit, navigate, fetch external resources, use shell, read unrelated files or skills, or change project files. Leave the form for review. Intended page: ${h.page.url()}`;
  const prompt=common+(localLoopHint?'\nLocal-loop rule for either execution path: observation and checks may happen inside one tool script/request. For each combobox, open the linked listbox, inspect the visible options locally, and select only if exactly one enabled option matches the source text. When it matches, continue locally without returning the option list for another model turn. For repetition, expand, validate the exact new group and template field labels/kinds in code, then fill. Return to the model only for missing/ambiguous choices or unexpected structure. One script can perform the entire task and return sufficient final DOM/native/ARIA evidence after pending validation ends. No extra snapshot is needed solely to repeat already supplied context. These are general execution rules; all semantic source-to-field mappings are still your decision.':'')+(mode==='playwright-ref'?`\nThe browser_run_code_unsafe adapter explicitly passes the parsed source as a second function argument: async(page,source)=>{...}. Use source.entries and entry IDs to copy text locally; do not import Node modules or read page globals for source data. Both batch tools and one-call Playwright scripts are allowed. Use real accessibility locators and distinguish repeated groups; label.textContent is not a general accessible-name implementation.`:'');
  const script=mode==='playwright-ref'?`${projectRoot}/prototype/bench/framework-ref-playwright-mcp.mjs`:mode==='binding-playwright'?`${projectRoot}/prototype/bench/playwright-bindings-mcp.mjs`:`${projectRoot}/prototype/src/bindings-mcp.mjs`;
  const env={AFA_DOCUMENT_FILE:sourceFile,AFA_CONTEXT_MODE:'prefetch',AFA_REPEAT_MODE:mode==='binding-explicit'?'explicit':'template',...(mode==='playwright-ref'||mode==='binding-playwright'?{AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url()}:{AFA_SESSION_FILE:h.sessionFile})};
  const probe=await checkFrameworkProvider({script,env,mode,scenario});preflight.push(probe);
  await h.reset(fixture);await h.page.waitForSelector('input');
  if(controller.signal.aborted)break runs;
  console.log(`START ${repetition+1}/${Number(process.env.AFA_REPEATS??3)} ${mode}`);const r=await runCodex({cwd,args:codexArgs(script,env),prompt,signal:controller.signal}),attempt=`${batchId}-${repetition}-${mode}`;
  await writeFile(`${privateDir}/${attempt}.jsonl`,r.stdout,{mode:0o600});await writeFile(`${privateDir}/${attempt}.stderr.log`,r.stderr,{mode:0o600});
  let check;
  try{check=await h.page.evaluate(({expected,scenario})=>{
   const errors=[],s=window.applicationState;
   for(const k of ['fullName','email','country','city','degree','summary'])if(s[k]!==expected[k])errors.push(k);
   for(let i=0;i<2;i++)for(const k of ['school','major'])if(s.schools[i]?.[k]!==expected.schools[i][k])errors.push(`education ${i+1} ${k}`);
   if(s.schools.length!==2)errors.push('education count');
   const inputs=[...document.querySelectorAll('input:not([type=hidden]):not([role=combobox]),textarea')].filter(e=>e.getClientRects().length&&!e.closest('[aria-hidden=true]'));
   const expectedText=scenario==='search'?[expected.email,expected.fullName,expected.schools[0].major,expected.schools[1].major,expected.summary]:[expected.fullName,expected.email,expected.schools[0].school,expected.schools[0].major,expected.schools[1].school,expected.schools[1].major,expected.summary];
   if(JSON.stringify(inputs.map(e=>e.value))!==JSON.stringify(expectedText))errors.push('DOM values');
   const combos=[...document.querySelectorAll('button[role=combobox]')];
   if(scenario==='search'){
    const selected=[...document.querySelectorAll('.select__single-value')].map(n=>n.textContent);
    if(JSON.stringify(selected)!==JSON.stringify(['杭州','南方示例学院','北方示例大学']))errors.push('selected entity DOM labels');
    if([...document.querySelectorAll('input[role=combobox]')].some(n=>n.value))errors.push('query text remains');
   }else if(combos.length!==3||!['中国','杭州','硕士'].every((v,i)=>combos[i].textContent.includes(v)))errors.push('combobox DOM values');
   if(inputs.some(e=>!e.validity.valid||e.getAttribute('aria-invalid')==='true'))errors.push('DOM invalid');
   if(Object.values(window.validationState).some(Boolean))errors.push('React validation incomplete');
   if(document.querySelector('[role=listbox]'))errors.push('popup still open');
   if(window.submissionCount)errors.push('submitted');
   return{passed:!errors.length,total:10,errors};
  },{expected,scenario});}catch(e){check={passed:false,error:e.message,total:10,errors:['oracle unavailable']};}
  const parsed=parseRun(r);rows.push({attempt,repetition,mode,elapsedMs:r.elapsedMs,exitCode:r.exitCode,timedOut:r.timedOut,aborted:r.aborted,error:r.error,...check,...parsed,timeline:r.timeline});await save();console.log(JSON.stringify({mode,seconds:r.elapsedMs/1000,passed:check.passed,calls:parsed.toolCalls.length,errors:check.errors}));
  if(controller.signal.aborted)break runs;
 }
}finally{await save();await h.close();await rm(cwd,{recursive:true,force:true});}
if(controller.signal.aborted||rows.some(r=>!r.passed||r.exitCode!==0))process.exitCode=1;
