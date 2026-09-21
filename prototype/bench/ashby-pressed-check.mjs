import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {createAshbyFrozenHarness,ashbyPressedOracle,ashbyApplicationUrl} from './ashby-frozen-harness.mjs';import {createPlaywrightBackend} from './playwright-backend.mjs';import {createDocumentSession} from '../src/document-session.mjs';
const report={date:new Date().toISOString(),scope:'Actual public Ashby DOM after TCP/HTTP/WebSocket freeze. Fictional source, six supported targets only, no upload or submit. No speed comparison.'};let h;
try{
 h=await createAshbyFrozenHarness();report.beforeGuard=h.guard();const {request}=createPlaywrightBackend(h.page),session=await createDocumentSession({request,sourcePath:new URL('../fixtures/documents/ashby-fictional-a.md',import.meta.url)}),c=await session.context();
 report.observed=c.page.fields.map(({ref,label,group,kind,supported,value})=>({ref,label,group,kind,supported,value}));assert.equal(c.page.fields.filter(f=>f.kind==='pressed-choice').length,4);
 const field=(label,group='')=>{const a=c.page.fields.filter(f=>f.label===label&&f.group===group);assert.equal(a.length,1,label);return a[0];},source=label=>{const s=c.source.entries.find(e=>e.label===label);assert.ok(s,label);return s.id;};
 const sponsorship='Will you now or in the future require sponsorship for employment visa status to work in this location?',experience='Do you have 4+ years of experience as a full-time engineer?';
 const yesno=[[field('No',sponsorship),'签证支持'],[field('Yes',experience),'全职工程经验']];
 const main=c.page.fields.find(f=>f.kind==='textarea'&&f.label.startsWith('Describe a role you were in')),one=c.page.fields.find(f=>f.kind==='textarea'&&f.label.startsWith('Describe a choice you made'));assert.ok(main&&one);
 const planned=[[field('Name'),'姓名'],[field('Email'),'邮箱'],...yesno,[main,'最好的项目经历'],[one,'主动提出技术方案的经历']];
 const args={url:ashbyApplicationUrl,bindings:Object.fromEntries(planned.map(([f,s])=>[f.ref,source(s)])),choices:Object.fromEntries(yesno.map(([f])=>[f.ref,true]))};
 const result=await session.apply(args);report.result={complete:result.complete,reason:result.reason,evidence:result.evidence,coverage:result.coverage};report.oracle=await ashbyPressedOracle(h.page);report.afterGuard=h.guard();
 assert.equal(result.complete,true,result.reason);assert.equal(result.evidence.length,6);assert.equal(report.oracle.diagnostic.submits,0);assert.equal(report.oracle.diagnostic.choiceClicks,2);assert.ok(report.oracle.fileCounts.every(n=>n===0));
 assert.deepEqual(report.oracle.choices.map(q=>q.states.filter(s=>s.pressed==='true').map(s=>s.option)),[['no'],['yes']]);assert.deepEqual(report.oracle.choices.map(q=>q.nativeChecked),[false,true]);
 assert.equal(report.afterGuard.activeTransportSockets,0);assert.equal(report.afterGuard.state,'frozen');report.passed=true;
 console.log(JSON.stringify({passed:true,targets:result.evidence.length,remainingUnsupported:result.coverage.unsupported,guard:report.afterGuard},null,2));
}catch(e){report.error=e.stack;report.passed=false;process.exitCode=1;console.error(e.message);}
finally{await h?.close();await writeFile('prototype/reports/ashby-pressed-check.json',JSON.stringify(report,null,2));}
