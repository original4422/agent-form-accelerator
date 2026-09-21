import {writeFile} from 'node:fs/promises';
import {createOfflinePublicHarness} from './offline-public-harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {PUBLIC_URL,CASES,BOOL_CASES,publicOracle} from './offline-public-cases.mjs';
const mode=process.env.AFA_VALIDATION_MODE??'full';
const rows=[],h=await createOfflinePublicHarness(PUBLIC_URL);
try{
 const evaluations=[];
 const page=new Proxy(h.page,{get(target,key){const member=Reflect.get(target,key);if(key==='evaluate')return async(fn,arg)=>{const start=performance.now();const r=await member.call(target,fn,arg);evaluations.push({operation:arg?.op,function:fn.name,totalMs:performance.now()-start,browserMs:r?.elapsedMs,bytes:Buffer.byteLength(JSON.stringify(r)??''),fields:r?.fields?.length});return r;};return typeof member==='function'?member.bind(target):member;}});
 const request=createPlaywrightBackend(page,{validationMode:mode}).request,session=await createDocumentSession({sourcePath:new URL('../fixtures/documents/public-candidate.md',import.meta.url),request});
 const c=await session.context(),bindings={},choices={};
 const refs=await h.page.evaluate(()=>Object.fromEntries([...globalThis.__afaPrototype.nodes].map(([ref,{el}])=>[el.name,ref])));
 for(const [name,label]of CASES)bindings[refs[name]]=c.source.entries.find(e=>e.label===label).id;
 for(const [prefix,label,sourceLabel]of BOOL_CASES){const f=c.page.fields.find(f=>f.group.startsWith(prefix)&&f.label===label);bindings[f.ref]=c.source.entries.find(e=>e.label===sourceLabel).id;choices[f.ref]=true;}
 // Same closed lists as the previous Codex59 action strategy, including every
 // remaining false choice. No answer mapping enters the reusable backend.
 for(const prefix of ['Language Skill(s)','What are your preferred office']){
  const sourceLabel=prefix.startsWith('Language')?'掌握语言':'额外意向办公地点';
  for(const f of c.page.fields.filter(f=>f.kind==='checkbox'&&f.group.startsWith(prefix))){if(bindings[f.ref])continue;bindings[f.ref]=c.source.entries.find(e=>e.label===sourceLabel).id;choices[f.ref]=false;}
 }
 evaluations.length=0;const start=performance.now();const r=await session.apply({url:c.page.url,bindings,choices});const elapsedMs=performance.now()-start;
 const oracle=await publicOracle(h.page,c.source),scans=evaluations.filter(e=>e.function==='executeFormRequest');
 const data={mode,date:new Date().toISOString(),bindings:Object.keys(bindings).length,complete:r.complete,reason:r.reason,elapsedMs,oracle,guard:h.guard(),fullScans:scans.filter(e=>e.fields).length,guardChecks:scans.filter(e=>e.operation==='guard').length,scanBrowserMs:scans.reduce((a,b)=>a+(b.browserMs??0),0),scanRoundTripMs:scans.reduce((a,b)=>a+b.totalMs,0),scanBytes:scans.reduce((a,b)=>a+b.bytes,0),evaluations};
 await writeFile(`prototype/reports/validation-cost-${mode}.json`,JSON.stringify(data,null,2));console.log(JSON.stringify({...data,evaluations:undefined},null,2));
 if(!r.complete||!oracle.passed)process.exitCode=1;
}finally{await h.close();}
