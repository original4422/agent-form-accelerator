// Read-only structural audit in a fresh browser. No application fields are filled.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {executeFormRequest} from '../extension/form-runtime.js';
import {projectRoot} from '../src/bridge.mjs';
const pages = [
  ['greenhouse', 'https://job-boards.greenhouse.io/lusternational/jobs/4807930008'],
  ['lever', 'https://jobs.lever.co/palantir/c34b424e-caf2-455a-b104-ae1096ccca29/apply'],
];
const browser = await chromium.launch({channel:'chromium',headless:true}), rows=[];
try {
  for(const [site,url] of pages) {
    const page=await browser.newPage();
    try {
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForSelector('input,textarea,select',{timeout:15000});
      const observation=await page.evaluate(executeFormRequest,{op:'inspect'});
      const structure=await page.locator('input:not([type=hidden]),select,textarea,[role=combobox]').evaluateAll((nodes)=>nodes.filter((e)=>e.getClientRects().length).map((e)=>({tag:e.tagName,type:e.type,role:e.getAttribute('role'),name:e.name,id:e.id,autocomplete:e.autocomplete,labelledby:e.getAttribute('aria-labelledby'),labels:Array.from(e.labels??[]).map((l)=>l.textContent.trim()),ariaLabel:e.getAttribute('aria-label'),fieldset:!!e.closest('fieldset'),labelContext:e.parentElement?.textContent?.trim().slice(0,100)})));
      // Do not store page values, hidden state, cookies, or full job descriptions.
      rows.push({site,requestedUrl:url,finalUrl:page.url(),fieldCount:observation.fields?.length,supportedCount:observation.fields?.filter((f)=>f.supported).length,observedFields:observation.fields?.slice(0,12).map(({label,kind,group,supported})=>({label,kind,group,supported})),controls:observation.controls?.map(({label,kind})=>({label,kind})),structure:structure.slice(0,12)});
      console.log(JSON.stringify({site,fields:observation.fields?.length,supported:observation.fields?.filter((f)=>f.supported).length,controls:observation.controls?.length}));
    } catch(e) { rows.push({site,url,error:e.message}); console.log(JSON.stringify({site,error:e.message})); }
    finally { await page.close(); }
  }
} finally { await browser.close(); await writeFile(`${projectRoot}/prototype/reports/public-form-audit.json`,JSON.stringify({date:new Date().toISOString(),scope:'Read-only; no typing, clicking, file upload, application submission, or logged-in profile',rows},null,2)); }
