import assert from 'node:assert/strict';
import {writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createHarness} from './harness.mjs';import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';import {validateSearchCondition} from '../src/conditional-choice.mjs';import {discoverQueryPlans} from '../src/query-variants.mjs';
import {conditionalBindings} from './conditional-cases.mjs';import {aliasOracle} from './alias-cases.mjs';
import '../scripts/build-fixtures.mjs';
const h=await createHarness(),request=createPlaywrightBackend(h.page).request,results=[];
const dir=await mkdtemp(path.join(os.tmpdir(),'afa-variants-')),sourcePath=path.join(dir,'source.md'),source=await readFile(new URL('../fixtures/documents/alias-candidate.md',import.meta.url),'utf8');
const setup=async(override=request,enabled=true)=>{
 await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');await writeFile(sourcePath,source);
 const session=await createDocumentSession({sourcePath,request:override,conditionalSelection:true,independentSelection:true,queryVariants:enabled}),context=await session.context(),args=conditionalBindings(context);
 const city=context.page.fields.find(f=>f.label==='Preferred office city').ref;
 args.choices[city].search={queries:['杭州','Hangzhou'],labelParts:['Hangzhou']};return {session,context,args,city};
};
const untouched=async()=>{assert.equal(await h.page.getByLabel('Applicant name',{exact:true}).inputValue(),'');assert.equal(await h.page.getByLabel('Email address',{exact:true}).inputValue(),'');assert.equal(await h.page.evaluate(()=>window.applicationState.city),'');};
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}};
try{
 await check('bounded distinct query variants require opt-in and one fixed condition',()=>{
  for(const search of [{queries:[],labelParts:['x']},{query:'x',queries:['y'],labelParts:['x']},{queries:['x',' X '],labelParts:['x']},{queries:['a','b','c','d'],labelParts:['x']},{queries:['a',3],labelParts:['x']}])assert.throws(()=>validateSearchCondition(search,{queryVariants:true}),/INVALID_SEARCH/);
  assert.throws(()=>validateSearchCondition({queries:['a'],labelParts:['a']}),/INVALID_SEARCH/);
 });
 await check('shared count and time budgets stop additional rounds',async()=>{
  const plans=Array.from({length:5},(_,i)=>({ref:'f'+i,sourceId:'s'+i,condition:{queries:['a','b','c'],labelParts:['Cedar']}}));
  await assert.rejects(discoverQueryPlans({plans,url:'http://local',checkFresh:async()=>{},search:()=>assert.fail('must precheck budget')}),/QUERY_PLAN_LIMIT/);
  let clock=0,calls=0;
  const r=await discoverQueryPlans({plans:plans.slice(0,1),url:'http://local',now:()=>clock,checkFresh:async()=>{},search:async args=>{assert.equal(args.deadline,8000);calls++;clock=8001;return {searches:[{status:'observed',options:[]}]};}});
  assert.equal(calls,1);assert.equal(r.decisions[0].reason,'SEARCH_DEADLINE');
 });
 await check('ambiguity, disabled/conflicting candidates, truncation and blocked searches never advance',async()=>{
  for(const found of [{status:'observed',options:[{label:'Cedar'},{label:'Cedar'}]},{status:'observed',options:[{label:'Cedar',disabled:true}]},{status:'observed',options:[{label:'Other'}]},{status:'observed',options:[],truncated:true},{status:'blocked',reason:'CONTROL_NOT_READY',options:[]}]){
   let calls=0;const r=await discoverQueryPlans({plans:[{ref:'f1',sourceId:'s1',condition:{queries:['雪松','Cedar'],labelParts:['Cedar']}}],url:'http://local',checkFresh:async()=>{},search:async()=>{calls++;return {searches:[found]};}});
   assert.equal(calls,1);assert.ok(!r.decisions[0].option);
  }
 });
 await check('empty Chinese query retries locally and fills two education entities in one apply',async()=>{
  const {session,args,context,city}=await setup(),r=await session.apply(args);
  assert.equal(r.complete,true,JSON.stringify(r));assert.equal(r.discoveryCalls,2);assert.equal(r.conditionalSelections.find(d=>d.ref===city).attempts.length,2);
  assert.equal((await aliasOracle(h.page,context.source.entries.find(e=>e.label==='个人介绍').value)).passed,true);
  assert.deepEqual(await h.page.evaluate(()=>window.searchRequests.slice(0,4).map(r=>r.query)),['杭州','Southern Example College','Northern Example University','Hangzhou']);
 });
 await check('nonempty wrong-campus candidates return unchanged qualifiers without ordinary writes',async()=>{
  const {session,args,context}=await setup(),school=context.page.fields.find(f=>f.label==='Institution').ref;
  args.choices[school].search={queries:['Southern Example College','Northern Example University'],labelParts:['Southern Example College','London campus']};
  const r=await session.apply(args);assert.equal(r.complete,false);const d=r.conditionalSelections.find(d=>d.sourceId===args.bindings[school]);assert.equal(d.reason,'CONDITION_NOT_MET');assert.equal(d.attempts.length,1);await untouched();
 });
 await check('all empty variants exhaust without inventing values and independent groups retain failures',async()=>{
  const {session,args,city}=await setup();delete args.repeatGroups;args.choices[city].search={queries:['Missing A','Missing B'],labelParts:['Hangzhou']};args.independentGroups=Object.keys(args.bindings).map(ref=>[ref]);
  const r=await session.apply(args);assert.equal(r.complete,false);assert.equal(r.partial,true);assert.equal(r.task.unresolvedTargets.length,1);assert.equal(r.task.unresolvedTargets[0].ref,city);assert.equal(r.conditionalSelections.find(d=>d.ref===city).attempts.length,2);assert.equal(await h.page.evaluate(()=>window.applicationState.city),'');assert.equal(await h.page.evaluate(()=>window.submissionCount),0);
 });
 await check('source change after first discovery stops before retry or fact writes',async()=>{
  let calls=0;const {session,args}=await setup(async r=>{const result=await request(r);if(r.op==='discover'){calls++;await writeFile(sourcePath,source+'\nChanged: yes\n');}return result;});
  await assert.rejects(session.apply(args),/SOURCE_CHANGED/);assert.equal(calls,1);await untouched();
 });
 for(const change of ['meaning','document'])await check(`${change} change between discovery rounds stops whole plan`,async()=>{
  let calls=0;const {session,args}=await setup(async r=>{const result=await request(r);if(r.op==='discover'){calls++;if(change==='meaning')await h.page.getByLabel('Applicant name',{exact:true}).evaluate(el=>el.setAttribute('aria-label','Spouse name'));else {await h.page.reload();await h.page.waitForSelector('[role=combobox]');}result.observation=await request({op:'inspect'});}return result;});
  await assert.rejects(session.apply(args),/PLAN_FIELD_CHANGED|PLAN_PAGE_CHANGED/);assert.equal(calls,1);assert.equal(await h.page.evaluate(()=>window.applicationState.fullName),'');
 });
 await check('all ordinary sources validate before even the first fallback query',async()=>{
  const {session,args,context}=await setup();args.bindings[context.page.fields.find(f=>f.label==='Applicant name').ref]='missing';await assert.rejects(session.apply(args),/UNKNOWN_FIELD_OR_SOURCE/);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);await untouched();
 });
 await check('disabled mode rejects variants before browser changes',async()=>{
  const {session,args}=await setup(request,false);await assert.rejects(session.apply(args),/INVALID_SEARCH/);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);await untouched();
 });
}finally{await h.close();await rm(dir,{recursive:true,force:true});await writeFile('prototype/reports/query-variants-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
