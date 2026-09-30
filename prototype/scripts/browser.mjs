import {parseArgs} from 'node:util';
import path from 'node:path';
import {createInterface} from 'node:readline';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion,companionCommand,receiptCommand} from '../src/browser-companion.mjs';
const {values}=parseArgs({options:{url:{type:'string'},source:{type:'string'},attachment:{type:'string'},'attachment-label':{type:'string'},'attachment-group':{type:'string'},demo:{type:'boolean'},temporary:{type:'boolean'},'offline-after-ready':{type:'boolean'},headless:{type:'boolean'},help:{type:'boolean'}},strict:true});
if(values.help||(!values.demo&&(!values.url||!values.source))){
  console.log('快速演示：npm run browser:demo\n\n用法：npm run browser -- --url "https://招聘页地址" --source "/绝对路径/资料.md"\n\n打开独立浏览器，随后按打印的命令临时连接 Codex。可先在浏览器中登录。\n默认保留独立登录资料；--temporary 在退出时删除本次临时浏览器资料。\n--offline-after-ready：先手动登录并进入表单，按 Enter 冻结页面网络后才开放 Codex；强制临时资料，退出删除。\n--headless 仅用于自动检查。默认工具不提供附件动作。显式 localhost 附件：--attachment /绝对路径/文件.pdf --attachment-label "Resume/CV" --attachment-group "Application"。附件单独登记，工具不提供提交或导航。');
  if(!values.help)process.exitCode=1;
}else{
  let app,fixtures;const controller=new AbortController();
  const stop=()=>controller.abort();
  for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.once(signal,stop);
  try{
    const attachmentFlags=[values.attachment,values['attachment-label'],values['attachment-group']];
    if(attachmentFlags.some(v=>v!==undefined)&&!attachmentFlags.every(v=>v!==undefined))throw new Error('--attachment、--attachment-label、--attachment-group 必须一同指定');
    if(values.demo&&attachmentFlags.some(v=>v!==undefined))throw new Error('附件使用显式 localhost --url，不与 --demo 合用');
    if(values.demo&&(values.url||values.source))throw new Error('--demo 不能同时指定 --url 或 --source');
    if(values.demo){await import('./build-fixtures.mjs');fixtures=await createBridge({port:0});}
    const offlineAfterReady=!!values['offline-after-ready'];
    app=await createBrowserCompanion({url:values.demo?`${fixtures.config.bridge}/fixtures/alias-form.html`:values.url,sourcePath:values.demo?path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md'):values.source,temporary:values.temporary||values.demo,offlineAfterReady,headless:values.headless,signal:controller.signal,...(values.attachment?{attachment:{filePath:values.attachment,label:values['attachment-label'],group:values['attachment-group']}}:{})});
    if(offlineAfterReady){
      console.log('离线验证准备：请先在浏览器手动登录，进入目标表单并等待加载完成，再回到这里按 Enter。现在尚未开放 Codex 连接。');
      const lines=createInterface({input:process.stdin});
      try{
        const ready=await Promise.race([new Promise(resolve=>{lines.once('line',()=>resolve(true));lines.once('close',()=>resolve(false));}),app.done.then(()=>false)]);
        if(!ready){await app.close();process.exitCode=0;}else await app.freezeAndConnect();
      }finally{lines.close();}
    }
    if(app.configPath)console.log(`${offlineAfterReady?'页面 HTTP(S)/WebSocket 连接已切断。远程搜索和懒加载可能不可用，不能据此认定网站不支持该字段。':'浏览器已打开。可先在该标签页登录并进入填写页面。'}在另一终端执行：\n\n${companionCommand(app.configPath)}\n\n向 Codex 说明：根据提供的资料填写当前页${values.demo?'，包含两段教育经历并保留校区限定词':''}，批量处理可确定字段，缺少事实或不能验证的项目留空并报告，保留提交给我检查。\n\n仅连接最初打开的标签页；同一标签页导航后让 Codex 刷新 form_context。资料修改后让 Codex 显式调用 form_reload_source，再根据新版资料继续填写。\n关闭该标签页/浏览器或按 Ctrl+C 结束本次连接。${offlineAfterReady||values.temporary||values.demo?'临时浏览器资料会删除。':'独立登录资料保留在 .profiles/companion。'}`);
    if(app.configPath)console.log(`\n导出最近一次历史回执（不刷新页面，默认仅打印）：\n${receiptCommand(app.configPath)}\n加 --format json 或 --out /绝对路径/新文件.md 可选择格式与保存。`);
    await app.done;
  }catch(e){if(e.code!=='ABORT_ERR'){console.error(e.message);process.exitCode=1;}await app?.close().catch(()=>{});}
  finally{await fixtures?.close();for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.removeListener(signal,stop);}
}
