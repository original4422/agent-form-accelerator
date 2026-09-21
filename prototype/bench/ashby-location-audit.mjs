// Observe only public DOM/network metadata. Any query typing occurs AFTER the
// existing one-way transport freeze; no fictional facts reach the website.
import {writeFile} from 'node:fs/promises';import {createAshbyFrozenHarness} from './ashby-frozen-harness.mjs';import {createPlaywrightBackend} from './playwright-backend.mjs';
const report={date:new Date().toISOString(),scope:'Fresh public page frozen before generic fictional location query. No selection/upload/submit; no network parameter values, headers or bodies retained.',stages:[],requests:[]};let h;
try{
 h=await createAshbyFrozenHarness();report.beforeGuard=h.guard();
 h.page.on('request',r=>{const u=new URL(r.url());let body;try{body=JSON.parse(r.postData()??'{}');}catch{}report.requests.push({method:r.method(),origin:u.origin,path:u.pathname,queryKeys:[...u.searchParams.keys()],bodyKeys:body&&Object.keys(body),operationName:body?.operationName,queryDocument:typeof body?.query==='string'?body.query.slice(0,3000):undefined,variableTypes:body?.variables&&Object.fromEntries(Object.entries(body.variables).map(([k,v])=>[k,Array.isArray(v)?'array':typeof v]))});});
 const input=h.page.getByRole('combobox');if(await input.count()!==1)throw new Error('EXPECTED_SINGLE_LOCATION_COMBOBOX');
 const snapshot=async stage=>{
  const data=await input.evaluate(el=>{const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden';const attrs=n=>Object.fromEntries([...n.attributes].filter(a=>['id','name','class','role','type','placeholder','required','autocomplete'].includes(a.name)||a.name.startsWith('aria-')).map(a=>[a.name,a.value]));return {input:{attributes:attrs(el),value:el.value,nativeValid:el.validity?.valid},ancestors:[el.parentElement,el.parentElement?.parentElement,el.parentElement?.parentElement?.parentElement].filter(Boolean).map(n=>({tag:n.tagName,attributes:attrs(n),text:n.innerText.slice(0,1200),children:[...n.children].map(c=>({tag:c.tagName,attributes:attrs(c),text:c.tagName==='INPUT'?undefined:c.innerText?.slice(0,250)}))})),popups:[...document.querySelectorAll('[role=listbox],[role=option],[role=status],[role=alert]')].filter(visible).map(n=>({tag:n.tagName,attributes:attrs(n),text:n.innerText.slice(0,1200)}))};});
  report.stages.push({stage,...data});
 };
 await snapshot('initial');await input.focus();await snapshot('focused');await input.fill('London, United Kingdom');await h.page.waitForTimeout(1200);await snapshot('typed-after-freeze');await input.press('Escape');await input.blur();await snapshot('blurred');
 report.observation=(await createPlaywrightBackend(h.page).request({op:'inspect'})).fields.filter(f=>f.kind.includes('combo')||f.kind==='autocomplete');
 report.afterGuard=h.guard();report.diagnostic=await h.page.evaluate(()=>window.__afaPressedDiagnostic);report.completed=true;
 console.log(JSON.stringify(report,null,2));
}catch(e){report.error=e.stack;process.exitCode=1;console.error(e.message);}
finally{await h?.close();await writeFile('prototype/reports/ashby-location-audit.json',JSON.stringify(report,null,2));}
