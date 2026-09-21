import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {parseDocument} from '../src/document-source.mjs';
import {projectRoot} from '../src/bridge.mjs';
const h=await createHarness(),results=[],dir=await mkdtemp(path.join(os.tmpdir(),'afa-doc-check-'));
const file=path.join(dir,'candidate.md'),original=await readFile(`${projectRoot}/prototype/fixtures/documents/candidate.md`,'utf8');
const backend=process.env.AFA_BACKEND==='playwright'?'playwright':'extension';
const request=backend==='playwright'?createPlaywrightBackend(h.page).request:r=>h.bridge.request(r);
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log(`PASS ${name}`);}catch(e){results.push({name,passed:false,error:e.message});console.error(`FAIL ${name}: ${e.message}`);}};
const setup=async()=>{await h.reset('unfamiliar');await writeFile(file,original);const session=await createDocumentSession({sourcePath:file,request});const context=await session.context();return {session,...context};};
try{
 await check('source parser preserves paragraphs, order, context and URL colons',async()=>{
  const source=parseDocument('# Resume\n\n## Links\nSite: https://example.test/me\n\n## Summary\nA first line.\nA second line.\n');
  assert.deepEqual(source.entries.map(({label,value,line})=>({label,value,line})),[{label:'Site',value:'https://example.test/me',line:4},{label:'Summary',value:'A first line.\nA second line.',line:7}]);
  assert.equal(source.entries[1].context,'Resume / Summary');
 });
 await check('hidden helper text and decorative aria-hidden stars excluded',async()=>{
  const {page}=await setup();assert.equal(page.fields.find(f=>f.domId==='full').label,'Full name');
  assert.equal(page.fields.find(f=>f.domId==='mail').label,'Contact email');assert.equal(page.fields.find(f=>f.domId==='home').label,'Current city');
 });
 await check('explicit hidden aria-labelledby reference remains a label',async()=>{
  await setup();await h.page.evaluate(()=>{const n=document.createElement('span');n.id='hidden-label';n.hidden=true;n.textContent='Accessible name';document.body.append(n);document.getElementById('full').setAttribute('aria-labelledby',n.id);});
  const o=await request({op:'inspect'});assert.equal(o.fields.find(f=>f.domId==='full').label,'Accessible name');
 });
 await check('two Yes/No questions have separate observed meanings',async()=>{
  const {page}=await setup();assert.equal(page.fields.find(f=>f.domId==='move-y').group,'Would you relocate for this position?');
  assert.equal(page.fields.find(f=>f.domId==='share-n').group,'May we share your details with other employers?');
 });
 await check('unmapped Markdown references fill multilingual form without copying paragraphs',async()=>{
  const {session,source,page}=await setup(),bindings={},choices={};
  const mapping={full:'姓名',mail:'电子邮箱',tel:'手机',home:'居住地',college:'院校',course:'专业',degree:'最高学历',grad:'预计毕业日期','move-y':'是否愿意异地工作','share-n':'是否同意向其他雇主分享资料',intro:'自我介绍',project:'项目经历'};
  for(const [domId,label]of Object.entries(mapping)){const f=page.fields.find(f=>f.domId===domId),e=source.entries.find(e=>e.label===label);bindings[f.ref]=e.id;if(domId==='degree')choices[f.ref]='pg';if(f.kind==='radio')choices[f.ref]=true;}
  const r=await session.apply({url:page.url,bindings,choices});assert.equal(r.complete,true,JSON.stringify(r));
  const state=await h.page.evaluate(()=>({data:window.applicationState,submits:window.submissionCount}));
  assert.equal(state.data.full,'林示例');assert.equal(state.data.move,'yes');assert.equal(state.data.share,'no');assert.equal(state.data.degree,'pg');
  assert.equal(state.data.intro,source.entries.find(e=>e.label==='自我介绍').value);assert.equal(state.data.project,source.entries.find(e=>e.label==='项目经历').value);assert.equal(state.submits,0);
 });
 await check('page relabel after context is rejected before mutation',async()=>{
  const {session,source,page}=await setup(),f=page.fields.find(f=>f.domId==='full');
  await h.page.locator('#full').evaluate(el=>el.setAttribute('aria-label','Bank account'));
  await assert.rejects(session.apply({url:page.url,bindings:{[f.ref]:source.entries.find(e=>e.label==='姓名').id}}),/FIELD_CHANGED/);
  assert.equal(await h.page.locator('#full').inputValue(),'');
 });
 await check('source change after context is rejected before mutation',async()=>{
  const {session,source,page}=await setup();await writeFile(file,original+'\nNew information.');
  await assert.rejects(session.apply({url:page.url,bindings:{[page.fields[0].ref]:source.entries[1].id}}),/SOURCE_CHANGED/);
  assert.equal(await h.page.locator('#full').inputValue(),'');
 });
 await check('unobserved choices and arbitrary text overrides rejected',async()=>{
  const {session,source,page}=await setup(),f=page.fields.find(f=>f.domId==='degree');
  await assert.rejects(session.apply({url:page.url,bindings:{[f.ref]:source.entries.find(e=>e.label==='最高学历').id},choices:{[f.ref]:'invented'}}),/CHOICE_NOT_OBSERVED/);
  const name=page.fields.find(f=>f.domId==='full');await assert.rejects(session.apply({url:page.url,bindings:{[name.ref]:source.entries[1].id},choices:{[name.ref]:'made up'}}),/CHOICE_NOT_OBSERVED/);
 });
}finally{await h.close();await rm(dir,{recursive:true,force:true});await writeFile(`${projectRoot}/prototype/reports/${backend==='playwright'?'playwright-':''}document-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
