import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {access,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import os from 'node:os';import path from 'node:path';
const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
const usage='用法：npm run try -- recruitment|rail|car [--preview] [--headless]\n无参数时在交互终端选择示例。\n--preview 只预览本地页面，跳过 Codex 安装/登录检查。\n--headless 用于自动启动检查。\n退出码：0 正常结束，1 运行失败，2 参数错误，3 准备未完成。';
const fail=(message,exitCode)=>Object.assign(new Error(message),{exitCode});
const tasks={
 recruitment:'根据提供的虚构资料填写当前招聘示例，包含两段教育经历并保留校区限定词。批量处理已知字段，缺少的到岗日期留空并报告，保留为草稿供我检查。',
 rail:'根据提供的虚构资料准备差旅报销草稿。先选择交通方式，再填写出现的费用字段；重新绑定因分支变化失效的来源，包括交通方式。核对保存状态和报销总额，保留为草稿，不提交。',
 car:'根据提供的虚构资料准备差旅报销草稿。先选择交通方式，再填写出现的费用字段；重新绑定因分支变化失效的来源，包括交通方式。核对保存状态和报销总额，保留为草稿，不提交。'
};
async function main(){
 let parsed;try{parsed=parseArgs({allowPositionals:true,options:{preview:{type:'boolean'},headless:{type:'boolean'},help:{type:'boolean'}}});}catch(e){throw fail(e.message+'\n'+usage,2);}
 const {values,positionals}=parsed;if(values.help){console.log(usage);return;}
 if(positionals.length>1)throw fail(usage,2);
 let scenario=positionals[0];
 if(!scenario){
  if(!process.stdin.isTTY)throw fail(usage,2);
  const menu=createInterface({input:process.stdin,output:process.stdout});
  try{const answer=(await menu.question('选择示例：1 招聘（重复教育经历） / 2 火车报销 / 3 私家车报销 [1]：')).trim();scenario=({'':'recruitment','1':'recruitment','2':'rail','3':'car'})[answer]??answer;}finally{menu.close();}
 }
 if(!Object.hasOwn(tasks,scenario))throw fail(`未知示例：${scenario}\n${usage}`,2);
 if(Number(process.versions.node.split('.')[0])<20)throw fail('需要 Node.js 20 或更新版本，然后运行 npm ci。',3);
 const pkg=JSON.parse(await readFile(path.join(projectRoot,'package.json'),'utf8'));
 for(const name of Object.keys({...pkg.dependencies,...pkg.devDependencies})){
  try{await access(path.join(projectRoot,'node_modules',name,'package.json'));}catch(e){if(e.code==='ENOENT')throw fail(`缺少项目依赖 ${name}。在仓库目录运行：npm ci`,3);throw e;}
 }
 const {chromium}=await import('playwright');
 try{await access(chromium.executablePath(),constants.X_OK);}catch(e){if(e.code==='ENOENT'||e.code==='EACCES')throw fail('Chromium 尚未就绪。在仓库目录运行：npx playwright install chromium',3);throw e;}
 if(!values.preview){
  const login=spawnSync('codex',['login','status'],{encoding:'utf8',timeout:10000});
  if(login.error?.code==='ENOENT')throw fail('未找到 Codex CLI。安装并将 codex 加入 PATH 后运行：codex login\n只看本地示例可加 --preview。',3);
  if(login.error)throw fail(`Codex 登录状态检查失败（${login.error.code}）。请运行 codex login status 检查。`,3);
  if(login.status!==0)throw fail('Codex 登录检查未通过。请先运行 codex login status；尚未登录时运行 codex login。\n只看本地示例可加 --preview。',3);
 }
 // Runtime dependencies are loaded only after the actionable preflight.
 const {createBrowserCompanion,companionCommand}=await import('../src/browser-companion.mjs');
 const root=await mkdtemp(path.join(os.tmpdir(),'afa-try-')),abort=new AbortController();let app,companion;
 const stop=()=>abort.abort();for(const sig of ['SIGINT','SIGTERM','SIGHUP'])process.on(sig,stop);
 try{
  let url,sourcePath;
  if(scenario==='recruitment'){
   await import('./build-fixtures.mjs');const {createBridge}=await import('../src/bridge.mjs');app=await createBridge({port:0});
   url=app.config.bridge+'/fixtures/alias-form.html';sourcePath=path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md');
  }else{
   const {createExpenseServer,expenseCases}=await import('../bench/expense-server.mjs');sourcePath=path.join(root,'facts.md');await writeFile(sourcePath,expenseCases[scenario].source);
   app=await createExpenseServer();url=app.origin+'/expense';
  }
  companion=await createBrowserCompanion({url,sourcePath,temporary:true,baseDir:root,headless:!!values.headless,signal:abort.signal});
  await companion.page.getByRole(scenario==='recruitment'?'textbox':'radio',{name:scenario==='recruitment'?'Applicant name':'Rail',exact:true}).waitFor();
  console.log(`\n示例已就绪：${scenario}\n页面：${url}\n临时目录：${root}`);
  if(values.preview)console.log(`\n预览模式：只打开本地页面。虚构资料：${sourcePath}`);
  else console.log(`\nCodex 登录检查通过。保持本终端运行，在另一个终端复制：\n\n${companionCommand(companion.configPath)}\n\n进入 Codex 后复制任务：\n\n${tasks[scenario]}`);
  console.log(`\n${scenario==='recruitment'?'预期：10 个已知目标填写正确，未提供的到岗日期留空。':`预期：页面显示 Draft saved.，总额 GBP ${scenario==='rail'?'42.75':'50.45'}。`}\n关闭示例标签页/浏览器或按 Ctrl+C 结束；临时浏览器资料、连接和草稿随后删除。`);
  await companion.done;
 }catch(e){if(!abort.signal.aborted)throw e;}
 finally{
  try{await companion?.close();}finally{try{await app?.close();}finally{await rm(root,{recursive:true,force:true});for(const sig of ['SIGINT','SIGTERM','SIGHUP'])process.removeListener(sig,stop);}}
 }
}
try{await main();}catch(e){console.error(e.message);process.exitCode=e.exitCode??1;}
