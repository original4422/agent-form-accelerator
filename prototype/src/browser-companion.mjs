import {chromium} from 'playwright';
import {mkdir,mkdtemp,realpath,writeFile,rm,chmod} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {projectRoot} from './bridge.mjs';
import {readDocumentSource} from './source-reader.mjs';
import {createBrowserController} from './browser-controller.mjs';
import {createFreezeProxy} from './freeze-proxy.mjs';
import {createNetworkFreeze} from './network-freeze.mjs';

export async function createBrowserCompanion({url,sourcePath,temporary=false,offlineAfterReady=false,headless=false,baseDir=projectRoot,signal}) {
  // Offline test edits may be queued in local storage. Never retain this profile
  // for a later online run that could transmit those fictional edits.
  if(offlineAfterReady)temporary=true;
  const target=new URL(url);
  if(!['http:','https:'].includes(target.protocol)||target.username||target.password)throw new Error('请提供不含用户名密码的 HTTP/HTTPS 页面地址');
  sourcePath=await realpath(sourcePath);
  if(!/\.(md|markdown|pdf)$/i.test(sourcePath))throw new Error('资料需为 Markdown；PDF 需显式启用实验模式');
  try{await readDocumentSource(sourcePath);}catch(e){if(!/\.pdf$/i.test(sourcePath)&&/^Expected /.test(e.message))throw new Error('资料需包含 1–100 个条目，且不超过 10 万字符');throw e;}
  const profiles=path.join(baseDir,'.profiles'),runtime=path.join(baseDir,'.runtime');
  for(const dir of [profiles,runtime]){await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);}
  const profilePath=temporary?await mkdtemp(path.join(profiles,'companion-')):path.join(profiles,'companion');
  await mkdir(profilePath,{recursive:true,mode:0o700});await chmod(profilePath,0o700);
  const configPath=path.join(runtime,`browser-${randomUUID()}.json`);
  let context,page,controller,closing,resolveDone,rejectDone,initializing=true,guard,transport,activation,connected=false,stopped=false;
  const cancelled=()=>{if(signal?.aborted){const error=new Error('浏览器启动已取消');error.code='ABORT_ERR';throw error;}};
  const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});
  // A caller may be waiting for initialization when cleanup rejects.
  done.catch(()=>{});
  const close=()=>{stopped=true;connected=false;return closing??=(async()=>{
    try{
      const errors=[];const clean=async fn=>{try{await fn();}catch(e){errors.push(e);}};
      await clean(()=>context?.close());await activation?.catch(()=>{});
      await clean(()=>controller?.close());await clean(()=>transport?.close());
      await clean(()=>rm(configPath,{force:true}));if(temporary)await clean(()=>rm(profilePath,{recursive:true,force:true}));
      if(errors.length)throw new AggregateError(errors,'Browser cleanup failed');resolveDone();
    }
    catch(e){rejectDone(e);throw e;}
    finally{signal?.removeEventListener('abort',onAbort);}
  })();};
  const available=()=>{cancelled();if(stopped)throw new Error('BROWSER_CLOSED');};
  const connect=()=>activation??=(async()=>{
    available();
    if(offlineAfterReady)await guard.freeze();
    available();if(page.isClosed())throw new Error('BROWSER_CLOSED');controller=await createBrowserController(page);
    available();await writeFile(configPath,JSON.stringify({kind:'afa-browser-session-v1',endpoint:controller.endpoint,token:controller.token,sourcePath,...(offlineAfterReady?{networkMode:'frozen'}:{})}),{mode:0o600,flag:'wx'});
    available();connected=true;return {configPath,...(guard?{network:guard.status()}:{})};
  })();
  const onAbort=()=>{if(initializing)context?.close().catch(()=>{});else close().catch(()=>{});};
  signal?.addEventListener('abort',onAbort,{once:true});
  try {
    cancelled();
    if(offlineAfterReady)transport=await createFreezeProxy();
    cancelled();
    context=await chromium.launchPersistentContext(profilePath,{channel:'chromium',headless,viewport:{width:1280,height:1000},handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false,...(offlineAfterReady?{serviceWorkers:'block',proxy:{server:transport.url,bypass:'<-loopback>'}}:{})});
    cancelled();
    if(offlineAfterReady)guard=await createNetworkFreeze(context,transport);
    page=context.pages()[0]??await context.newPage();
    // User performs any sign-in in this separate browser. No personal profile is
    // imported, and navigating other tabs does not change the controlled Page.
    await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:45000});
    cancelled();
    if(!offlineAfterReady)await connect();
    cancelled();initializing=false;
    context.once('close',()=>{close().catch(()=>{});});
    page.once('close',()=>{close().catch(()=>{});});
    return {page,context,profilePath,get configPath(){return connected?configPath:undefined;},close,done,
      freezeAndConnect:()=>{if(!offlineAfterReady)throw new Error('OFFLINE_MODE_REQUIRED');return connect();},
      networkStatus:()=>guard?.status()??{state:'online'}};
  }catch(e){await close();cancelled();throw e;}
}

export function companionCommand(configPath) {
  const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
  const settings={command:process.execPath,args:[path.join(projectRoot,'prototype/src/browser-bindings-mcp.mjs')],'env.AFA_BROWSER_SESSION':configPath,...(process.env.AFA_PDF_SOURCE==='1'?{'env.AFA_PDF_SOURCE':'1',...(process.env.AFA_PYTHON?{'env.AFA_PYTHON':process.env.AFA_PYTHON}:{})}: {})};
  return 'codex '+Object.entries(settings).map(([key,value])=>'-c '+quote(`mcp_servers.afa.${key}=${JSON.stringify(value)}`)).join(' ');
}
