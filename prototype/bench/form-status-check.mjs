import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {chromium,expect} from 'playwright/test';
import {createOnlineFormServer,onlineSource} from './online-form-server.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {projectPage} from '../src/context-projection.mjs';
import {projectReceipt,restoreObservation} from '../src/receipt-projection.mjs';
const browser=await chromium.launch({channel:'chromium',headless:true}),root=await mkdtemp(path.join(os.tmpdir(),'afa-status-')),sourcePath=path.join(root,'source.md');
await writeFile(sourcePath,onlineSource);
const messages=page=>page.formStatus.messages.map(m=>m.text);
try{
 for(const failKey of [undefined,'name']){
  const app=await createOnlineFormServer({delay:500,failKey}),page=await browser.newPage();let backend;
  try{
   await page.goto(app.origin+'/apply/native');await page.getByLabel('Applicant name',{exact:true}).waitFor();backend=createPlaywrightBackend(page);
   const session=await createDocumentSession({sourcePath,request:backend.request});let c=await session.context();
   assert.deepEqual(messages(projectPage(c.page,c.source)),['Changes saved.']);
   const name=page.getByLabel('Applicant name',{exact:true});await name.fill('Alex Fictional');
   c=await session.context();assert.deepEqual(messages(c.page),['Unsaved changes. Leave the edited field to save.']);
   assert.ok(c.page.formStatus.busy.every(b=>b.value===false));
   await name.blur();await expect(page.getByRole('status')).toHaveText('Saving changes…');
   c=await session.context();assert.deepEqual(messages(c.page),['Saving changes…']);assert.ok(c.page.formStatus.busy.some(b=>b.value===true));
   await expect(page.getByRole('status')).toHaveText(failKey?'Some changes were rejected.':'Changes saved.');
   c=await session.context();assert.deepEqual(messages(projectPage(c.page,c.source)),[failKey?'Some changes were rejected.':'Changes saved.']);
   const f=c.page.fields.find(f=>f.label==='Applicant name'),sourceId=c.source.entries.find(s=>s.label==='姓名').id;
   const result=await session.apply({url:c.page.url,bindings:{[f.ref]:sourceId}});
   assert.equal(result.complete,!failKey);assert.deepEqual(messages(result.observation),[failKey?'Some changes were rejected.':'Changes saved.']);
   const projected=projectPage(result.observation,c.source),receipt=projectReceipt({...result,observation:projected},projectPage(c.page,c.source),c.page.documentId,result.observation.documentId);
   const restored=receipt.observation??restoreObservation(projectPage(c.page,c.source),receipt.observationDelta);
   assert.deepEqual(restored.formStatus,result.observation.formStatus);
   console.log('PASS '+(failKey?'rejected':'saved')+': visible status through observation, context and receipt');
  }finally{backend?.dispose();await page.close();await app.close();}
 }
 const app=await createOnlineFormServer(),page=await browser.newPage();await page.goto(app.origin+'/apply/native');await page.setContent('<form aria-busy="false"><label>Name<input></label><p role="status" hidden>Changes saved.</p><p role="alert">Connection lost.</p></form>');
 const backend=createPlaywrightBackend(page);try{const r=await backend.request({op:'inspect'});assert.deepEqual(messages(r),['Connection lost.']);assert.ok(r.formStatus.busy.every(b=>b.value===false));await page.locator('[role=alert]').evaluate(el=>el.removeAttribute('role'));const unknown=await backend.request({op:'inspect'});assert.deepEqual(messages(unknown),[]);console.log('PASS hidden status excluded; idle or absent status never means saved');await page.setContent('<aside role="status">Newsletter preferences saved.</aside><form><section aria-busy="true"><label>Applicant name<input></label><p role="status">Name rejected.</p></section><section><label>Email<input></label></section></form>');
 const scoped=await backend.request({op:'inspect'});assert.deepEqual(messages(scoped),['Name rejected.']);assert.deepEqual(scoped.formStatus.messages[0].fieldRefs,[scoped.fields.find(f=>f.label==='Applicant name').ref]);
 assert.deepEqual(scoped.formStatus.busy,[{value:true,fieldRefs:[scoped.fields.find(f=>f.label==='Applicant name').ref]}]);console.log('PASS local status and busy stay local; unrelated outside status excluded');}finally{backend.dispose();await page.close();await app.close();}
}finally{await browser.close();await rm(root,{recursive:true,force:true});}
