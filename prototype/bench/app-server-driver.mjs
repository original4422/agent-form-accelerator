import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {open} from 'node:fs/promises';
import {EventEmitter,once} from 'node:events';

// Small stdio client for the continuous-source experiment, not the speed bench.
export async function appServer({cwd,logPath,command='codex',args=['app-server','--listen','stdio://'],initializeTimeoutMs=30000,onRequest}) {
 const log=await open(logPath,'wx',0o600),events=[],pending=new Map(),sensitiveIds=new Set(),bus=new EventEmitter();let serial=0,ended=false,failure;
 const child=spawn(command,args,{cwd,env:process.env,stdio:['pipe','pipe','pipe']});
 const closed=once(child,'close');
 const record=(direction,message)=>{void log.write(JSON.stringify({at:Date.now(),direction,message})+'\n');};
 const fail=error=>{failure=error;for(const p of pending.values())p.reject(error);pending.clear();bus.emit('event');};
 child.on('error',fail);child.on('close',()=>{ended=true;fail(new Error('APP_SERVER_CLOSED'));});
 child.stderr.on('data',data=>record('stderr',data.toString()));
 const lines=createInterface({input:child.stdout});
 lines.on('line',line=>{
  let message;try{message=JSON.parse(line);}catch{fail(new Error('INVALID_APP_SERVER_JSON'));return;}
  const request=pending.get(message.id);
  // config/read may contain inherited secrets: never write its response.
  if(!sensitiveIds.has(message.id))record('receive',message);
  if(message.id!==undefined&&!message.method){if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(JSON.stringify(message.error))):request.resolve(message.result);return;}
  events.push(message);bus.emit('event');
  if(message.id!==undefined&&message.method){
   // The experiment may handle an explicitly scoped, single-call approval.
   if(!onRequest)fail(new Error('UNHANDLED_SERVER_REQUEST:'+message.method));
   else Promise.resolve().then(()=>onRequest(message)).then(result=>send({id:message.id,result})).catch(fail);
  }
 });
 function send(message){record('send',message);child.stdin.write(JSON.stringify(message)+'\n');}
 async function request(method,params={},timeoutMs=30000){
  if(failure)throw failure;const id=++serial;let timer;
  try{return await new Promise((resolve,reject)=>{
   pending.set(id,{method,resolve,reject});if(method==='config/read')sensitiveIds.add(id);timer=setTimeout(()=>{pending.delete(id);reject(new Error('RPC_TIMEOUT:'+method));},timeoutMs);send({id,method,params});
  });}finally{clearTimeout(timer);}
 }
 async function waitFor(predicate,timeoutMs=240000){
  const found=events.find(predicate);if(found)return found;if(failure)throw failure;
  return new Promise((resolve,reject)=>{
   const done=(error,value)=>{clearTimeout(timer);bus.off('event',check);error?reject(error):resolve(value);};
   const check=()=>{const hit=events.find(predicate);if(hit)done(null,hit);else if(failure)done(failure);};
   const timer=setTimeout(()=>done(new Error('EVENT_TIMEOUT')),timeoutMs);bus.on('event',check);check();
  });
 }
 async function close(){
  if(!ended){child.stdin.end();const timer=setTimeout(()=>child.kill('SIGTERM'),3000),hard=setTimeout(()=>child.kill('SIGKILL'),6000);await closed;clearTimeout(timer);clearTimeout(hard);}
  lines.close();await log.close();
 }
 try{await request('initialize',{clientInfo:{name:'afa_continuous_check',version:'1'},capabilities:{experimentalApi:true}},initializeTimeoutMs);}catch(error){await close();throw error;}
 send({method:'initialized',params:{}});
 return {child,events,request,waitFor,close,get failure(){return failure;}};
}

export function isolatedConfig(config,{node,proxy,sessionPath,tracePath}) {
 if(config.hooks&&Object.keys(config.hooks).length)throw new Error('INHERITED_HOOKS_REQUIRE_REVIEW');
 const overrides={'features.apps':false,'features.plugins':false,'features.hooks':false,'features.skill_search':false,'features.skill_mcp_dependency_install':false,'features.skip_host_skill_discovery':true,'features.shell_tool':false,'web_search':'disabled','notify':[],
  'mcp_servers.afa.command':node,'mcp_servers.afa.args':[proxy],
  'mcp_servers.afa.env.AFA_BROWSER_SESSION':sessionPath,'mcp_servers.afa.env.AFA_MCP_TRACE':tracePath};
 for(const name of Object.keys(config.mcp_servers??{}))overrides[`mcp_servers.${name}.enabled`]=false;
 for(const name of Object.keys(config.plugins??{}))overrides[`plugins.${name}.enabled`]=false;
 overrides['mcp_servers.afa.enabled']=true;
 return overrides;
}

export function approveFixtureCall(message,{threadId,turnId,url,sourceVersion}) {
 const p=message.params,meta=p?._meta,schema=p?.requestedSchema;
 const match=/^Allow the afa MCP server to run tool "(form_apply_bindings|form_search|form_expand)"\?$/.exec(p?.message??'');
 if(message.method!=='mcpServer/elicitation/request'||!threadId||!turnId||!sourceVersion||
  p?.threadId!==threadId||p.turnId!==turnId||p.serverName!=='afa'||p.mode!=='form'||meta?.codex_approval_kind!=='mcp_tool_call'||!match||
  !schema||Object.keys(schema).sort().join(',')!=='properties,type'||schema.type!=='object'||!schema.properties||Array.isArray(schema.properties)||Object.keys(schema.properties).length||
  meta.tool_params?.url!==url||meta.tool_params?.sourceVersion!==sourceVersion)throw new Error('OUT_OF_SCOPE_APPROVAL');
 return {action:'accept',content:{}};
}
