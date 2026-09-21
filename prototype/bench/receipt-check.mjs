import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {projectReceipt,restoreObservation} from '../src/receipt-projection.mjs';
const results=[];
const check=(name,fn)=>{try{fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}};
const before={url:'https://example.test',snapshot:'a',documentId:'doc1',fields:[{ref:'f1',label:'Name',value:'',valid:false,oldHint:'remove'},{ref:'f2',label:'City',value:'',options:[]}],controls:[{ref:'b1',label:'Next'}]};
const after={url:before.url,snapshot:'b',documentId:'doc1',title:'Updated',fields:[{ref:'f3',label:'New optional field',value:''},{ref:'f1',label:'Name',value:'Ada',valid:true}],controls:[],limitations:{iframes:1}};
const sample={complete:true,observation:after,evidence:[{label:'Name',status:'verified',expected:'Ada',actual:'Ada'}],coverage:{visibleRequiredCovered:false,unresolvedRequired:[{label:'New optional field'}],unsupported:[{kind:'file'}]},bindings:[{ref:'f1',sourceId:'s1'}],reason:undefined};
check('field additions, removals, metadata, property deletion, controls and order reconstruct exactly',()=>{
  const r=projectReceipt(sample,before);assert.equal(r.receiptFormat,'changes-v1');assert.deepEqual(restoreObservation(before,JSON.parse(JSON.stringify(r.observationDelta))),after);assert.equal(sample.observation,after);
});
check('stale or tampered base is rejected even with the same snapshot token',()=>{
  const r=projectReceipt(sample,before);assert.throws(()=>restoreObservation({...before,title:'Changed'},r.observationDelta),/DELTA_BASE_MISMATCH/);
});
check('document, URL, missing context and duplicate-ref changes retain full result',()=>{
  for(const base of [undefined,{...before,documentId:'other'},{...before,url:'https://elsewhere.test'},{...before,fields:[...before.fields,before.fields[0]]}])assert.equal(projectReceipt(sample,base),sample);
});
check('unverified writes and unknown execution errors retain full observation and evidence',()=>{
  for(const reason of ['FINAL_VERIFICATION_FAILED','FIELD_CHANGED','OTHER_ERROR']){const r={...sample,complete:false,reason};assert.equal(projectReceipt(r,before),r);}
});
check('partial success preserves all unresolved source targets, candidates and evidence',()=>{
  const unresolved={ref:'f2',sourceId:'s2',label:'City',reason:'CONTROL_NOT_READY',currentPresence:'absent'};
  const r={...sample,complete:false,partial:true,appliedSubsetComplete:true,reason:'INDEPENDENT_TARGETS_UNRESOLVED',task:{scope:'planned sources',complete:false,targets:[{ref:'f1',status:'verified'},{...unresolved,status:'unresolved'}],unresolvedTargets:[unresolved]},searches:[{ref:'f2',options:[{optionRef:'o1',label:'City X'},{optionRef:'o2',label:'City Y'}]}],conditionalSelections:[{ref:'f2',reason:'AMBIGUOUS_CONDITION'}]};
  const p=projectReceipt(r,before);assert.deepEqual(p.evidence,r.evidence);assert.deepEqual(p.coverage,r.coverage);assert.deepEqual(p.bindings,r.bindings);assert.deepEqual(p.searches,r.searches);assert.deepEqual(p.conditionalSelections,r.conditionalSelections);assert.deepEqual(p.task.unresolvedTargets,r.task.unresolvedTargets);assert.equal(p.task.plannedCount,2);assert.equal(p.task.verifiedCount,1);assert.equal(p.complete,false);
});
check('wire normalization tolerates undefined properties and object key ordering',()=>{
  const r=projectReceipt(sample,{...before,unused:undefined});const reversed=Object.fromEntries(Object.entries(before).reverse());assert.deepEqual(restoreObservation(reversed,r.observationDelta),after);
});
const stored=JSON.parse(await readFile('prototype/reports/codex-independent.json','utf8')).rows;
check('stored real-page receipts retain every non-observation decision and unresolved fact',()=>{
  for(const run of stored){
    const r=run.evidence.at(-1),base={...r.observation,fields:r.observation.fields.map(f=>({...f,value:''}))};
    const projected=projectReceipt(r,base);assert.deepEqual(restoreObservation(base,projected.observationDelta),r.observation);
    for(const key of ['complete','reason','evidence','bindings','coverage','searches','conditionalSelections'])assert.deepEqual(projected[key],r[key]);
    if(r.task)assert.deepEqual(projected.task.unresolvedTargets,r.task.unresolvedTargets);
  }
});
await writeFile('prototype/reports/receipt-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
