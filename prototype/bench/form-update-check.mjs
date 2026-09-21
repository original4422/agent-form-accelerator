// Controlled local protocol fixture, not a captured successful Ashby response.
import assert from 'node:assert/strict';
import {createFormUpdateFixture} from './form-update-fixture.mjs';
import {projectPage} from '../src/context-projection.mjs';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createPlaywrightBackend} from './playwright-backend.mjs';
const results=[],browser=await chromium.launch({channel:'chromium',headless:true});
try{
 for(const scenario of ['success','delayed','network-failure','http-failure','graphql-failure','unknown-response','form-error','timeout','new-field','new-rule']){
  const fixture=await createFormUpdateFixture(scenario),page=await browser.newPage();let backend;
  try{
   await page.goto(fixture.url);backend=createPlaywrightBackend(page);const o=await backend.request({op:'inspect'}),start=performance.now();
   const r=await backend.request({op:'goal',url:o.url,snapshot:o.snapshot,fields:o.fields.map(f=>({group:f.group,label:f.label,kind:f.kind,value:f.label==='Location'?'Fictional Place':'Fictional Name'}))});
   const actual=await page.evaluate(()=>({first:document.querySelector('#first').value,second:document.querySelector('#second').value,early:window.secondBeforeResponse,firstEvents:window.firstEvents,rendered:!!window.rendered}));
   const {accepted,requests}=fixture.diagnostic();
   const detail={complete:r.complete,reason:r.reason,elapsedMs:performance.now()-start,actual,accepted,requests,formUpdate:r.observation?.formUpdate,evidence:r.evidence};
   results.push({scenario,passed:false,...detail});
   assert.equal(requests,1);assert.equal(actual.firstEvents,1);
   if(['success','delayed'].includes(scenario)){assert.equal(r.complete,true,r.reason);assert.equal(accepted,true);assert.equal(actual.rendered,true);assert.equal(actual.early,false,'next field was written before the server response/render');assert.equal(actual.second,'Fictional Name');}
   else{assert.equal(r.complete,false,'optimistic UI must not count as completed');assert.equal(actual.second,'','old plan must stop before the next field');assert.ok(r.evidence.every(e=>e.status==='unresolved'),'unsafe DOM values must not enter verified ledger');assert.match(r.reason,scenario.startsWith('new-')?/SERVER_FORM_CHANGED/:/FORM_UPDATE_/);}
   if(!['success','delayed','new-field','new-rule'].includes(scenario)){
    const again=await backend.request({op:'inspect'});assert.ok(again.formUpdate.reason,'inspection cannot erase a failed update');assert.equal(projectPage(again,{entries:[]}).formUpdate.reason,again.formUpdate.reason);
    const retry=await backend.request({op:'goal',url:again.url,snapshot:again.snapshot,fields:[{group:o.fields[0].group,label:o.fields[0].label,value:'Fictional Place'}]});assert.equal(retry.complete,false);assert.ok(retry.evidence.every(e=>e.status==='unresolved'));assert.equal((await page.evaluate(()=>window.firstEvents)),1);
   }
   results.at(-1).passed=true;console.log('PASS '+scenario);
  }catch(e){if(results.at(-1)?.scenario!==scenario)results.push({scenario,passed:false});results.at(-1).error=e.stack;console.error('FAIL '+scenario+': '+e.message);}
  finally{backend?.dispose?.();await page.close();await fixture.close();}
 }
 // The low-level endpoint is public to local callers too. A late failed update
 // must invalidate earlier written rows, not only the higher-level goal result.
 const fixture=await createFormUpdateFixture('success'),page=await browser.newPage();let backend;
 try{
  await page.goto(fixture.url);backend=createPlaywrightBackend(page);let seen=0;
  await page.route('**/api/non-user-graphql*',r=>++seen===2?r.abort():r.continue());
  await page.evaluate(()=>document.querySelector('#second').onchange=document.querySelector('#first').onchange);
  const o=await backend.request({op:'inspect'}),r=await backend.request({op:'fill',url:o.url,snapshot:o.snapshot,actions:o.fields.map(f=>({ref:f.ref,op:'set',value:f.label==='Location'?'Fictional Place':'Fictional Name'}))});
  results.push({scenario:'primitive-late-failure',passed:false,results:r.results});assert.equal(seen,2);assert.ok(r.results.every(x=>x.status!=='verified'),'primitive must not verify earlier values after a known update failure');assert.equal(r.observation.formUpdate.reason,'FORM_UPDATE_NETWORK_FAILED');results.at(-1).passed=true;console.log('PASS primitive-late-failure');
 }catch(e){if(results.at(-1)?.scenario!=='primitive-late-failure')results.push({scenario:'primitive-late-failure',passed:false});results.at(-1).error=e.stack;console.error('FAIL primitive-late-failure: '+e.message);}
 finally{backend?.dispose();await page.close();await fixture.close();}
}finally{await browser.close();await writeFile(process.env.AFA_UPDATE_REPORT??'prototype/reports/form-update-checks.json',JSON.stringify({date:new Date().toISOString(),scope:'Local controlled protocol fixture; success envelope unconfirmed on live Ashby.',results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
