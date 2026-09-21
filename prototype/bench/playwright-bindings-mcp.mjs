// Isolated local benchmark only; no connection to a personal browser/profile.
import {chromium} from 'playwright';
import {serveBindings} from '../src/bindings-server.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
const endpoint=process.env.AFA_CDP_ENDPOINT,url=process.env.AFA_TARGET_URL;
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint)||!/^http:\/\/127\.0\.0\.1:\d+\/fixtures\/[a-z0-9-]+\.html$/.test(url))throw new Error('Isolated local fixture required');
const browser=await chromium.connectOverCDP(endpoint);
const pages=browser.contexts().flatMap(c=>c.pages()).filter(p=>p.url()===url);
if(pages.length!==1)throw new Error('Expected one fixture tab');
const backend=createPlaywrightBackend(pages[0]);
await serveBindings({request:backend.request,sourcePath:process.env.AFA_DOCUMENT_FILE,repeatMode:process.env.AFA_REPEAT_MODE,contextMode:process.env.AFA_CONTEXT_MODE});
