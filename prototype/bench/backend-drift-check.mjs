import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {projectRoot} from '../src/bridge.mjs';
import '../scripts/build-fixtures.mjs';
const h=await createHarness(),results=[];
try {
  for(const backend of ['extension','playwright'])for(const mutation of ['label','group']) {
    await h.reset('react-form');await h.page.waitForSelector('input');
    const request=backend==='extension'?r=>h.bridge.request(r):createPlaywrightBackend(h.page,{validationMode:process.env.AFA_VALIDATION_MODE??'full'}).request;
    const o=await request({op:'inspect'});
    await h.page.evaluate(mutation=>{
      const trigger=document.querySelector('[aria-label="Qualification level"]');
      const mo=new MutationObserver(()=>{
        if(!document.querySelector('[role=listbox]'))return;
        mo.disconnect();
        if(mutation==='label')trigger.setAttribute('aria-label','A different question');
        else {trigger.parentElement.setAttribute('role','group');trigger.parentElement.setAttribute('aria-label','A different subject');}
      });mo.observe(document.body,{subtree:true,childList:true});
    },mutation);
    const r=await request({op:'goal',url:o.url,snapshot:o.snapshot,fields:[{group:'',label:'Qualification level',value:'硕士'}]});
    const actual=await h.page.evaluate(()=>window.applicationState.degree);
    let error;try{assert.equal(r.complete,false);assert.equal(actual,'','Changed semantic target was selected');assert.equal(await h.page.locator('[role=listbox]').count(),0);}catch(e){error=e.message;}
    results.push({backend,mutation,passed:!error,error,complete:r.complete,reason:r.reason,actual});
    console.log(`${error?'FAIL':'PASS'} ${backend} ${mutation} drift`);
  }
}finally{await h.close();await writeFile(`${projectRoot}/prototype/reports/${process.env.AFA_VALIDATION_MODE==='guard'?'guard-':''}backend-drift-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
