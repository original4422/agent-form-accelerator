import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
const h=await createHarness(),results=[];
const html=`<form><ul>
<li><div><div><div>Preferred name</div></div><div><input name="opaque1" placeholder="Type your response"></div></div></li>
<li><div><div><div>Pronunciation</div></div><div><input name="opaque2" placeholder="Type your response"></div></div></li>
<li><div><div><div>Graduation year<span hidden>Ignore me</span></div></div><div><div><select name="opaque3"><option>2027</option></select></div></div></div></li>
<li><div>Unrelated heading<input name="ambiguous1"><input name="ambiguous2"></div></li>
<li><div>Other wording<label>Explicit label<input name="explicit"></label></div></li>
</ul></form>`;
try{for(const backend of ['extension','playwright']){
 await h.reset('plain');await h.page.locator('body').evaluate((b,html)=>b.innerHTML=html,html);
 const request=backend==='extension'?r=>h.bridge.request(r):createPlaywrightBackend(h.page).request;
 const o=await request({op:'inspect'});let error;
 try{
  assert.deepEqual(o.fields.map(f=>f.label),['Preferred name','Pronunciation','Graduation year','ambiguous1','ambiguous2','Explicit label']);
  const f=o.fields[0];await h.page.locator('li').first().locator('div div div').first().evaluate(n=>n.textContent='Bank details');
  await assert.rejects(async()=>{const r=await request({op:'validate',snapshot:o.snapshot,url:o.url});if(r.error)throw new Error(r.error);},/FIELD_CHANGED/);
 }catch(e){error=e.message;}
 results.push({backend,passed:!error,error});console.log(backend,error??'PASS');
}}finally{await h.close();await writeFile('prototype/reports/context-shape-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
