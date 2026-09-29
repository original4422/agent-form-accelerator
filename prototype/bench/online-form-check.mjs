import assert from 'node:assert/strict';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {chromium} from 'playwright';
import {createOnlineFormServer,onlineSource,onlineExpected,onlineDraftMatches} from './online-form-server.mjs';import {createPlaywrightBackend} from './playwright-backend.mjs';import {createDocumentSession} from '../src/document-session.mjs';
const results=[],root=await mkdtemp(path.join(os.tmpdir(),'afa-online-check-')),sourcePath=path.join(root,'facts.md'),browser=await chromium.launch({channel:'chromium',headless:true});await writeFile(sourcePath,onlineSource);
const mapping={'Country of residence':'居住国家','Applicant name':'姓名','Email address':'邮箱','Preferred office city':'意向城市','Qualification level':'学历','Earliest available start date':'最早到岗','UK work authorization':'英国工作许可','Personal statement':'个人介绍','A project decision':'项目决策','Institution':'学校','Subject':'专业'};
export function planFor(c){
 const bindings={},choices={};
 const bind=(f,context)=>{const candidates=c.source.entries.filter(e=>e.label===mapping[f.label]&&(!context||e.context===context));assert.equal(candidates.length,1,f.label+' '+context);const s=candidates[0];bindings[f.ref]=s.id;if(f.kind==='autocomplete')choices[f.ref]={search:{query:s.value,labelParts:[s.value]}};return s;};
 for(const f of c.page.fields)if(mapping[f.label])bind(f,f.group==='Education 1'?'教育经历 1':undefined);
 const template=c.page.fields.filter(f=>f.group==='Education 1'),repeat={templateGroup:'Education 1',expectGroup:'Education 2',controlRef:c.page.controls.find(f=>f.label==='Add education').ref,bindings:{},choices:{}};
 for(const f of template){const s=c.source.entries.find(e=>e.context==='教育经历 2'&&e.label===mapping[f.label]);assert.ok(s);repeat.bindings[f.ref]=s.id;if(f.kind==='autocomplete')repeat.choices[f.ref]={search:{query:s.value,labelParts:[s.value]}};}
 return {url:c.page.url,bindings,choices,repeatGroups:[repeat]};
}
try{
 for(const variant of (process.env.AFA_ONLINE_VARIANTS??'native,radix,search').split(',')){
  const app=await createOnlineFormServer(),page=await browser.newPage();let backend;
  try{
   await page.goto(app.origin+'/apply/'+variant);await page.getByLabel('Country of residence',{exact:true}).waitFor();backend=createPlaywrightBackend(page);const session=await createDocumentSession({sourcePath,request:backend.request,conditionalSelection:true});let c=await session.context();
   const country=c.page.fields.find(f=>f.label==='Country of residence'),name=c.page.fields.find(f=>f.label==='Applicant name'),source=label=>c.source.entries.find(e=>e.label===label).id;
   const first=await session.apply({url:c.page.url,bindings:{[country.ref]:source('居住国家'),[name.ref]:source('姓名')}});
   const firstState=app.oracle();results.push({variant,passed:false,first:{complete:first.complete,reason:first.reason,server:firstState}});
   assert.equal(first.complete,false);assert.equal(first.reason,'FORM_CHANGED_AFTER_WAIT');assert.equal(firstState.draft.name,undefined,'old plan crossed the busy boundary');assert.equal(firstState.inFlight,0);assert.ok(!firstState.events.some(e=>e.overlap));
   c=await session.context();const args=planFor(c),r=await session.apply(args);const server=app.oracle();Object.assign(results.at(-1),{result:{complete:r.complete,reason:r.reason,coverage:r.coverage},server});
   assert.equal(r.complete,true,r.reason);assert.ok(r.observation.formStatus.messages.some(m=>m.text==='Changes saved.'));assert.ok(r.observation.formStatus.busy.every(b=>!b.value));assert.ok(onlineDraftMatches(server.draft));assert.equal(server.rows,2);assert.equal(server.inFlight,0);assert.equal(server.submissions,0);assert.equal(server.events.length,14);assert.ok(server.events.every(e=>!e.overlap));assert.equal(r.coverage.visibleRequiredCovered,true);assert.equal(await page.getByLabel('A challenge to an existing requirement',{exact:true}).inputValue(),'');assert.equal(await page.getByLabel('A lesson learned',{exact:true}).inputValue(),'');results.at(-1).passed=true;console.log('PASS '+variant);
  }catch(e){if(results.at(-1)?.variant!==variant)results.push({variant,passed:false});results.at(-1).error=e.stack;console.error('FAIL '+variant+': '+e.message);}
  finally{backend?.dispose();await page.close();await app.close();}
 }
}finally{await browser.close();await rm(root,{recursive:true,force:true});await writeFile(process.env.AFA_ONLINE_REPORT??'prototype/reports/online-form-checks.json',JSON.stringify({date:new Date().toISOString(),scope:'Owned online draft; 13 values, two education rows, server-driven authorization question, one-of-three essay, no attachments/submission.',results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
