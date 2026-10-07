import {spawn} from 'node:child_process';
import {openSync,writeSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const fd=openSync(process.env.AFA_MCP_TRACE,'a',0o600);
const record=(kind,data)=>writeSync(fd,JSON.stringify({at:Date.now(),kind,...data})+'\n');
const child=spawn(process.execPath,[fileURLToPath(new URL('../src/browser-bindings-mcp.mjs',import.meta.url))],{env:process.env,stdio:['pipe','pipe','pipe']});
record('start',{pid:child.pid,proxyPid:process.pid,nonce:randomUUID()});
function observe(stream,direction){let partial='';stream.on('data',chunk=>{partial+=chunk;const lines=partial.split('\n');partial=lines.pop();for(const line of lines)record('wire',{direction,line});});}
observe(process.stdin,'request');observe(child.stdout,'response');
process.stdin.pipe(child.stdin);child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
child.stdin.on('error',error=>{if(error.code!=='EPIPE')throw error;});
child.on('error',error=>{record('error',{code:error.code});process.exitCode=1;});
child.on('exit',(code,signal)=>{record('exit',{pid:child.pid,code,signal});process.exitCode=code??1;process.stdin.destroy();});
for(const signal of ['SIGTERM','SIGINT','SIGHUP'])process.on(signal,()=>child.kill(signal));
