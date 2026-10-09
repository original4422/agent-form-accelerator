import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';import os from 'node:os';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion} from '../src/browser-companion.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'afa-attachment-')),fixtures=await createBridge({port:0});
const sourcePath=path.join(root,'facts.md'),filePath=path.join(root,'fictional.pdf');
const bytes=await readFile(path.join(projectRoot,'prototype/fixtures/pdf/image-facts.pdf'));
const expectedHash=createHash('sha256').update(bytes).digest('hex');
await writeFile(sourcePath,'Name: Fictional Candidate');await writeFile(filePath,bytes);
let app,client;
const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);};
const rejected=async(args,pattern)=>{const r=await client.callTool({name:'form_attach_file',arguments:args});assert.equal(r.isError,true,JSON.stringify(r));assert.match(r.content[0].text,pattern);};
const connect=async()=>{client=new Client({name:'attachment-check',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,args:['prototype/src/browser-bindings-mcp.mjs'],env:{...process.env,AFA_BROWSER_SESSION:app.configPath},stderr:'pipe'}));};
const exported=async()=>{const config=JSON.parse(await readFile(app.configPath,'utf8'));return (await fetch(config.endpoint.replace('/request','/receipt'),{method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify({op:'export'})})).json();};
const start=async attachment=>{app=await createBrowserCompanion({url:fixtures.config.bridge+'/fixtures/attachment-form.html',sourcePath,temporary:true,headless:true,baseDir:root,...(attachment?{attachment:{filePath,label:'Resume/CV',group:'Application'}}:{})});await connect();};
const counts=()=>app.page.evaluate(()=>({...window.attachmentChanges,submit:window.submissionCount,name:document.querySelector('#name').value}));
try{
 await start(false);const defaults=(await client.listTools()).tools;
 assert.equal(defaults.length,5);assert.ok(!defaults.some(t=>t.name==='form_attach_file'));
 assert.equal((await call('form_context')).page.attachments,undefined);
 await client.close();client=undefined;await app.close();app=undefined;
 await start(true);const ctx=await call('form_context'),attachment=ctx.page.attachments[0];
 assert.equal(attachment.reason,'ATTACHMENT_NOT_SELECTED');assert.equal(attachment.sha256,expectedHash);
 const args={url:ctx.page.url,attachmentId:attachment.attachmentId,ref:attachment.target.ref};
 assert.ok(!JSON.stringify(ctx).includes(root));
 const tools=(await client.listTools()).tools;
 assert.deepEqual(tools.filter(t=>t.name!=='form_attach_file').map(t=>[t.name,t.inputSchema]),defaults.map(t=>[t.name,t.inputSchema]));
 await rejected({...args,attachmentId:'old-registration'},/UNKNOWN_ATTACHMENT/);
 await rejected({...args,ref:ctx.page.fields.find(f=>f.label==='Autofill from resume').ref},/NOT_AUTHORIZED/);
 await rejected({...args,ref:ctx.page.fields.find(f=>f.label==='Cover letter').ref},/NOT_AUTHORIZED/);
 await writeFile(filePath,'changed file');await rejected(args,/FILE_CHANGED/);assert.equal((await counts()).resume,0);await writeFile(filePath,bytes);
 const result=await call('form_attach_file',args);assert.equal(result.attachment.status,'verified');
 const independentlyRead=await app.page.locator('#resume').evaluate(async el=>Array.from(new Uint8Array(await el.files[0].arrayBuffer())));
 assert.equal(createHash('sha256').update(Buffer.from(independentlyRead)).digest('hex'),expectedHash);
 assert.deepEqual(await counts(),{autofill:0,resume:1,cover:0,submit:0,name:'Fictional Candidate'});
 const oldReceipt=await exported(),oldSerialized=JSON.stringify(oldReceipt);assert.equal(oldReceipt.result.page.attachments[0].status,'verified');assert.equal(oldReceipt.result.page.attachments[0].sha256,expectedHash);
 // Export is historical and does not silently re-read after a manual replacement.
 await app.page.locator('#resume').setInputFiles({name:'fictional.pdf',mimeType:'application/pdf',buffer:Buffer.from('manual replacement')});
 assert.equal(JSON.stringify(await exported()),oldSerialized);
 const refreshed=await call('form_context');assert.equal(refreshed.page.attachments[0].reason,'ATTACHMENT_BYTES_MISMATCH');assert.equal(JSON.stringify(oldReceipt),oldSerialized);
 for(const [mode,reason]of [['clear','ATTACHMENT_NOT_SELECTED'],['replace','ATTACHMENT_BYTES_MISMATCH'],['invalid','ATTACHMENT_INVALID'],['pending','ATTACHMENT_PENDING']]){
  await app.page.evaluate(mode=>{window.attachmentMode=mode;document.querySelector('#resume').setCustomValidity('');document.querySelector('fieldset').removeAttribute('aria-busy');},mode);
  await call('form_context');const failed=await call('form_attach_file',args);assert.equal(failed.attachment.status,'needs-review');assert.equal(failed.attachment.reason,reason);
 }
 await app.page.evaluate(()=>{window.attachmentMode='normal';document.querySelector('#resume').setCustomValidity('');document.querySelector('fieldset').removeAttribute('aria-busy');});await call('form_context');
 const before=await counts();
 await app.page.locator('#resume').evaluate(el=>el.labels[0].firstChild.textContent='Cover letter changed');
 await rejected(args,/FIELD_CHANGED|FORM_CONTEXT_CHANGED|TARGET_MISSING/);assert.deepEqual(await counts(),before);
 await app.page.locator('#resume').evaluate(el=>el.labels[0].firstChild.textContent='Resume/CV ');await call('form_context');
 await app.page.locator('legend').evaluate(el=>el.textContent='Different group');await rejected(args,/FIELD_CHANGED|FORM_CONTEXT_CHANGED|TARGET_MISSING/);assert.deepEqual(await counts(),before);
 await app.page.locator('legend').evaluate(el=>el.textContent='Application');await call('form_context');
 await app.page.locator('#resume').evaluate(el=>el.parentElement.after(el.parentElement.cloneNode(true)));
 await call('form_context');await rejected(args,/AMBIGUOUS/);assert.deepEqual(await counts(),before);
 await app.page.locator('input#resume').last().evaluate(el=>el.parentElement.remove());await call('form_context');
 await app.page.locator('#resume').evaluate(el=>el.multiple=true);await rejected(args,/TARGET_CHANGED/);assert.deepEqual(await counts(),before);
 await app.page.locator('#resume').evaluate(el=>el.multiple=false);await call('form_context');
 await app.page.locator('#resume').evaluate(el=>el.replaceWith(el.cloneNode(true)));await call('form_context');await rejected(args,/TARGET_CHANGED/);assert.deepEqual(await counts(),before);
 await app.page.reload();await rejected(args,/STALE_SNAPSHOT|TARGET_CHANGED/);await call('form_context');await rejected(args,/TARGET_CHANGED/);
 assert.equal((await counts()).resume,0);
 console.log('PASS actual stdio: independent file bytes, authorized Resume/CV only, unchanged default schemas, source-only no attachment, 0 submit, changed source file, old ID/ref, label/group/duplicate/multiple/node/navigation guards, cleared/replaced/invalid/pending, manual replacement and historical export');
 await client.close();client=undefined;await app.close();app=undefined;
 if(process.env.AFA_ATTACHMENT_PDF==='1'){
  process.env.AFA_PDF_SOURCE='1';process.env.AFA_PDF_ALLOW_IMAGES='1';
  app=await createBrowserCompanion({url:fixtures.config.bridge+'/fixtures/attachment-form.html',sourcePath:filePath,attachment:{filePath,label:'Resume/CV',group:'Application'},temporary:true,headless:true,baseDir:root});await connect();
  const partial=await call('form_context');assert.equal(partial.source.extractionCoverage.status,'partial-text');
  const a=partial.page.attachments[0];const selected=await call('form_attach_file',{url:partial.page.url,ref:a.target.ref,attachmentId:a.attachmentId});
  assert.equal(selected.attachment.status,'verified');assert.equal(selected.source.extractionCoverage.status,'partial-text');
  const receipt=await exported();assert.equal(receipt.source.extractionCoverage.status,'partial-text');assert.equal(receipt.result.page.attachments[0].status,'verified');
  console.log('PASS actual partial-text PDF source stays partial while independently authorized attachment bytes verify');
 }
}finally{await client?.close();await app?.close();await fixtures.close();await rm(root,{recursive:true,force:true});}
