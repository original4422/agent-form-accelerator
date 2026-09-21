import {writeFile} from 'node:fs/promises';
import {runGreenhouse} from './codex-greenhouse.mjs';
const batchId=Date.now(),rows=[],repeats=Number(process.env.AFA_REPEATS??3);
const save=async()=>{
  const report={batchId,date:new Date().toISOString(),scope:'Alternating Codex conditional all-or-return versus explicit independent groups. Same actual Greenhouse page, 14 fictional source facts, network-frozen before input, prompt, backend and ten-target independent DOM oracle. Four remote lookups remain unresolved by design; compare complete host time for this identical partial dry-run task, not full application completion. Browser load and metadata preflight excluded; CLI, model, tools, recovery and final reply included.',rows};
  await writeFile(`prototype/reports/codex-independent-${batchId}.json`,JSON.stringify(report,null,2));await writeFile('prototype/reports/codex-independent.json',JSON.stringify(report,null,2));
};
try {
  for(let repetition=0;repetition<repeats;repetition++)for(const selectionMode of repetition%2?['independent','conditional']:['conditional','independent']){
    const r=await runGreenhouse({selectionMode,paired:true});
    const calls=r.evidence??[],final=calls.filter(c=>c.completionScope==='requested-targets').at(-1);
    const texts=r.finalText??'';
    const reportsUnavailable=[/city|城市/i,/school|学校/i,/degree|学历/i,/discipline|专业/i].every(re=>re.test(texts));
    const reportsOtherGaps=/privacy|consent|隐私|同意/i.test(texts)&&/resume|CV|简历/i.test(texts);
    const equalWork=final?.bindings?.length===10&&final?.evidence?.length===10&&calls.flatMap(c=>c.conditionalSelections??[]).length===7;
    const ledgerCorrect=selectionMode!=='independent'||JSON.stringify(final?.task?.unresolvedTargets.map(t=>t.label).sort())===JSON.stringify(['Degree','Discipline','Location (City)','School']);
    rows.push({...r,repetition,reportsUnavailable,reportsOtherGaps,equalWork,ledgerCorrect});await save();
    if(r.aborted||r.timedOut||!r.passed){process.exitCode=1;throw new Error('Host run failed; preserve attempt and investigate before more runs');}
  }
}finally{await save();}
if(rows.some(r=>!r.passed||!r.equalWork||!r.ledgerCorrect||!r.reportsUnavailable||!r.reportsOtherGaps))process.exitCode=1;
