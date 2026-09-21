import {writeFile} from 'node:fs/promises';
import {createOfflinePublicHarness} from './offline-public-harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
const url='https://jobs.lever.co/palantir/c34b424e-caf2-455a-b104-ae1096ccca29/apply';
const h=await createOfflinePublicHarness(url);
try{
 const observation=await createPlaywrightBackend(h.page).request({op:'inspect'});
 const fields=await h.page.locator('input,textarea,select').evaluateAll(nodes=>nodes.filter(el=>el.getClientRects().length).map(el=>({tag:el.tagName,type:el.type,name:el.name,id:el.id,required:el.required,ariaRequired:el.getAttribute('aria-required'),label:el.getAttribute('aria-label'),labels:[...el.labels??[]].map(l=>l.textContent.trim()),context:el.closest('li')?.innerText?.slice(0,500)})));
 const snippets=await h.page.locator('li').evaluateAll(nodes=>nodes.filter(n=>n.querySelector('input[placeholder],textarea,select')).slice(0,8).map(n=>{const clone=n.cloneNode(true);clone.querySelectorAll('option').forEach(o=>o.remove());return clone.outerHTML.slice(0,3500);}));
 const compactObservation={...observation,fields:observation.fields.map(({options,...f})=>({...f,...(options?{optionCount:options.length}: {})}))};
 const data={date:new Date().toISOString(),scope:'Read-only load followed by network isolation, no field input yet.',url:h.page.url(),guard:h.guard(),observation:compactObservation,fields,snippets,rawObservationBytes:Buffer.byteLength(JSON.stringify(observation))};
 await writeFile('prototype/reports/offline-public-audit.json',JSON.stringify(data,null,2));
 console.log(JSON.stringify({url:data.url,guard:data.guard,fieldCount:observation.fields.length,bytes:data.rawObservationBytes,snippets},null,2));
}finally{await h.close();}
