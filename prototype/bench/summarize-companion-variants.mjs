import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const file=process.argv[2]??'prototype/reports/codex-companion-variants.json',report=JSON.parse(await readFile(file));
assert.ok([2,4].includes(report.runs.length));assert.ok(report.passed&&report.runtimeUnchanged);assert.ok(report.runs.every(r=>r.passed));assert.equal(new Set(report.runs.map(r=>r.promptHash)).size,1);
const pairs=[...new Set(report.runs.map(r=>r.variant))].map(variant=>{
 const a=report.runs.find(r=>r.variant===variant&&!r.enabled),b=report.runs.find(r=>r.variant===variant&&r.enabled);
 assert.equal(a.preflight.contextHash,b.preflight.contextHash);assert.equal(a.sourceHash,b.sourceHash);
 return {variant,sourceHash:a.sourceHash,contextHash:a.preflight.contextHash,singleSeconds:a.elapsedMs/1000,variantsSeconds:b.elapsedMs/1000,singleCalls:a.toolCalls.length,variantsCalls:b.toolCalls.length,singleSearches:a.oracle.searches,variantsSearches:b.oracle.searches,identicalSearchLog:JSON.stringify(a.searchLog)===JSON.stringify(b.searchLog),bothCorrect:a.passed&&b.passed};
});
const median=xs=>{xs.sort((a,b)=>a-b);const i=Math.floor(xs.length/2);return xs.length%2?xs[i]:(xs[i-1]+xs[i])/2;},single=median(pairs.map(p=>p.singleSeconds)),variants=median(pairs.map(p=>p.variantsSeconds));
const result={batchId:report.batchId,scope:`Descriptive ${pairs.length}-pair integration comparison on the same synthetic task. Not independent real-site/full-application/stable-speed evidence.`,runtimeFileHashes:Object.keys(report.before).length,runtimeUnchanged:report.runtimeUnchanged,pairs,singleMedianSeconds:single,variantsMedianSeconds:variants,descriptiveReductionPercent:(1-variants/single)*100,correctTargets:report.runs.reduce((n,r)=>n+r.oracle.knownTargets,0),zeroSubmits:report.runs.every(r=>r.oracle.submits===0),missingDatesRetainedAndReported:report.runs.every(r=>r.missingReported&&r.oracle.requiredUnanswered===1)};
await writeFile('prototype/reports/codex-companion-variants-summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
