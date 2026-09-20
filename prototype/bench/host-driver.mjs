import {spawn} from 'node:child_process';
export function runCodex({cwd,args,prompt,timeoutMs=180000,signal}) {
  return new Promise((resolve)=>{
    const started=performance.now(), timeline=[];
    const child=spawn('codex',args,{cwd,env:process.env,stdio:['pipe','pipe','pipe']});
    const abort=()=>child.kill('SIGTERM');
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)abort();
    let stdout='',stderr='',partial='',timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},timeoutMs);
    child.stdout.on('data',(x)=>{
      stdout+=x;partial+=x;const lines=partial.split('\n');partial=lines.pop();
      for(const line of lines)try{const e=JSON.parse(line),item=e.item;timeline.push({atMs:performance.now()-started,event:e.type,itemId:item?.id,itemType:item?.type,tool:item?.tool,status:item?.status});}catch{}
    });
    child.stderr.on('data',(x)=>{stderr+=x;});
    child.on('error',(e)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve({error:e.message,aborted:!!signal?.aborted,stdout,stderr,timeline,elapsedMs:performance.now()-started});});
    child.on('close',(exitCode)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve({exitCode,timedOut,aborted:!!signal?.aborted,stdout,stderr,timeline,elapsedMs:performance.now()-started});});
    child.stdin.on('error',()=>{});child.stdin.end(prompt);
  });
}
export function parseRun(r) {
  const toolCalls=[];let usage;
  for(const line of r.stdout.split('\n'))try{
    const e=JSON.parse(line);if(e.type==='turn.completed')usage=e.usage;
    if(e.type==='item.completed'&&e.item?.type==='mcp_tool_call'){
      const item=e.item,start=r.timeline.find((x)=>x.itemId===item.id&&x.event==='item.started'),end=r.timeline.find((x)=>x.itemId===item.id&&x.event==='item.completed');
      const content=item.result?.content?.find((c)=>c.type==='text')?.text;let result;try{result=JSON.parse(content);}catch{}
      toolCalls.push({tool:item.tool,status:item.status,isError:item.result?.isError,startMs:start?.atMs,endMs:end?.atMs,durationMs:start?end.atMs-start.atMs:undefined,returnedBytes:content?Buffer.byteLength(content):undefined,executionMs:result?.elapsedMs,complete:result?.complete,reason:result?.reason,primitiveCalls:result?.primitiveCalls});
    }
  }catch{}
  return {toolCalls,usage};
}
export function codexArgs(script, env) {
  return ['exec','--json','--ephemeral','--ignore-user-config','--skip-git-repo-check','--approve-for-me','-c','features.shell_tool=false','-c','web_search="disabled"',
    '-c',`mcp_servers.afa.command=${JSON.stringify(process.execPath)}`,'-c',`mcp_servers.afa.args=${JSON.stringify([script])}`,
    ...Object.entries(env).flatMap(([key,value])=>['-c',`mcp_servers.afa.env.${key}=${JSON.stringify(value)}`]),'-'];
}
