import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';
import{createOfflinePublicHarness}from'./offline-public-harness.mjs';import{createPlaywrightBackend}from'./playwright-backend.mjs';import{createDocumentSession}from'../src/document-session.mjs';
import {greenhouseOracle} from './greenhouse-cases.mjs';
const url='https://job-boards.greenhouse.io/cloudflare/jobs/7377424',h=await createOfflinePublicHarness(url,{loadReadiness:'networkidle'});let report={date:new Date().toISOString(),url,scope:'Actual Greenhouse DOM after full network freeze, fictional source. Unavailable remote-dependent fields remain unresolved. No upload/submit.'};
try{
 const b=createPlaywrightBackend(h.page),session=await createDocumentSession({sourcePath:new URL('../fixtures/documents/greenhouse-candidate.md',import.meta.url),request:b.request,conditionalSelection:true}),c=await session.context();
 const field=label=>{const fs=c.page.fields.filter(f=>f.label===label);assert.equal(fs.length,1,label);return fs[0];},source=label=>c.source.entries.find(e=>e.label===label).id;
 const map={'First Name':'名','Last Name':'姓','Preferred First Name':'常用名','Email':'邮箱','Phone':'本地电话号码','Country':'电话号码国家','School':'学校英文名','Degree':'学历','Discipline':'专业','Are you fluent in English?':'英语是否流利','Do you now or will you in the future require immigration sponsorship to work at Cloudflare?':'现在或未来是否需要雇主签证支持','Would you like to include your LinkedIn profile, personal website or blog?':'个人网站','How did you hear about this job?':'获知渠道'};
 const planned=[['Country','United States',['United States']],['School','Tsinghua',['Tsinghua University']],['Degree','Master',['Master','Science']],['Discipline','Computer',['Computer Science']],['Are you fluent in English?','Yes',['Yes']],['Do you now or will you in the future require immigration sponsorship to work at Cloudflare?','No',['No']]];
 const bindings=Object.fromEntries(Object.entries(map).map(([f,s])=>[field(f).ref,source(s)])),choices=Object.fromEntries(planned.map(([label,query,labelParts])=>[field(label).ref,{search:{query,labelParts}}]));
 const first=await session.apply({url,bindings,choices});report.first={complete:first.complete,reason:first.reason,decisions:first.conditionalSelections,coverage:first.coverage};
 assert.equal(first.complete,false);assert.equal(first.reason,'CONDITIONAL_SELECTION_UNRESOLVED');
 assert.equal(await h.page.getByRole('textbox',{name:'First Name',exact:true}).inputValue(),'');
 assert.equal(await h.page.getByRole('textbox',{name:'Email',exact:true}).inputValue(),'');
 const unavailable=new Set(first.conditionalSelections.filter(d=>!d.option).map(d=>d.ref));
 const availableBindings=Object.fromEntries(Object.entries(bindings).filter(([ref])=>!unavailable.has(ref)));
 const availableChoices=Object.fromEntries(first.conditionalSelections.filter(d=>d.option).map(d=>[d.ref,{optionRef:d.option.optionRef}]));
 const applied=await session.apply({url,bindings:availableBindings,choices:availableChoices});
 report.second={complete:applied.complete,reason:applied.reason,evidence:applied.evidence,coverage:applied.coverage};report.guard=h.guard();
 report.dom=await h.page.locator('input,textarea,.select__single-value').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&!n.closest('[hidden],[inert],[aria-hidden=true]')).map(n=>({id:n.id,name:n.name,type:n.type,value:n.value,label:n.classList.contains('select__single-value')?n.textContent:undefined,checked:n.type==='checkbox'?n.checked:undefined})));
 report.submitAttempts=await h.page.evaluate(()=>window.__afaSubmitAttempts);assert.equal(report.submitAttempts,0);
 report.oracle=await greenhouseOracle(h.page);
 assert.equal(applied.complete,true,applied.reason);assert.equal(report.oracle.passed,true,report.oracle.errors.join('; '));
 console.log(JSON.stringify(report,null,2));
}finally{await writeFile('prototype/reports/greenhouse-check.json',JSON.stringify(report,null,2));await h.close();}
