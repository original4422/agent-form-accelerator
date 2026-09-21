// Experiment only: suppress the new observation data in the old-context arm.
// Both arms use the same executor, source reader, tool guidance and MCP schema.
import {readFile} from 'node:fs/promises';
import {serveBindings} from '../src/bindings-server.mjs';
const config=JSON.parse(await readFile(process.env.AFA_BROWSER_SESSION,'utf8'));
if(config.kind!=='afa-browser-session-v1'||!/^http:\/\/127\.0\.0\.1:\d+\/request$/.test(config.endpoint))throw new Error('INVALID_SESSION');
const request=async payload=>{
 const response=await fetch(config.endpoint,{method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)}),result=await response.json();
 if(!response.ok||result.error)throw new Error(result.error??`HTTP ${response.status}`);
 if(process.env.AFA_TEST_CONTEXT==='off'){
  delete result.formContext;if(result.observation)delete result.observation.formContext;
 }
 return result;
};
await serveBindings({request,sourcePath:config.sourcePath,contextMode:'prefetch',discoveryMode:'batch',selectionMode:'independent',optionMode:'compact'});
