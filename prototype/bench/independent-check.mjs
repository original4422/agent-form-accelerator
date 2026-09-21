import assert from 'node:assert/strict';
import {writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {validateIndependentGroups} from '../src/independent-plan.mjs';
import {conditionalBindings} from './conditional-cases.mjs';
import '../scripts/build-fixtures.mjs';
const h=await createHarness(),request=createPlaywrightBackend(h.page).request,results=[];
const dir=await mkdtemp(path.join(os.tmpdir(),'afa-independent-')),sourcePath=path.join(dir,'source.md');
const source=await readFile(new URL('../fixtures/documents/alias-candidate.md',import.meta.url),'utf8');
const setup=async(override=request,enabled=true)=>{
  await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');await writeFile(sourcePath,source);
  const session=await createDocumentSession({sourcePath,request:override,conditionalSelection:true,independentSelection:enabled}),context=await session.context();
  const args=conditionalBindings(context);delete args.repeatGroups;
  const ref=label=>context.page.fields.find(f=>f.label===label).ref;
  const school=ref('Institution'),subject=ref('Subject');
  args.independentGroups=Object.keys(args.bindings).filter(r=>![school,subject].includes(r)).map(r=>[r]);args.independentGroups.push([school,subject]);
  args.choices[school].search.labelParts=['Southern Example College'];
  return {session,context,args,ref};
};
const untouched=async()=>{assert.equal(await h.page.getByLabel('Applicant name',{exact:true}).inputValue(),'');assert.equal(await h.page.getByLabel('Email address',{exact:true}).inputValue(),'');assert.equal(await h.page.getByLabel('Subject',{exact:true}).inputValue(),'');};
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}};
try {
  await check('ambiguous school defers its whole dependency group and fills independent facts once',async()=>{
    const {session,args}=await setup(),r=await session.apply(args);
    assert.equal(r.complete,false);assert.equal(r.partial,true);assert.equal(r.appliedSubsetComplete,true);
    const s=await h.page.evaluate(()=>window.applicationState);
    assert.equal(s.fullName,'林示例');assert.equal(s.email,'candidate@example.test');assert.equal(s.city,'hz');assert.equal(s.country,'cn');assert.equal(s.degree,'pg');assert.ok(s.summary);assert.deepEqual(s.schools,[{school:'',major:''}]);assert.equal(s.availableFrom,'');
    assert.deepEqual(r.task.unresolvedTargets.map(t=>t.label).sort(),['Institution','Subject']);
    assert.equal(r.task.unresolvedTargets.find(t=>t.label==='Subject').reason,'DEPENDENT_TARGET_UNRESOLVED');
    assert.equal(await h.page.evaluate(()=>window.submissionCount),0);
  });
  await check('unresolved target persists after its field disappears and context refreshes',async()=>{
    const {session,args}=await setup();await session.apply(args);
    await h.page.getByLabel('Institution',{exact:true}).evaluate(el=>el.closest('.field').hidden=true);
    const c=await session.context();assert.ok(!c.page.fields.some(f=>f.label==='Institution'));
    assert.equal(c.task.unresolvedTargets.find(t=>t.label==='Institution').currentPresence,'absent');
    assert.equal(c.task.complete,false);
    await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');assert.equal((await session.context()).task,undefined);
  });
  await check('later observed-option recovery clears only genuinely verified pending targets',async()=>{
    const {session,args,ref}=await setup(),r=await session.apply(args),school=ref('Institution'),subject=ref('Subject');
    const option=r.searches.find(s=>s.ref===school).options.find(o=>o.label.includes('Shenzhen'));
    const recovered=await session.apply({url:args.url,bindings:{[school]:args.bindings[school],[subject]:args.bindings[subject]},choices:{[school]:{optionRef:option.optionRef}}});
    assert.equal(recovered.complete,true);assert.equal(recovered.task.complete,true);assert.equal(await h.page.evaluate(()=>window.applicationState.schools[0].school),'school-south');
    await h.page.getByLabel('Applicant name',{exact:true}).fill('');
    const c=await session.context();assert.deepEqual(c.task.unresolvedTargets.map(t=>t.label),['Applicant name']);
  });
  await check('all deferred means no ordinary writes and no false partial success',async()=>{
    const {session,args}=await setup();args.independentGroups=[Object.keys(args.bindings)];const r=await session.apply(args);
    assert.equal(r.complete,false);assert.equal(r.partial,false);assert.equal(r.bindings.length,0);assert.equal(r.task.unresolvedTargets.length,Object.keys(args.bindings).length);await untouched();
  });
  await check('missing, duplicate and foreign partition refs fail before queries',async()=>{
    for(const kind of ['missing','duplicate','foreign']){
      const {session,args}=await setup();if(kind==='missing')args.independentGroups.pop();if(kind==='duplicate')args.independentGroups.push(args.independentGroups[0]);if(kind==='foreign')args.independentGroups[0]=['missing'];
      await assert.rejects(session.apply(args),/MUST_PARTITION/);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);await untouched();
    }
  });
  await check('unsupported ordinary source validates before any query or write',async()=>{
    const {session,args,ref}=await setup();args.bindings[ref('Applicant name')]='missing';await assert.rejects(session.apply(args),/UNKNOWN_FIELD_OR_SOURCE/);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);await untouched();
  });
  await check('source drift stops independent continuation',async()=>{
    const {session,args}=await setup(async r=>{const result=await request(r);if(r.op==='discover')await writeFile(sourcePath,source+'\nChanged: yes\n');return result;});
    await assert.rejects(session.apply(args),/SOURCE_CHANGED/);await untouched();
  });
  for(const label of ['Applicant name','Institution'])await check(`meaning drift in ${label} stops every independent group`,async()=>{
    const {session,args}=await setup(async r=>{const result=await request(r);if(r.op==='discover'){await h.page.getByLabel(label,{exact:true}).evaluate(el=>el.setAttribute('aria-label','Changed meaning'));result.observation=await request({op:'inspect'});}return result;});
    await assert.rejects(session.apply(args),/PLAN_FIELD_CHANGED|PLAN_SEARCH_INTEGRITY_FAILED/);assert.equal(await h.page.evaluate(()=>window.applicationState.fullName),'');assert.equal(await h.page.evaluate(()=>window.applicationState.email),'');
  });
  await check('document replacement stops continuation',async()=>{
    const {session,args}=await setup(async r=>{const result=await request(r);if(r.op==='discover'){await h.page.reload();await h.page.waitForSelector('[role=combobox]');result.observation=await request({op:'inspect'});}return result;});
    await assert.rejects(session.apply(args),/PLAN_PAGE_CHANGED/);await untouched();assert.equal((await session.context()).task,undefined);
  });
  await check('unexpected search failures cannot be treated as unavailable options',async()=>{
    const {session,args}=await setup(async r=>{const result=await request(r);if(r.op==='discover')result.searches[0]={ref:r.queries[0].ref,status:'blocked',reason:'UNEXPECTED_BACKEND_FAILURE',options:[]};return result;});
    await assert.rejects(session.apply(args),/PLAN_SEARCH_INTEGRITY_FAILED/);await untouched();
  });
  await check('default conditional mode does not silently enable independent writes',async()=>{
    const {session,args}=await setup(request,false);await assert.rejects(session.apply(args),/INDEPENDENT_SELECTION_NOT_ENABLED/);await untouched();
  });
  await check('choice-question members cannot be assigned to different dependency groups',()=>{
    assert.throws(()=>validateIndependentGroups({independentGroups:[['a'],['b']]},[{ref:'a',kind:'radio',group:'Work permission'},{ref:'b',kind:'radio',group:'Work permission'}]),/CHOICE_QUESTION_SPLIT/);
  });
  await check('expansion plans reject the independent option before querying',async()=>{
    const {session,args,context}=await setup();args.repeatGroups=conditionalBindings(context).repeatGroups;await assert.rejects(session.apply(args),/INDEPENDENT_EXPANSION_NOT_SUPPORTED/);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);await untouched();
  });
} finally {await h.close();await rm(dir,{recursive:true,force:true});await writeFile('prototype/reports/independent-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
