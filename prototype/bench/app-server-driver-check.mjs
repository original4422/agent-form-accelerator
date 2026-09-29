import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {appServer,approveFixtureCall} from './app-server-driver.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'afa-driver-check-'));
const fake=path.join(root,'fake.mjs'),pidFile=path.join(root,'pid');
const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
await writeFile(fake,`import {writeFileSync} from 'node:fs';import {createInterface} from 'node:readline';
writeFileSync(process.argv[2],String(process.pid));
const send=x=>process.stdout.write(JSON.stringify(x)+'\\n');
createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);
 if(q.method==='initialize'&&process.argv[3]==='hang')return;
 if(q.method==='config/read'){setTimeout(()=>send({id:q.id,result:{secret:'DO_NOT_RECORD'}}),80);return;}
 if(q.method==='turn/start'){send({id:q.id,result:{turn:{id:'t'}}});return;}
 if(q.method==='turn/interrupt'){send({method:'turn/completed',params:{threadId:'th',turn:{id:'t',status:'interrupted'}}});}
 if(q.id!==undefined)send({id:q.id,result:{}});
});`);
let host;
try{
 const scope={threadId:'th',turnId:'t',url:'http://127.0.0.1:1234/fixtures/alias-form.html',sourceVersion:'v.1'};
 const allowed={method:'mcpServer/elicitation/request',id:0,params:{threadId:'th',turnId:'t',serverName:'afa',mode:'form',message:'Allow the afa MCP server to run tool "form_apply_bindings"?',requestedSchema:{type:'object',properties:{}},_meta:{codex_approval_kind:'mcp_tool_call',tool_params:{url:scope.url,sourceVersion:'v.1'}}}};
 assert.deepEqual(approveFixtureCall(allowed,scope),{action:'accept',content:{}});
 for(const tool of ['form_search','form_expand']){const q=structuredClone(allowed);q.params.message=`Allow the afa MCP server to run tool "${tool}"?`;assert.equal(approveFixtureCall(q,scope).action,'accept');}
 const variants=[q=>q.params.threadId='other',q=>q.params.turnId='other',q=>q.params.serverName='other',q=>q.params.mode='url',q=>q.params._meta.codex_approval_kind='other',q=>q.params._meta.tool_params.url='https://example.com',q=>q.params._meta.tool_params.url=scope.url+'?different',q=>q.params._meta.tool_params.sourceVersion='v.0',q=>q.params.requestedSchema.properties.password={type:'string'},q=>q.params.requestedSchema.required=['password'],q=>q.params.message='Allow the afa MCP server to run tool "form_reload_source"?',q=>q.method='item/commandExecution/requestApproval'];
 for(const mutate of variants){const q=structuredClone(allowed);mutate(q);assert.throws(()=>approveFixtureCall(q,scope),/OUT_OF_SCOPE_APPROVAL/);}
 await assert.rejects(appServer({cwd:root,logPath:path.join(root,'hang.log'),command:process.execPath,args:[fake,pidFile,'hang'],initializeTimeoutMs:1000}),/RPC_TIMEOUT:initialize/);
 assert.equal(alive(Number(await readFile(pidFile))),false);
 host=await appServer({cwd:root,logPath:path.join(root,'normal.log'),command:process.execPath,args:[fake,pidFile]});
 await assert.rejects(host.request('config/read',{},10),/RPC_TIMEOUT:config\/read/);
 await host.request('turn/start',{threadId:'th',input:[]});await host.request('turn/interrupt',{threadId:'th',turnId:'t'});
 assert.equal((await host.waitFor(e=>e.method==='turn/completed')).params.turn.status,'interrupted');
 await new Promise(r=>setTimeout(r,150));await host.close();assert.equal(alive(host.child.pid),false);host=undefined;
 assert.ok(!(await readFile(path.join(root,'normal.log'),'utf8')).includes('DO_NOT_RECORD'));
 console.log('PASS 3 scoped single-call approvals and 12 refusals; initialization timeout closes owner, late config response never logged, interrupt notification, directed shutdown');
}finally{await host?.close();await rm(root,{recursive:true,force:true});}
