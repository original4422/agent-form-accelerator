import {parseArgs} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {renderLocalReceipt} from '../src/local-receipt.mjs';
try {
 const {values}=parseArgs({options:{session:{type:'string'},format:{type:'string',default:'markdown'},out:{type:'string'},help:{type:'boolean'}}});
 if(values.help){console.log('npm run receipt -- --session <printed-session-file> [--format markdown|json] [--out <new-file>]\nExports the last historical receipt. Does not refresh the page. Default: stdout only.');}
 else {
  if(!values.session||!['markdown','json'].includes(values.format))throw new Error('Specify --session and --format markdown|json');
  const c=JSON.parse(await readFile(values.session,'utf8'));
  if(c.kind!=='afa-browser-session-v1'||!/^http:\/\/127\.0\.0\.1:\d+\/request$/.test(c.endpoint)||! /^[a-f0-9]{64}$/.test(c.token??''))throw new Error('INVALID_BROWSER_SESSION');
  const response=await fetch(c.endpoint.replace('/request','/receipt'),{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json'},body:JSON.stringify({op:'export'}),signal:AbortSignal.timeout(5000)});
  const receipt=await response.json();if(!response.ok)throw new Error(receipt.error??`HTTP ${response.status}`);
  const output=values.format==='json'?JSON.stringify(receipt,null,2)+'\n':renderLocalReceipt(receipt);
  if(values.out){await writeFile(values.out,output,{flag:'wx',mode:0o600});console.log(path.resolve(values.out));}else process.stdout.write(output);
 }
}catch(error){console.error(error.message);process.exitCode=1;}
