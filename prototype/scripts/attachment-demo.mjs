import path from 'node:path';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion,companionCommand,receiptCommand} from '../src/browser-companion.mjs';
let fixtures,app;const controller=new AbortController(),stop=()=>controller.abort();
for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.once(signal,stop);
try{
 fixtures=await createBridge({port:0});
 app=await createBrowserCompanion({url:fixtures.config.bridge+'/fixtures/attachment-form.html',sourcePath:path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md'),attachment:{filePath:path.join(projectRoot,'prototype/fixtures/pdf/image-facts.pdf'),label:'Resume/CV',group:'Application'},temporary:true,signal:controller.signal});
 console.log(`虚构 localhost 附件演示已打开。此命令单独登记 image-facts.pdf，唯一目标为 Application / Resume/CV。\n\n${companionCommand(app.configPath)}\n\n向 Codex 说明：读取 form_context，只将已登记附件设置到已授权 Resume/CV 控件，报告字节回读及页面状态，不填写其他字段。\n\n导出最近历史回执：\n${receiptCommand(app.configPath)}\n\n关闭浏览器或 Ctrl+C 清理临时会话。`);
 await app.done;
}catch(error){if(error.code!=='ABORT_ERR'){console.error(error.message);process.exitCode=1;}}
finally{await app?.close();await fixtures?.close();for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.removeListener(signal,stop);}
