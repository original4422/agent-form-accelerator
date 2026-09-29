// No model calls: exercise the user-facing process, actual pages, and teardown.
import assert from 'node:assert/strict';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {access,mkdtemp,readFile,readdir,rm,writeFile,chmod} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
const script=path.resolve('prototype/scripts/try.mjs'),scratch=await mkdtemp(path.join(os.tmpdir(),'afa-try-check-'));
const checkExit=(args,expected,pattern,env=process.env)=>{const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env,timeout:15000});assert.equal(r.status,expected,r.stderr);assert.match(r.stdout+r.stderr,pattern);};
try{
 checkExit(['--help'],0,/用法/);checkExit(['unknown'],2,/未知示例/);checkExit([],2,/用法/);checkExit(['--wat'],2,/参数|Unknown/);
 checkExit(['rail','--preview'],3,/Chromium.*npx playwright install chromium/,{...process.env,PLAYWRIGHT_BROWSERS_PATH:path.join(scratch,'no-browser')});
 checkExit(['rail'],3,/未找到 Codex CLI/,{...process.env,PATH:scratch});
 const fake=path.join(scratch,'codex');await writeFile(fake,'#!/bin/sh\nexit 1\n');await chmod(fake,0o700);
 checkExit(['rail'],3,/Codex 登录检查未通过.*codex login status/,{...process.env,PATH:scratch});
 console.log('PASS usage and missing Chromium/Codex/login exit codes');
 for(const scenario of ['recruitment','rail','car']){
  const npm=scenario==='rail',args=[scenario,'--preview',...(process.env.AFA_TRY_HEADED==='1'?[]:['--headless'])];
  const child=spawn(npm?'npm':process.execPath,npm?['run','try','--',...args]:[script,...args],{detached:true,stdio:['ignore','pipe','pipe']});let out='',err='';
  const ended=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));child.stderr.on('data',b=>err+=b);
  const timer=setTimeout(()=>process.kill(-child.pid,'SIGKILL'),25000);let root,url,config;
  try{
   await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{out+=b;if(out.includes('随后删除'))resolve();});child.once('error',reject);child.once('close',()=>reject(Error('Closed before ready: '+err)));});
   root=out.match(/临时目录：(.*)/)[1].trim();url=out.match(/页面：(.*)/)[1].trim();assert.ok(!out.includes('mcp_servers.afa'),'preview must not print model connection/task');
   assert.ok((await fetch(url)).ok);const profiles=await readdir(path.join(root,'.profiles'));assert.equal(profiles.length,1);
   const runtime=path.join(root,'.runtime'),session=(await readdir(runtime))[0];config=JSON.parse(await readFile(path.join(runtime,session),'utf8'));
   const inspect=await fetch(config.endpoint,{method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify({op:'inspect'})});assert.ok(inspect.ok);const observation=await inspect.json();
   assert.ok(observation.fields.some(f=>f.label===(scenario==='recruitment'?'Applicant name':'Rail')));
   if(scenario==='car'){
    // Closing only this demo's browser must also terminate its parent CLI/server.
    const rows=execFileSync('ps',['-axo','pid=,command='],{encoding:'utf8'}).split('\n');
    const row=rows.find(l=>l.includes('--user-data-dir='+path.join(root,'.profiles',profiles[0]))&&!l.includes('--type='));assert.ok(row,'owned browser process');
    process.kill(Number(row.trim().split(/\s+/)[0]),'SIGTERM');
   }else{process.kill(-child.pid,'SIGINT');}
   const result=await ended;assert.equal(result.code,0,err);await assert.rejects(access(root));await assert.rejects(fetch(url));await assert.rejects(fetch(config.endpoint));
   console.log(`PASS ${scenario}: public fields ready, ${scenario==='car'?'browser close':'Ctrl+C'}, server/profile/session cleanup`);
  }finally{clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null){process.kill(-child.pid,'SIGKILL');await ended;}if(root)await rm(root,{recursive:true,force:true});}
 }
}finally{await rm(scratch,{recursive:true,force:true});}
