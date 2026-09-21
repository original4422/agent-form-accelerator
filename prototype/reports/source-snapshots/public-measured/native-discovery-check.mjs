import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {projectPage} from '../src/context-projection.mjs';
const h=await createHarness(),results=[];
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.message});console.log('FAIL '+name+': '+e.message);}};
try{
 await h.reset('plain');await h.page.locator('body').evaluate(b=>{b.innerHTML='<form><label>University<select name="university"></select></label></form>';const s=b.querySelector('select');for(let i=0;i<3302;i++)s.add(new Option(i===3210?'Tsinghua University':`Example College ${i}`,`id${i}`));});
 const request=createPlaywrightBackend(h.page).request;
 const session=await createDocumentSession({sourcePath:new URL('../fixtures/documents/public-candidate.md',import.meta.url),request});
 const c=await session.context(),f=c.page.fields[0],entry=c.source.entries.find(e=>e.label==='大学英文名称');
 await check('large lists retain current and exact source matches, flag omissions',async()=>{const p=projectPage(c.page,c.source,{optionMode:'compact'}).fields[0];assert.equal(p.optionCount,3302);assert.equal(p.optionsTruncated,true);assert.deepEqual(p.options.map(o=>o.value),['id0','id3210']);assert.ok(JSON.stringify(p).length<1000);});
 await check('omitted native choices are discoverable and broad results are explicit',async()=>{const r=await session.search({url:c.page.url,queries:[{ref:f.ref,sourceId:entry.id,query:'Example College'}]});assert.equal(r.searches[0].totalMatches,3301);assert.equal(r.searches[0].truncated,true);assert.equal(r.searches[0].options.length,40);});
 await check('native discovery selects a unique label and actual native value',async()=>{const r=await session.search({url:c.page.url,queries:[{ref:f.ref,sourceId:entry.id,query:'tsinghua'}]});const a=await session.apply({url:c.page.url,bindings:{[f.ref]:entry.id},choices:{[f.ref]:{optionRef:r.searches[0].options[0].optionRef}}});assert.equal(a.complete,true);assert.equal(await h.page.locator('select').inputValue(),'id3210');});
 await check('duplicate visible native labels are never resolved by hidden values',async()=>{await h.page.locator('select').evaluate(s=>s.add(new Option('Tsinghua University','another-id')));const c=await session.context();const r=await session.search({url:c.page.url,queries:[{ref:f.ref,sourceId:entry.id,query:'tsinghua'}]});await assert.rejects(session.apply({url:c.page.url,bindings:{[f.ref]:entry.id},choices:{[f.ref]:{optionRef:r.searches[0].options[0].optionRef}}}),/OPTION_CHANGED_OR_AMBIGUOUS/);});
}finally{await h.close();await writeFile('prototype/reports/native-discovery-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
