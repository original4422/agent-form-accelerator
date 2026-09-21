import {chromium} from 'playwright';
import {mkdir,mkdtemp,readFile,realpath,stat,writeFile,rm,chmod} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {projectRoot} from './bridge.mjs';
import {parseDocument} from './document-source.mjs';
import {createBrowserController} from './browser-controller.mjs';

export async function createBrowserCompanion({url,sourcePath,temporary=false,headless=false,baseDir=projectRoot,signal}) {
  const target=new URL(url);
  if(!['http:','https:'].includes(target.protocol)||target.username||target.password)throw new Error('请提供不含用户名密码的 HTTP/HTTPS 页面地址');
  sourcePath=await realpath(sourcePath);
  const info=await stat(sourcePath);
  if(!info.isFile()||info.size>400000||! /\.(md|markdown)$/i.test(sourcePath))throw new Error('资料需为 Markdown 文件（最多 10 万字符、100 个条目）');
  const markdown=await readFile(sourcePath,'utf8');
  try{parseDocument(markdown);}catch{throw new Error('资料需包含 1–100 个条目，且不超过 10 万字符');}
  const profiles=path.join(baseDir,'.profiles'),runtime=path.join(baseDir,'.runtime');
  for(const dir of [profiles,runtime]){await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);}
  const profilePath=temporary?await mkdtemp(path.join(profiles,'companion-')):path.join(profiles,'companion');
  await mkdir(profilePath,{recursive:true,mode:0o700});await chmod(profilePath,0o700);
  const configPath=path.join(runtime,`browser-${randomUUID()}.json`);
  let context,controller,closing,resolveDone,rejectDone,initializing=true;
  const cancelled=()=>{if(signal?.aborted){const error=new Error('浏览器启动已取消');error.code='ABORT_ERR';throw error;}};
  const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});
  // A caller may be waiting for initialization when cleanup rejects.
  done.catch(()=>{});
  const close=()=>closing??=(async()=>{
    try{await controller?.close();await context?.close();await rm(configPath,{force:true});if(temporary)await rm(profilePath,{recursive:true,force:true});resolveDone();}
    catch(e){rejectDone(e);throw e;}
    finally{signal?.removeEventListener('abort',onAbort);}
  })();
  const onAbort=()=>{if(initializing)context?.close().catch(()=>{});else close().catch(()=>{});};
  signal?.addEventListener('abort',onAbort,{once:true});
  try {
    cancelled();
    context=await chromium.launchPersistentContext(profilePath,{channel:'chromium',headless,viewport:{width:1280,height:1000},handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false});
    cancelled();
    const page=context.pages()[0]??await context.newPage();
    // User performs any sign-in in this separate browser. No personal profile is
    // imported, and navigating other tabs does not change the controlled Page.
    await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:45000});
    cancelled();
    controller=await createBrowserController(page);
    await writeFile(configPath,JSON.stringify({kind:'afa-browser-session-v1',endpoint:controller.endpoint,token:controller.token,sourcePath}),{mode:0o600,flag:'wx'});
    cancelled();initializing=false;
    context.once('close',()=>{close().catch(()=>{});});
    page.once('close',()=>{close().catch(()=>{});});
    return {page,context,profilePath,configPath,close,done};
  }catch(e){await close();cancelled();throw e;}
}

export function companionCommand(configPath) {
  const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
  const settings={command:process.execPath,args:[path.join(projectRoot,'prototype/src/browser-bindings-mcp.mjs')],'env.AFA_BROWSER_SESSION':configPath};
  return 'codex '+Object.entries(settings).map(([key,value])=>'-c '+quote(`mcp_servers.afa.${key}=${JSON.stringify(value)}`)).join(' ');
}
