import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const batchId=Date.now(),rows=[];
for(let pair=0;pair<3;pair++)for(const mode of pair%2?['guard','full']:['full','guard']){
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['prototype/bench/validation-cost.mjs'],{env:{...process.env,AFA_VALIDATION_MODE:mode},stdio:['ignore','pipe','inherit']});p.on('error',reject);p.on('close',resolve);});
 const r=JSON.parse(await readFile(`prototype/reports/validation-cost-${mode}.json`,'utf8'));rows.push({pair,...r,evaluations:undefined});
 await writeFile(`prototype/reports/validation-cost-pairs-${batchId}.json`,JSON.stringify({batchId,scope:'Fixed59 bindings; browser/read-only load excluded, source mapping fixed outside clock. Local executor comparison, not host speed.',rows},null,2));
 console.log(JSON.stringify({pair,mode,code,seconds:r.elapsedMs/1000,scans:r.fullScans,guards:r.guardChecks,bytes:r.scanBytes,passed:r.oracle.passed}));if(code!==0)throw new Error('BENCHMARK_FAILURE');
}
