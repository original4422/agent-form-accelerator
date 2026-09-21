// Isolated local benchmark only; no connection to a personal browser/profile.
import {appendFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {serveBindings} from '../src/bindings-server.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
const endpoint=process.env.AFA_CDP_ENDPOINT,url=process.env.AFA_TARGET_URL;
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint)||!/^http:\/\/127\.0\.0\.1:\d+\/fixtures\/[a-z0-9-]+\.html$/.test(url))throw new Error('Isolated local fixture required');
const browser=await chromium.connectOverCDP(endpoint);
const pages=browser.contexts().flatMap(c=>c.pages()).filter(p=>p.url()===url);
if(pages.length!==1)throw new Error('Expected one fixture tab');
const backend=createPlaywrightBackend(pages[0]);
await serveBindings({receiptMode:process.env.AFA_RECEIPT_MODE,onTiming:process.env.AFA_TIMING_FILE?e=>appendFileSync(process.env.AFA_TIMING_FILE,JSON.stringify(e)+'\n',{mode:0o600}):undefined,request:backend.request,sourcePath:process.env.AFA_DOCUMENT_FILE,repeatMode:process.env.AFA_REPEAT_MODE,contextMode:process.env.AFA_CONTEXT_MODE,discoveryMode:process.env.AFA_DISCOVERY_MODE,selectionMode:process.env.AFA_SELECTION_MODE,decisionMode:process.env.AFA_DECISION_MODE,optionMode:process.env.AFA_OPTIONS_MODE});
