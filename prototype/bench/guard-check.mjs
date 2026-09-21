import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
const h=await createHarness(),results=[];
const html='<form><label>First<input id="first"></label><section><div>Second question</div><input id="second"></section><label>Unrelated<input id="third"></label><label>Choice<select id="choice"><option value="a">Alpha</option><option value="b">Beta</option></select></label></form>';
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.message});console.error('FAIL '+name+': '+e.message);}};
try{
 for(const mode of ['full','guard'])for(const mutation of ['label','context','replace','hide','disable','options','unrelated'])await check(`${mode} blocks ${mutation} during the batch`,async()=>{
  await h.reset('plain');await h.page.locator('body').evaluate((b,html)=>b.innerHTML=html,html);
  const request=createPlaywrightBackend(h.page,{validationMode:mode}).request,o=await request({op:'inspect'});
  await h.page.evaluate(mutation=>{document.getElementById('first').addEventListener('input',()=>{
   const el=document.getElementById(mutation==='options'?'choice':'second');
   if(mutation==='label')el.setAttribute('aria-label','Different question');
   if(mutation==='context')el.previousElementSibling.textContent='Different question';
   if(mutation==='replace')el.replaceWith(el.cloneNode());
   if(mutation==='hide')el.hidden=true;
   if(mutation==='disable')el.disabled=true;
   if(mutation==='options')el.options[1].textContent='Different choice';
   if(mutation==='unrelated')document.getElementById('third').setAttribute('aria-label','Changed other meaning');
  },{once:true});},mutation);
  const target=o.fields.find(f=>f.domId===(mutation==='options'?'choice':'second'));
  const r=await request({op:'fill',url:o.url,snapshot:o.snapshot,actions:[{ref:o.fields[0].ref,op:'set',value:'trigger'},{ref:target.ref,op:'set',value:mutation==='options'?'b':'must not write'}]});
  assert.equal(r.results[1].status,'blocked');
  assert.equal(await h.page.locator(mutation==='options'?'#choice':'#second').inputValue(),mutation==='options'?'a':'');
 });
 await check('guard rejects newly inserted visible questions before the next write',async()=>{
  await h.reset('plain');await h.page.locator('body').evaluate((b,html)=>b.innerHTML=html,html);
  const request=createPlaywrightBackend(h.page,{validationMode:'guard'}).request,o=await request({op:'inspect'});
  await h.page.locator('#first').evaluate(el=>el.addEventListener('input',()=>el.form.insertAdjacentHTML('beforeend','<label>New question<input></label>'),{once:true}));
  const r=await request({op:'fill',url:o.url,snapshot:o.snapshot,actions:[{ref:o.fields[0].ref,op:'set',value:'trigger'},{ref:o.fields[1].ref,op:'set',value:'must not write'}]});
  assert.equal(r.results[1].status,'blocked');assert.equal(await h.page.locator('#second').inputValue(),'');
 });
 await check('guard keeps original token and final snapshot rotates it',async()=>{
  await h.reset('plain');const request=createPlaywrightBackend(h.page,{validationMode:'guard'}).request,o=await request({op:'inspect'});
  const first=o.fields.find(f=>f.supported&&f.kind==='text');const r=await request({op:'fill',url:o.url,snapshot:o.snapshot,actions:[{ref:first.ref,op:'set',value:'Ada'}]});assert.equal(r.results[0].status,'verified');assert.notEqual(r.observation.snapshot,o.snapshot);
  await assert.rejects(request({op:'fill',url:o.url,snapshot:o.snapshot,actions:[{ref:first.ref,op:'set',value:'stale'}]}),/STALE_SNAPSHOT/);
 });
}finally{await h.close();await writeFile('prototype/reports/guard-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
