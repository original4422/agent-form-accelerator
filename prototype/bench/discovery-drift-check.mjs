import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {aliasQueries} from './alias-cases.mjs';
import '../scripts/build-fixtures.mjs';
const h=await createHarness(),request=createPlaywrightBackend(h.page).request,results=[];
const setup=async()=>{await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');const session=await createDocumentSession({sourcePath:`${projectRoot}/prototype/fixtures/documents/alias-candidate.md`,request});const context=await session.context();return {session,context,q:aliasQueries(context)[0]};};
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}};
try{
 await check('relabel on discovery blur returns no selectable offer',async()=>{
  const {session,context,q}=await setup();
  await h.page.getByLabel('Preferred office city',{exact:true}).evaluate(el=>el.addEventListener('blur',()=>el.setAttribute('aria-label','Spouse city'),{once:true}));
  const r=await session.search({url:context.page.url,queries:[q]});
  assert.equal(r.page.fields.find(f=>f.ref===q.ref).label,'Spouse city');
  assert.equal(r.searches[0].status,'blocked');assert.deepEqual(r.searches[0].options,[]);
  assert.equal(await h.page.evaluate(()=>window.applicationState.city),'');
 });
 await check('expansion cannot transfer old offer to a relabeled field',async()=>{
  const {session,context,q}=await setup();const r=await session.search({url:context.page.url,queries:[q]});
  await h.page.evaluate(()=>{const el=document.querySelector('input[aria-label="Preferred office city"]');const observer=new MutationObserver(()=>{if([...document.querySelectorAll('legend')].some(n=>n.textContent==='Education 2')){el.setAttribute('aria-label','Spouse city');observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});});
  const expanded=await session.expand({url:context.page.url,controlRef:context.page.controls[0].ref});
  assert.equal(expanded.page.fields.find(f=>f.ref===q.ref).label,'Spouse city');
  await assert.rejects(session.apply({url:context.page.url,bindings:{[q.ref]:q.sourceId},choices:{[q.ref]:{optionRef:r.searches[0].options[0].optionRef}}}),/INVALID_OPTION_REFERENCE/);
  assert.equal(await h.page.evaluate(()=>window.applicationState.city),'');
 });
}finally{await h.close();await writeFile(`${projectRoot}/prototype/reports/discovery-drift-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
