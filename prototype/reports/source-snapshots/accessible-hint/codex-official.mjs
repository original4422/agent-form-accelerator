// Official Playwright MCP strong baseline, with the same local source references.
// First-use Markdown extraction + unfamiliar-field binding. No site field mapping
// is supplied by the driver; the host must infer it from source and observation.
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createHarness} from './harness.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {runCodex,parseRun,codexArgs} from './host-driver.mjs';
const h=await createHarness({cdp:true}),cwd=await mkdtemp(path.join(os.tmpdir(),'afa-doc-host-'));
const variant=process.env.AFA_DOCUMENT_VARIANT??'permuted';
const sourceFile=`${projectRoot}/prototype/fixtures/documents/${variant==='permuted'?'candidate-reordered':'candidate'}.md`,markdown=await readFile(`${projectRoot}/prototype/fixtures/documents/candidate.md`,'utf8');
// Independent expected values from the original source, not from the source parser
// or from the model's mappings. Both options in each radio question are checked.
const paragraph=heading=>markdown.split(`## ${heading}\n\n`)[1].split('\n\n## ')[0].trim();
const expected={full:'林示例',mail:'candidate@example.test',tel:'13800000000',home:'北京',college:'示例大学',course:'计算机科学',degree:'pg',grad:'2027-06-30',move:'yes',share:'no',intro:paragraph('自我介绍'),project:paragraph('项目经历')};
const privateDir=`${projectRoot}/prototype/reports/private`;await mkdir(privateDir,{recursive:true});
const hint=process.env.AFA_BASELINE_HINT==='accessible';
const batchId=Date.now(),rows=[];
const save=async()=>{const report=JSON.stringify({batchId,variant,accessibleLabelHint:hint,date:new Date().toISOString(),scope:'Official Playwright MCP 0.0.82 retains original tools. Benchmark adapter adds same source references in fictional page globals and metadata, optionally prefetches official snapshot inside timing. It selects the intended fixture tab at startup. AFA uses its existing prefetched binder. Augmented baseline, not stock out-of-box behavior. Three rotated repetitions by default, with environment overrides supported. Unmapped Markdown to English form; parse and model field matching included. Browser startup/page load excluded; CLI startup, tools, auto-review and exit included. Independent DOM/event-state oracle after timing; no submission.',rows},null,2);await writeFile(`${projectRoot}/prototype/reports/codex-official-${batchId}.json`,report);await writeFile(`${projectRoot}/prototype/reports/codex-official.json`,report);};
try{
 for(let repetition=0;repetition<Number(process.env.AFA_REPEATS??3);repetition++)for(const mode of ((process.env.AFA_DOCUMENT_MODES ? (repetition%2 ? process.env.AFA_DOCUMENT_MODES.split(',').reverse() : process.env.AFA_DOCUMENT_MODES.split(',')) : undefined)??[ ['afa','pw-prefetch','pw-observe'], ['pw-prefetch','pw-observe','afa'], ['pw-observe','afa','pw-prefetch'] ][repetition%3])){
  await h.reset(variant);
  const prompt=(hint ? 'General browser implementation note: accessible names can exclude hidden helper text and aria-hidden decoration. Do not assume label.textContent equals the observed accessible name. Use observed refs or Playwright accessibility locators when appropriate; if using DOM code, ignore hidden helper text. Distinguish duplicate Yes/No by the question group. These are general handling rules, not a provided field mapping.\n' : '')+`Authorized local experiment: fill the existing connected local application form from the fictional candidate Markdown source. Source entries in tool metadata have not been mapped to fields. Infer mappings from meaning; use IDs to copy long text locally when possible. Check native select choices, dates, and both questions with Yes/No options. You may use any supplied browser tool including batch fill or browser_evaluate to observe, fill, and verify in a single script if helpful. If adequate page context was prefetched, no redundant observation is required. Verify final values and validity, including event delivery, leaving the form for review. For script paths, let the page settle for at least 120 ms before final read-back. Do not submit, navigate, fetch external resources, use shell, inspect unrelated files, or modify project files. Report unresolved information briefly.\nIntended page: ${h.page.url()}`;
  const args=mode==='afa'
    ?codexArgs(`${projectRoot}/prototype/src/bindings-mcp.mjs`,{AFA_SESSION_FILE:h.sessionFile,AFA_DOCUMENT_FILE:sourceFile,AFA_CONTEXT_MODE:'prefetch'})
    :codexArgs(`${projectRoot}/prototype/bench/playwright-document-mcp.mjs`,{AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url(),AFA_DOCUMENT_FILE:sourceFile,AFA_CONTEXT_MODE:mode==='pw-prefetch'?'prefetch':'explicit'});
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
