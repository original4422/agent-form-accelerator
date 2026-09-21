import assert from 'node:assert/strict';
import {writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {createHarness} from './harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {validateSearchCondition,chooseObservedOption} from '../src/conditional-choice.mjs';
import {conditionalBindings} from './conditional-cases.mjs';
import {aliasOracle,aliasQueries} from './alias-cases.mjs';
import {projectRoot} from '../src/bridge.mjs';
import '../scripts/build-fixtures.mjs';
const h=await createHarness(),request=createPlaywrightBackend(h.page).request,results=[],dir=await mkdtemp(path.join(os.tmpdir(),'afa-conditional-check-'));
const sourcePath=path.join(dir,'candidate.md'),source=await readFile(`${projectRoot}/prototype/fixtures/documents/alias-candidate.md`,'utf8');
const setup=async(options={})=>{await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');await writeFile(sourcePath,source);const session=await createDocumentSession({sourcePath,request:options.request??request,conditionalSelection:options.enabled!==false});const context=await session.context();return {session,context,args:conditionalBindings(context),queries:aliasQueries(context)};};
const untouched=async()=>{const s=await h.page.evaluate(()=>window.applicationState);assert.equal(s.fullName,'');assert.equal(s.email,'');assert.equal(s.city,'');assert.equal(s.schools[0].school,'');assert.equal(s.schools.length,1);assert.equal(await h.page.locator('[role=listbox]').count(),0);};
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}};
try{
 await check('literal phrase conditions normalize case/punctuation/fullwidth and respect word boundaries',()=>{
  const s={status:'observed',options:[{label:'ＳＯＵＴＨＥＲＮ Example College — Shenzhen campus',optionRef:'a'},{label:'Southern Example College — Nanjing campus',optionRef:'b'}]};
  assert.equal(chooseObservedOption(s,{labelParts:['southern example college','Shenzhen campus']}).option.optionRef,'a');
  assert.equal(chooseObservedOption({status:'observed',options:[{label:'Yorkshire'}]},{labelParts:['York']}).reason,'CONDITION_NOT_MET');
  assert.throws(()=>validateSearchCondition({query:'x',labelParts:['.*']}),/INVALID_SEARCH/);
 });
 await check('truncated, disabled, ambiguous and blocked results never supply a selection',()=>{
  const one={status:'observed',options:[{label:'Hangzhou',optionRef:'a'}]},c={labelParts:['Hangzhou']};
  assert.equal(chooseObservedOption({...one,truncated:true},c).reason,'TRUNCATED_CHOICES');
  assert.equal(chooseObservedOption({...one,options:[{...one.options[0],disabled:true}]},c).reason,'CONDITION_NOT_MET');
  assert.equal(chooseObservedOption({...one,options:[...one.options,{label:'Hangzhou',optionRef:'b'}]},c).reason,'AMBIGUOUS_CONDITION');
  assert.ok(!chooseObservedOption({...one,status:'blocked'},c).option);
 });
 await check('all source facts and two education entities filled in one conditional apply',async()=>{
  const {session,context,args}=await setup();const r=await session.apply(args);assert.equal(r.complete,true,JSON.stringify(r));assert.equal(r.bindings.length,10);assert.equal(r.conditionalSelections.length,3);assert.equal(r.discoveryCalls,1);assert.deepEqual(r.coverage.unresolvedRequired.map(f=>f.label),['Earliest available start date']);assert.equal((await aliasOracle(h.page,context.source.entries.find(e=>e.label==='个人介绍').value)).passed,true);
 });
 await check('missing qualifier returns candidates without writing even otherwise-known facts',async()=>{
  const {session,args,queries}=await setup();args.choices[queries[1].ref].search.labelParts=['Southern Example College'];const r=await session.apply(args);assert.equal(r.complete,false);assert.equal(r.reason,'CONDITIONAL_SELECTION_UNRESOLVED');assert.ok(r.conditionalSelections.some(d=>d.reason==='AMBIGUOUS_CONDITION'));assert.equal(r.searches[1].options.length,2);await untouched();
  // Recover using the returned observed optionRefs, without another discovery.
  for(const s of r.searches){const option=s.options.find(o=>!o.label.includes('Nanjing'));const target=args.bindings[s.ref]===s.sourceId?args:args.repeatGroups[0];target.choices[s.ref]={optionRef:option.optionRef};}
  const recovered=await session.apply(args);assert.equal(recovered.complete,true);
 });
 await check('wrong predicted qualifier is not silently weakened',async()=>{
  const {session,args,queries}=await setup();args.choices[queries[1].ref].search.labelParts.push('London campus');const r=await session.apply(args);assert.equal(r.complete,false);assert.ok(r.conditionalSelections.some(d=>d.reason==='CONDITION_NOT_MET'));await untouched();
 });
 await check('duplicate visible city labels block the entire planned fill',async()=>{
  const {session,args}=await setup();await h.page.evaluate(()=>window.duplicateSearch=true);const r=await session.apply(args);assert.equal(r.complete,false);assert.ok(r.conditionalSelections.some(d=>d.reason==='AMBIGUOUS_CONDITION'));await untouched();
 });
 await check('all conditional sources validate before any query',async()=>{
  const {session,args,queries}=await setup();args.repeatGroups[0].bindings[queries[2].ref]='unknown';await assert.rejects(session.apply(args),/UNKNOWN_SOURCE/);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);await untouched();
 });
 await check('source modified during search blocks subsequent writes',async()=>{
  const {session,args}=await setup({request:async r=>{const result=await request(r);if(r.op==='discover')await writeFile(sourcePath,source+'\nChanged: yes\n');return result;}});await assert.rejects(session.apply(args),/SOURCE_CHANGED/);await untouched();
 });
 await check('field relabel during discovery returns to host before fact writes',async()=>{
  const {session,args}=await setup();await h.page.getByLabel('Preferred office city',{exact:true}).evaluate(el=>el.addEventListener('blur',()=>el.setAttribute('aria-label','Spouse city'),{once:true}));const r=await session.apply(args);assert.equal(r.complete,false);await untouched();
 });
 await check('disappearance between discovery and selected-label recheck cannot complete',async()=>{
  const {session,args}=await setup({request:async r=>{const result=await request(r);if(r.op==='discover')await h.page.evaluate(()=>window.emptySearch=true);return result;}});const r=await session.apply(args);assert.equal(r.complete,false);assert.equal(await h.page.evaluate(()=>window.applicationState.city),'');
 });
 await check('ordinary mode rejects conditional overrides without any query or fact write',async()=>{
  const {session,args}=await setup({enabled:false});await assert.rejects(session.apply(args),/INVALID_OPTION_REFERENCE/);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);await untouched();
 });
}finally{await h.close();await rm(dir,{recursive:true,force:true});await writeFile('prototype/reports/conditional-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
