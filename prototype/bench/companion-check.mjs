import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,stat,readdir,access,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import http from 'node:http';
import {spawn} from 'node:child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion,companionCommand} from '../src/browser-companion.mjs';
import {conditionalBindings} from './conditional-cases.mjs';
import {aliasOracle} from './alias-cases.mjs';
import '../scripts/build-fixtures.mjs';

const root=await mkdtemp(path.join(os.tmpdir(),'afa-companion-check-')),fixture=await createBridge({port:0}),results=[];
const sourcePath=path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md'),url=`${fixture.config.bridge}/fixtures/alias-form.html`;
let app,client;
const config=async()=>JSON.parse(await readFile(app.configPath,'utf8'));
const rpc=async(payload,headers={})=>{const c=await config();return fetch(c.endpoint,{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json',...headers},body:JSON.stringify(payload)});};
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}};
try {
  await check('invalid URLs and unsupported documents fail before browser creation',async()=>{
    for(const target of ['file:///tmp/x','javascript:alert(1)','https://user:secret@example.test'])await assert.rejects(createBrowserCompanion({url:target,sourcePath,baseDir:root,headless:true}),/HTTP/);
    const empty=path.join(root,'empty.md');await writeFile(empty,'');await assert.rejects(createBrowserCompanion({url,sourcePath:empty,baseDir:root,headless:true}),/1–100 个条目/);
    assert.deepEqual((await readdir(root)).sort(),['empty.md']);
  });
  app=await createBrowserCompanion({url,sourcePath,baseDir:root,temporary:true,headless:true});await app.page.waitForSelector('[role=combobox]');
  await check('private session file, profile, and printed command do not expose credentials',async()=>{
    const c=await config();assert.equal(c.kind,'afa-browser-session-v1');assert.match(c.token,/^[a-f0-9]{64}$/);
    assert.equal((await stat(app.configPath)).mode&0o777,0o600);assert.equal((await stat(app.profilePath)).mode&0o777,0o700);
    assert.ok(!companionCommand(app.configPath).includes(c.token));assert.ok(companionCommand(app.configPath).includes('AFA_BROWSER_SESSION'));
    await assert.rejects(access(path.join(app.profilePath,'DevToolsActivePort')));
  });
  await check('wrong token, any Origin, wrong Host, invalid types and oversized bodies rejected',async()=>{
    const c=await config();
    for(const headers of [{authorization:'Bearer wrong'},{origin:'https://evil.test'},{origin:''},{host:'evil.test'}]){
      const status=await new Promise((resolve,reject)=>{const req=http.request(c.endpoint,{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json',...headers}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end(JSON.stringify({op:'inspect'}));});
      assert.equal(status,403,JSON.stringify(headers));
    }
    assert.equal((await rpc({op:'inspect'},{'content-type':'text/plain'})).status,415);
    assert.equal((await rpc({op:'navigate',url:'https://example.test'})).status,400);
    assert.equal((await rpc({op:'inspect',padding:'x'.repeat(262145)})).status,413);
    assert.equal(await app.page.getByLabel('Applicant name',{exact:true}).inputValue(),'');
  });
  await check('UTF-8 values survive fragmented request chunks',async()=>{
    const c=await config(),seen=await (await rpc({op:'inspect'})).json(),name=seen.fields.find(f=>f.label==='Applicant name');
    const data=Buffer.from(JSON.stringify({op:'fill',url,snapshot:seen.snapshot,actions:[{ref:name.ref,op:'set',value:'中文示例'}]})),split=data.indexOf(Buffer.from('中文'))+1;
    const result=await new Promise((resolve,reject)=>{const req=http.request(c.endpoint,{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json'}},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));});req.on('error',reject);req.write(data.subarray(0,split));setTimeout(()=>req.end(data.subarray(split)),20);});
    assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(await app.page.getByLabel('Applicant name',{exact:true}).inputValue(),'中文示例');
    await app.page.reload();await app.page.waitForSelector('[role=combobox]');
  });
  await check('actual companion MCP performs source-backed conditional search and two education rows',async()=>{
    client=new Client({name:'companion-check',version:'0.0.1'});
    await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/src/browser-bindings-mcp.mjs`],env:{...process.env,AFA_BROWSER_SESSION:app.configPath},stderr:'pipe'}));
    const {tools}=await client.listTools();assert.equal(tools.length,5);const apply=tools.find(t=>t.name==='form_apply_bindings');assert.ok(JSON.stringify(apply.inputSchema).includes('independentGroups'));
    const c=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
    const response=await client.callTool({name:'form_apply_bindings',arguments:{...conditionalBindings(c),sourceVersion:c.source.version}});assert.ok(!response.isError,JSON.stringify(response));
    const r=JSON.parse(response.content[0].text);assert.equal(r.complete,true,JSON.stringify(r));
    const oracle=await aliasOracle(app.page,c.source.entries.find(e=>e.label==='个人介绍').value);assert.equal(oracle.passed,true,JSON.stringify(oracle));
    await client.close();client=undefined;
  });
  await check('manual navigation rejects old page writes and other tabs do not change target',async()=>{
    await app.page.goto(`${fixture.config.bridge}/fixtures/plain.html`);
    const denied=await rpc({op:'goal',url,fields:[{label:'姓名',group:'基本信息',kind:'text',value:'WRONG'}]});assert.equal(denied.status,400);assert.match((await denied.json()).error,/WRONG_PAGE/);
    const other=await app.context.newPage();await other.goto(`${fixture.config.bridge}/fixtures/dependent.html`);
    const current=await (await rpc({op:'inspect'})).json();assert.equal(current.url,app.page.url());assert.notEqual(current.url,other.url());await other.close();
  });
  await check('closing selected tab revokes endpoint and removes temporary profile and session',async()=>{
    const paths={profile:app.profilePath,config:app.configPath},c=await config();await app.page.close();await app.done;
    await assert.rejects(access(paths.profile));await assert.rejects(access(paths.config));await assert.rejects(fetch(c.endpoint));app=undefined;
  });
  await check('persistent separate profile survives restart with an expiring test cookie',async()=>{
    app=await createBrowserCompanion({url,sourcePath,baseDir:root,headless:true});
    await app.context.addCookies([{name:'fixture-login',value:'not-a-real-login',url:fixture.config.bridge,expires:Math.floor(Date.now()/1000)+3600}]);const profile=app.profilePath,session=app.configPath;
    await app.close();await access(profile);await assert.rejects(access(session));
    app=await createBrowserCompanion({url,sourcePath,baseDir:root,headless:true});assert.equal(app.profilePath,profile);assert.ok((await app.context.cookies()).some(c=>c.name==='fixture-login'&&c.value==='not-a-real-login'));await app.close();app=undefined;
  });
  await check('cancellation during startup cleans temporary artifacts',async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),80);
    await assert.rejects(createBrowserCompanion({url,sourcePath,baseDir:root,temporary:true,headless:true,signal:controller.signal}),e=>e.code==='ABORT_ERR');clearTimeout(timer);
    assert.deepEqual(await readdir(path.join(root,'.runtime')),[]);assert.deepEqual(await readdir(path.join(root,'.profiles')),['companion']);
  });
  for(const demo of [false,true])await check(`CLI ${demo?'demo':'explicit page'} starts and SIGINT exits zero with cleanup`,async()=>{
    const args=demo?['--demo','--headless']:['--url',url,'--source',sourcePath,'--temporary','--headless'];
    const child=spawn(process.execPath,[`${projectRoot}/prototype/scripts/browser.mjs`,...args],{stdio:['ignore','pipe','pipe']});let out='',err='';
    const completed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));child.stderr.on('data',b=>err+=b);
    const timer=setTimeout(()=>child.kill('SIGKILL'),20000);
    try{
      await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{out+=b;if(out.includes('AFA_BROWSER_SESSION'))resolve();});child.once('error',reject);child.once('close',()=>reject(new Error('CLI closed before ready: '+err)));});
      const session=out.match(/AFA_BROWSER_SESSION="([^"]+)"/)?.[1];assert.ok(session);await access(session);child.kill('SIGINT');const ended=await completed;assert.equal(ended.code,0,err);await assert.rejects(access(session));
    }finally{clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await completed;}}
  });
}finally{await client?.close();await app?.close();await fixture.close();await rm(root,{recursive:true,force:true});await writeFile('prototype/reports/companion-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
