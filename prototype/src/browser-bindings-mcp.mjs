import {readFile} from 'node:fs/promises';
import {captureLocalReceipt} from './local-receipt.mjs';
import {serveBindings} from './bindings-server.mjs';
const config=JSON.parse(await readFile(process.env.AFA_BROWSER_SESSION,'utf8'));
if(config.kind!=='afa-browser-session-v1'||!/^http:\/\/127\.0\.0\.1:\d+\/request$/.test(config.endpoint)||! /^[a-f0-9]{64}$/.test(config.token??'')||typeof config.sourcePath!=='string')throw new Error('INVALID_BROWSER_SESSION');
const request=async payload=>{
  const response=await fetch(config.endpoint,{method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
  const result=await response.json();if(!response.ok||result.error)throw new Error(result.error??`HTTP ${response.status}`);return result;
};
await serveBindings({attachmentEnabled:config.attachmentEnabled===true,sourceReload:config.sourceReload===true,request,sourcePath:config.sourcePath,contextMode:'prefetch',discoveryMode:'batch',selectionMode:'independent',optionMode:'compact',queryVariants:process.env.AFA_QUERY_VARIANTS==='1',onReceipt:async(operation,result,source)=>{
 const response=await fetch(config.endpoint.replace('/request','/receipt'),{method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify({op:'store',receipt:captureLocalReceipt(operation,result,source)}),signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error(`LOCAL_RECEIPT_CAPTURE_HTTP_${response.status}`);
}});
