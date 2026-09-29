import assert from 'node:assert/strict';
import {chromium,expect} from 'playwright/test';
import {createOnlineFormServer,onlineExpected,onlineDraftMatches} from './online-form-server.mjs';

const browser=await chromium.launch({channel:'chromium',headless:true});
try{
 for(const variant of ['native','radix','search']){
  const app=await createOnlineFormServer(),page=await browser.newPage();
  try{
   await page.goto(app.origin+'/apply/'+variant);
   const decision=page.getByLabel('A project decision',{exact:true}),status=page.getByRole('status');
   await decision.fill(onlineExpected.decision);
   await expect(status).toHaveText('Unsaved changes. Leave the edited field to save.');
   await expect(decision).toHaveValue(onlineExpected.decision);
   assert.equal(app.oracle().draft.decision,undefined);
   await decision.press('Tab');
   await expect(status).toHaveText('Changes saved.');
   assert.equal(app.oracle().draft.decision,onlineExpected.decision);
   const subject=page.getByLabel('Subject',{exact:true});
   await subject.fill(onlineExpected.major0);
   await page.getByRole('button',{name:'Add education',exact:true}).click();
   await expect(status).toHaveText('Changes saved.');
   const actual=app.oracle();
   assert.equal(actual.draft.major0,onlineExpected.major0);
   assert.equal(actual.rows,2);
   assert.ok(actual.events.every(e=>!e.overlap));
   assert.deepEqual(actual.events.map(e=>e.key),['decision','challenge','major0','rows']);
   console.log('PASS '+variant+': dirty status, stable text label, blur/click save queue');
  }finally{await page.close();await app.close();}
 }
 assert.ok(onlineDraftMatches({...onlineExpected,challenge:'',lesson:''}));
 assert.equal(onlineDraftMatches({...onlineExpected,decision:''}),false);
 assert.equal(onlineDraftMatches({...onlineExpected,lesson:'Second answer'}),false);
 console.log('PASS oracle: optional blanks accepted; missing or extra answers rejected');
}finally{await browser.close();}
