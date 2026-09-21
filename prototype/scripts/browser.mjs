import {parseArgs} from 'node:util';
import path from 'node:path';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion,companionCommand} from '../src/browser-companion.mjs';
const {values}=parseArgs({options:{url:{type:'string'},source:{type:'string'},demo:{type:'boolean'},temporary:{type:'boolean'},headless:{type:'boolean'},help:{type:'boolean'}},strict:true});
if(values.help||(!values.demo&&(!values.url||!values.source))){
  console.log('快速演示：npm run browser:demo\n\n用法：npm run browser -- --url "https://招聘页地址" --source "/绝对路径/资料.md"\n\n打开独立浏览器，随后按打印的命令临时连接 Codex。可先在浏览器中登录。\n默认保留独立登录资料；--temporary 在退出时删除本次临时浏览器资料。\n--headless 仅用于自动检查。工具不提供提交、上传或导航操作。');
  if(!values.help)process.exitCode=1;
}else{
  let app,fixtures;const controller=new AbortController();
  const stop=()=>controller.abort();
  for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.once(signal,stop);
  try{
    if(values.demo&&(values.url||values.source))throw new Error('--demo 不能同时指定 --url 或 --source');
    if(values.demo){await import('./build-fixtures.mjs');fixtures=await createBridge({port:0});}
    app=await createBrowserCompanion({url:values.demo?`${fixtures.config.bridge}/fixtures/alias-form.html`:values.url,sourcePath:values.demo?path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md'):values.source,temporary:values.temporary||values.demo,headless:values.headless,signal:controller.signal});
    console.log(`浏览器已打开。可先在该标签页登录并进入填写页面，然后在另一终端执行：\n\n${companionCommand(app.configPath)}\n\n向 Codex 说明：根据提供的资料填写当前页${values.demo?'，包含两段教育经历并保留校区限定词':''}，批量处理可确定字段，缺少事实或不能验证的项目留空并报告，保留提交给我检查。\n\n仅连接最初打开的标签页；同一标签页导航后让 Codex 刷新 form_context。资料修改后重新连接 Codex。\n关闭该标签页/浏览器或按 Ctrl+C 结束本次连接。${values.temporary||values.demo?'临时浏览器资料会删除。':'独立登录资料保留在 .profiles/companion。'}`);
    await app.done;
  }catch(e){if(e.code!=='ABORT_ERR'){console.error(e.message);process.exitCode=1;}await app?.close().catch(()=>{});}
  finally{await fixtures?.close();for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.removeListener(signal,stop);}
}
