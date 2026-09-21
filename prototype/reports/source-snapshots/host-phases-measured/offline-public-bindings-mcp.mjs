import {appendFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {serveBindings} from '../src/bindings-server.mjs';
const c=JSON.parse(await readFile(process.env.AFA_OFFLINE_CONFIG,'utf8'));
if(!/^http:\/\/127\.0\.0\.1:\d+\/request$/.test(c.endpoint))throw new Error('LOCAL_CONTROLLER_REQUIRED');
const request=async r=>{const response=await fetch(c.endpoint,{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json'},body:JSON.stringify(r)});const value=await response.json();if(value.error)throw new Error(value.error);return value;};
await serveBindings({request,sourcePath:process.env.AFA_DOCUMENT_FILE,contextMode:'prefetch',discoveryMode:'batch',optionMode:process.env.AFA_OPTIONS_MODE,onTiming:process.env.AFA_TIMING_FILE?event=>appendFileSync(process.env.AFA_TIMING_FILE,JSON.stringify(event)+'\n',{mode:0o600}):undefined});
