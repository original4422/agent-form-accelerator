import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {chromium,expect} from 'playwright/test';
import {createExpenseServer,expenseCases} from './expense-server.mjs';
import {readExpenseDOM} from './expense-evidence.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'afa-expense-')),browser=await chromium.launch({headless:true}),results=[];
const mapping={'Employee name':'员工','Business purpose':'事由','Travel date':'出行日期','Rail fare (GBP)':'火车票金额（英镑）','Distance (km)':'里程（公里）','Vehicle registration':'车牌','Parking (GBP)':'停车费（英镑）','Additional explanation':'补充说明'};
try{for(const [name,scenario] of Object.entries(expenseCases)){
 const app=await createExpenseServer(),page=await browser.newPage();let backend;
 try{
  await writeFile(path.join(root,'source.md'),scenario.source);await page.goto(app.origin+'/expense');await page.getByRole('radio',{name:'Rail',exact:true}).waitFor();
  backend=createPlaywrightBackend(page);const session=await createDocumentSession({sourcePath:path.join(root,'source.md'),request:backend.request});let c=await session.context();
  assert.ok(c.page.formContext.blocks.some(b=>b.text.includes('GBP 0.50')));assert.ok(c.page.formStatus.messages.some(m=>m.text==='Draft saved.'));
  const mode=c.page.fields.find(f=>f.kind==='radio'&&f.label===(name==='rail'?'Rail':'Personal car')),source=c.source.entries.find(e=>e.label==='交通方式');
  const employee=c.page.fields.find(f=>f.label==='Employee name');
  const first=await session.apply({url:c.page.url,bindings:{[mode.ref]:source.id,[employee.ref]:c.source.entries.find(e=>e.label==='员工').id},choices:{[mode.ref]:true}});
  assert.equal(app.oracle().draft.employee,undefined,'a branch change must stop the remaining old plan');
  results.push({name,first:{complete:first.complete,reason:first.reason},passed:false});assert.equal(first.complete,false);assert.equal(first.reason,'FORM_CHANGED_AFTER_WAIT');
  c=await session.context();const bindings=Object.fromEntries(c.page.fields.filter(f=>mapping[f.label]).map(f=>[f.ref,c.source.entries.find(e=>e.label===mapping[f.label]).id]));
  const selected=c.page.fields.find(f=>f.kind==='radio'&&f.value===true);bindings[selected.ref]=c.source.entries.find(e=>e.label==='交通方式').id;
  const result=await session.apply({url:c.page.url,bindings,choices:{[selected.ref]:true}});results.at(-1).result={complete:result.complete,reason:result.reason,coverage:result.coverage};
  assert.equal(result.complete,true,result.reason);assert.equal(result.coverage.visibleRequiredCovered,true);assert.deepEqual(app.oracle().draft,scenario.expected);assert.equal(app.oracle().totalPence,scenario.totalPence);assert.equal(app.oracle().inFlight,0);assert.equal(app.oracle().submissions,0);
  await page.reload();await expect(page.locator('#save-status')).toHaveText('Draft saved.');await expect(page.locator('#total')).toHaveText(`Saved reimbursement total: GBP ${(scenario.totalPence/100).toFixed(2)}`);await expect(page.getByRole('textbox',{name:'Employee name',exact:true})).toHaveValue(scenario.expected.employee);
  const restored=await readExpenseDOM(page);assert.deepEqual(restored.values,scenario.expected);results.at(-1).restored=restored;results.at(-1).server=app.oracle();
  if(name==='rail'){
   const fare=page.getByRole('spinbutton',{name:'Rail fare (GBP)',exact:true});await fare.fill('-1');
   await expect(page.locator('#save-status')).toHaveText('Unsaved changes. Leave the edited field to save.');assert.equal(app.oracle().draft.fare,42.75);
   await fare.blur();assert.equal(app.oracle().draft.fare,42.75);
   await fare.fill('42.75');await fare.blur();await expect(page.locator('#save-status')).toHaveText('Draft saved.');
   await page.getByText('Personal car',{exact:true}).click();await expect(page.locator('#save-status')).toHaveText('Draft saved.');assert.equal(app.oracle().draft.fare,undefined);assert.equal(app.oracle().totalPence,null);
   await page.reload();await page.getByRole('radio',{name:'Personal car',exact:true}).waitFor();assert.equal(await page.getByRole('spinbutton',{name:'Rail fare (GBP)',exact:true}).count(),0);assert.equal(await page.getByRole('spinbutton',{name:'Distance (km)',exact:true}).count(),1);
   results.at(-1).additionalChecks=['dirty before blur','invalid cost never reaches saved draft','returning to saved value clears dirty status','branch switch clears inactive fare','reload restores changed branch'];
  }
  results.at(-1).passed=true;console.log('PASS '+name);
 }catch(e){if(results.at(-1)?.name!==name)results.push({name,passed:false});results.at(-1).error=e.stack;console.error('FAIL '+name,e.message);}finally{backend?.dispose();await page.close();await app.close();}
}}finally{await browser.close();await rm(root,{recursive:true,force:true});await writeFile(process.env.AFA_EXPENSE_REPORT??'prototype/reports/expense-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
