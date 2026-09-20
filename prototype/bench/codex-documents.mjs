// First-use Markdown extraction + unfamiliar-field binding. No site field mapping
// is supplied by the driver; the host must infer it from source and observation.
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createHarness} from './harness.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {runCodex,parseRun,codexArgs} from './host-driver.mjs';
const h=await createHarness(),cwd=await mkdtemp(path.join(os.tmpdir(),'afa-doc-host-'));
const variant=process.env.AFA_DOCUMENT_VARIANT??'unfamiliar';
const sourceFile=`${projectRoot}/prototype/fixtures/documents/${variant==='permuted'?'candidate-reordered':'candidate'}.md`,markdown=await readFile(`${projectRoot}/prototype/fixtures/documents/candidate.md`,'utf8');
// Independent expected values from the original source, not from the source parser
// or from the model's mappings. Both options in each radio question are checked.
const paragraph=heading=>markdown.split(`## ${heading}\n\n`)[1].split('\n\n## ')[0].trim();
const expected={full:'林示例',mail:'candidate@example.test',tel:'13800000000',home:'北京',college:'示例大学',course:'计算机科学',degree:'pg',grad:'2027-06-30',move:'yes',share:'no',intro:paragraph('自我介绍'),project:paragraph('项目经历')};
const privateDir=`${projectRoot}/prototype/reports/private`;await mkdir(privateDir,{recursive:true});
const batchId=Date.now(),rows=[];
const save=async()=>{const report=JSON.stringify({batchId,variant,date:new Date().toISOString(),scope:'Unmapped Markdown document to unfamiliar English form. Parsing and page-context fetch occur inside timed Codex/MCP startup or tools. Browser startup/page load excluded. Same binding API/source/executor in both modes; only context delivery differs. Explicit calls form_context; prefetch includes same source/page data in tool description with freshness guard. Three repetitions, default explicit/prefetch order AB/BA/AB; environment overrides may select a subset. Same Codex defaults and auto-review. Independent DOM/application-state oracle; no submission.',rows},null,2);await writeFile(`${projectRoot}/prototype/reports/codex-documents-${batchId}.json`,report);await writeFile(`${projectRoot}/prototype/reports/codex-documents.json`,report);};
try{
 for(let repetition=0;repetition<3;repetition++)for(const mode of (process.env.AFA_DOCUMENT_MODES?.split(',')??(repetition%2?['prefetch','explicit']:['explicit','prefetch']))){
  await h.reset(variant);
  const prompt=`Authorized local experiment: use the supplied fictional candidate Markdown document to fill the connected application form. The MCP server has the explicitly provided document; its entries have not been mapped to website fields. Decide those mappings from meaning. Use form_apply_bindings and form_context as needed. The available tool description may already include source/page context; avoid redundant observations when sufficient. Use source IDs to transfer text exactly. Map choices to observed select values and radio options consistent with the source facts. Select only the intended radio option for each question, leaving the other option unbound. Check final returned evidence. Do not submit, navigate, fetch, use shell, inspect files outside these tools, or modify the project. Report unresolved information briefly.\nIntended page: ${h.page.url()}`;
  const args=codexArgs(`${projectRoot}/prototype/src/bindings-mcp.mjs`,{AFA_SESSION_FILE:h.sessionFile,AFA_DOCUMENT_FILE:sourceFile,AFA_CONTEXT_MODE:mode});
  console.log(`START ${repetition+1}/3 ${mode}`);const r=await runCodex({cwd,args,prompt});const attempt=`${batchId}-${repetition}-${mode}`;
  await writeFile(`${privateDir}/${attempt}.jsonl`,r.stdout,{mode:0o600});await writeFile(`${privateDir}/${attempt}.stderr.log`,r.stderr,{mode:0o600});
  const check=await h.page.evaluate(expected=>{
    const errors=[];for(const [key,value]of Object.entries(expected)){
      const el=['move','share'].includes(key)?document.querySelector(`input[name="${key}"]:checked`):document.querySelector(`[name="${key}"]`);
      if(!el||el.value!==value||el.validity.valid===false||window.applicationState[key]!==value)errors.push({field:key,dom:el?.value,app:window.applicationState[key]});
    }
    if(window.submissionCount)errors.push({submitted:window.submissionCount});return{passed:!errors.length,total:Object.keys(expected).length,correct:Object.keys(expected).length-errors.filter(x=>x.field).length,errors};
  },expected);
  const parsed=parseRun(r);rows.push({attempt,repetition,mode,elapsedMs:r.elapsedMs,exitCode:r.exitCode,timedOut:r.timedOut,error:r.error,...check,...parsed,timeline:r.timeline});await save();
  console.log(JSON.stringify({mode,repetition,seconds:(r.elapsedMs/1000).toFixed(2),passed:check.passed,calls:parsed.toolCalls.length,errors:check.errors}));
 }
}finally{await save();await h.close();await rm(cwd,{recursive:true,force:true});}
if(rows.some(r=>!r.passed||r.exitCode!==0))process.exitCode=1;
