// Interactive local demo; source data is fictional and the browser is isolated.
import path from 'node:path';
import {createHarness} from '../bench/harness.mjs';
import {projectRoot} from '../src/bridge.mjs';
import './build-fixtures.mjs';
const h=await createHarness({headless:process.env.AFA_HEADLESS==='1',cdp:true,handleSignals:false});
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
let closing=false;
const close=async()=>{if(closing)return;closing=true;await h.close();};
try {
 await h.reset('search-form');await h.page.waitForSelector('[role=combobox]');
 const script=path.join(projectRoot,'prototype/bench/playwright-bindings-mcp.mjs');
 const env={AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url(),AFA_DOCUMENT_FILE:path.join(projectRoot,'prototype/fixtures/documents/framework-candidate.md'),AFA_CONTEXT_MODE:'prefetch'};
 const overrides={command:JSON.stringify(process.execPath),args:JSON.stringify([script]),...Object.fromEntries(Object.entries(env).map(([k,v])=>['env.'+k,JSON.stringify(v)]))};
 const command='codex '+Object.entries(overrides).map(([key,value])=>'-c '+quote('mcp_servers.afa.'+key+'='+value)).join(' ');
 console.log(`本地搜索选择演示已就绪：${h.page.url()}\n独立浏览器，虚构资料，Playwright 后端。保持此进程运行，在另一个终端执行：\n\n${command}\n\n然后让 Codex：根据提供的资料填写当前页，包含两段教育经历，完成后保留页面供检查。\nCtrl+C 关闭演示并清理临时浏览器。`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await close();process.exit(0);});
 await new Promise(resolve=>h.context.on('close',resolve));
}finally{await close();}
