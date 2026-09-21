import {writeFile} from 'node:fs/promises';
import {runGreenhouse} from './codex-greenhouse.mjs';
const batchId=Date.now(),rows=[];
const save=async()=>{
  const report={batchId,date:new Date().toISOString(),scope:'Same independent-group Codex task on frozen Greenhouse page, full versus changes-v1 apply receipt. Same prompt, initial context, tool descriptions/schema, backend and verification. All ten available targets must pass the public DOM oracle; four unavailable source facts, consent and attachment remain reported. No real application completion or server acceptance. Browser load/preflight excluded; full host time included.',rows};
  await writeFile(`prototype/reports/codex-receipts-${batchId}.json`,JSON.stringify(report,null,2));await writeFile('prototype/reports/codex-receipts.json',JSON.stringify(report,null,2));
};
try {
  for(let repetition=0;repetition<Number(process.env.AFA_REPEATS??3);repetition++)for(const receiptMode of repetition%2?['changes','full']:['full','changes']){
    const r=await runGreenhouse({selectionMode:'independent',paired:true,receiptMode});
    const final=r.evidence?.filter(c=>c.completionScope==='requested-targets').at(-1),text=r.finalText??'';
    const equalWork=final?.bindings?.length===10&&final.evidence?.length===10&&final.conditionalSelections?.length===7;
    const ledgerCorrect=JSON.stringify(final?.task?.unresolvedTargets.map(t=>t.label).sort())===JSON.stringify(['Degree','Discipline','Location (City)','School']);
    const reportsGaps=[/city|location|城市|地点/i,/school|学校/i,/degree|学历/i,/discipline|专业/i,/privacy|consent|隐私|同意/i,/resume|CV|简历/i].every(re=>re.test(text));
    const formatCorrect=receiptMode==='changes'?final?.receiptFormat==='changes-v1':!final?.receiptFormat;
    rows.push({...r,repetition,equalWork,ledgerCorrect,reportsGaps,formatCorrect});await save();
    if(!r.passed||r.aborted||r.timedOut){process.exitCode=1;throw new Error('Host task failed; preserve and investigate before further measurement');}
  }
}finally{await save();}
if(rows.some(r=>!r.passed||!r.equalWork||!r.ledgerCorrect||!r.reportsGaps||!r.formatCorrect))process.exitCode=1;
