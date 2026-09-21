import {readFile} from 'node:fs/promises';
import {serveBindings} from './bindings-server.mjs';
const config=JSON.parse(await readFile(process.env.AFA_SESSION_FILE,'utf8'));
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(config.bridge))throw new Error('Local bridge required');
const request=async(payload)=>{
  const r=await fetch(`${config.bridge}/rpc`,{method:'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  const data=await r.json();if(!r.ok||data.error)throw new Error(data.error||`HTTP ${r.status}`);return data;
};
await serveBindings({request,sourcePath:process.env.AFA_DOCUMENT_FILE,repeatMode:process.env.AFA_REPEAT_MODE,contextMode:process.env.AFA_CONTEXT_MODE});
