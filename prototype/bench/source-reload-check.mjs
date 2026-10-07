import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createBridge,projectRoot} from '../src/bridge.mjs';
import {createBrowserCompanion} from '../src/browser-companion.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {conditionalBindings} from './conditional-cases.mjs';
import {aliasQueries,aliasOracle} from './alias-cases.mjs';
import '../scripts/build-fixtures.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'afa-source-reload-')),fixtures=await createBridge({port:0});
const sourcePath=path.join(root,'facts.md'),initial=await readFile(path.join(projectRoot,'prototype/fixtures/documents/alias-candidate.md'),'utf8');
let app,client,transport;
const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);};
const rejected=async(name,args,pattern)=>{const r=await client.callTool({name,arguments:args});assert.equal(r.isError,true,JSON.stringify(r));assert.match(r.content[0].text,pattern);};
const connect=async(configPath=app.configPath)=>{client=new Client({name:'source-reload-check',version:'1'});transport=new StdioClientTransport({command:process.execPath,args:['prototype/src/browser-bindings-mcp.mjs'],env:{...process.env,AFA_BROWSER_SESSION:configPath},stderr:'pipe'});await client.connect(transport);};
const receipt=async()=>{const cfg=JSON.parse(await readFile(app.configPath,'utf8'));return (await fetch(cfg.endpoint.replace('/request','/receipt'),{method:'POST',headers:{authorization:`Bearer ${cfg.token}`,'content-type':'application/json'},body:JSON.stringify({op:'export'})})).json();};
try {
 await writeFile(sourcePath,initial);
 app=await createBrowserCompanion({url:fixtures.config.bridge+'/fixtures/alias-form.html',sourcePath,temporary:true,headless:true,baseDir:root});await app.page.getByRole('textbox',{name:'Applicant name',exact:true}).waitFor();await connect();
 const pageEpoch=await app.page.evaluate(()=>performance.timeOrigin);const pid=transport.pid,browser=app.context.browser(),original=await call('form_context');assert.ok(pid);assert.ok(browser);assert.ok(original.source.version);assert.ok(original.source.entries.every(e=>e.id.startsWith(original.source.version+':')));
 const oldApply={...conditionalBindings(original),sourceVersion:original.source.version};const first=await call('form_apply_bindings',oldApply);assert.equal(first.complete,true);assert.equal(first.coverage.visibleRequiredCovered,false);
 assert.equal((await aliasOracle(app.page,original.source.entries.find(e=>e.label==='个人介绍').value)).passed,true);
 const oldContext=await call('form_context'),oldQuery=aliasQueries(oldContext)[0];const oldSearch={sourceVersion:original.source.version,url:oldContext.page.url,queries:[oldQuery]};
 const discovered=await call('form_search',oldSearch),oldOption=discovered.searches[0].options[0].optionRef;
 const oldReceipt=await receipt();assert.equal(oldReceipt.source.version,original.source.version);
 const savedExport=path.join(root,'old-receipt.json');await writeFile(savedExport,JSON.stringify(oldReceipt));
 const changed='无关条目：insertion must never become a name\n\n'+initial.replace('candidate@example.test','corrected@example.test')+'\n## 补充\n到岗日期：2030-07-19\n';await writeFile(sourcePath,changed);
 await rejected('form_context',{},/SOURCE_CHANGED/);await rejected('form_apply_bindings',oldApply,/SOURCE_CHANGED/);assert.deepEqual(await receipt(),oldReceipt);
 const reloaded=await call('form_reload_source');assert.equal(reloaded.sourceReload.changed,true);assert.notEqual(reloaded.source.version,original.source.version);assert.equal(reloaded.source.generation,2);assert.equal(await app.page.evaluate(()=>performance.timeOrigin),pageEpoch);assert.equal(reloaded.coverage.verifiedRequiredUnits,0);assert.equal(reloaded.task,undefined);
 assert.equal(await app.page.getByRole('textbox',{name:'Email address',exact:true}).inputValue(),'candidate@example.test');assert.equal(await app.page.locator('input[type=date]').inputValue(),'');assert.equal(transport.pid,pid);assert.equal(app.context.browser(),browser);
 const tools=await client.listTools(),description=tools.tools.find(t=>t.name==='form_apply_bindings').description;const prefetched=JSON.parse(description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);assert.equal(prefetched.source.version,reloaded.source.version);assert.ok(!description.includes(original.source.entries[0].id));assert.equal(prefetched.sourceReload.previousVersion,original.source.version);
 for(const [tool,payload]of [['form_apply_bindings',oldApply],['form_search',oldSearch],['form_expand',{sourceVersion:original.source.version,url:oldContext.page.url,controlRef:oldContext.page.controls[0].ref}]])await rejected(tool,payload,/SOURCE_VERSION_MISMATCH/);
 // A new handshake alone cannot revive old source-entry IDs or observed options.
 await rejected('form_apply_bindings',{...oldApply,sourceVersion:reloaded.source.version},/UNKNOWN_(FIELD_OR_)?SOURCE/);
 await rejected('form_search',{...oldSearch,sourceVersion:reloaded.source.version},/UNKNOWN_SOURCE/);
 const city=reloaded.page.fields.find(f=>f.label==='Preferred office city'),citySource=reloaded.source.entries.find(e=>e.label==='意向工作城市');
 await rejected('form_apply_bindings',{sourceVersion:reloaded.source.version,url:reloaded.page.url,bindings:{[city.ref]:citySource.id},choices:{[city.ref]:{optionRef:oldOption}}},/INVALID_OPTION_REFERENCE/);
 const email=reloaded.page.fields.find(f=>f.label==='Email address'),date=reloaded.page.fields.find(f=>f.kind==='date');
 const newPayload={sourceVersion:reloaded.source.version,url:reloaded.page.url,bindings:{[email.ref]:reloaded.source.entries.find(e=>e.label==='邮箱').id,[date.ref]:reloaded.source.entries.find(e=>e.label==='到岗日期').id}};
 const continued=await call('form_apply_bindings',newPayload);assert.equal(continued.complete,true);assert.equal(await app.page.getByRole('textbox',{name:'Email address',exact:true}).inputValue(),'corrected@example.test');assert.equal(await app.page.locator('input[type=date]').inputValue(),'2030-07-19');assert.equal(await app.page.evaluate(()=>window.submissionCount),0);assert.equal(await readFile(sourcePath,'utf8'),changed);
 const newReceipt=await receipt();assert.equal(newReceipt.source.sha256,reloaded.source.sha256);assert.equal(newReceipt.source.version,reloaded.source.version);assert.equal(newReceipt.source.generation,2);assert.deepEqual(JSON.parse(await readFile(savedExport,'utf8')),oldReceipt);
 // Missing/invalid candidates never publish a version or a new historical record.
 await rename(sourcePath,sourcePath+'.away');await rejected('form_reload_source',{},/ENOENT/);assert.deepEqual(await receipt(),newReceipt);await rejected('form_apply_bindings',newPayload,/ENOENT/);
 await rename(sourcePath+'.away',sourcePath);await writeFile(sourcePath,'');await rejected('form_reload_source',{},/Expected 1–100/);assert.deepEqual(await receipt(),newReceipt);await rejected('form_context',{},/Expected 1–100/);
 await writeFile(sourcePath,changed);const same=await call('form_reload_source');assert.equal(same.sourceReload.changed,false);assert.equal(same.source.generation,3);assert.notEqual(same.source.version,reloaded.source.version);assert.equal(same.coverage.verifiedRequiredUnits,0);await rejected('form_apply_bindings',newPayload,/SOURCE_VERSION_MISMATCH/);
 await writeFile(sourcePath,initial);const restored=await call('form_reload_source');assert.equal(restored.source.sha256,original.source.sha256);assert.equal(restored.source.generation,4);assert.notEqual(restored.source.version,original.source.version);await rejected('form_apply_bindings',oldApply,/SOURCE_VERSION_MISMATCH/);assert.equal(await app.page.getByRole('textbox',{name:'Email address',exact:true}).inputValue(),'corrected@example.test');
 // Concurrent requests use the existing queue: reload must invalidate the queued old version.
 const [reloadResponse,staleResponse]=await Promise.all([client.callTool({name:'form_reload_source',arguments:{}}),client.callTool({name:'form_expand',arguments:{sourceVersion:restored.source.version,url:restored.page.url,controlRef:restored.page.controls[0].ref}})]);assert.ok(!reloadResponse.isError);assert.equal(staleResponse.isError,true);assert.match(staleResponse.content[0].text,/SOURCE_VERSION_MISMATCH/);
 console.log('PASS same MCP/browser: missing-date continuation, correction without reload writes, shifted IDs, old apply/search/expand/options, same bytes/reverted bytes, failed reload recovery, queued mutations, updated tools/list and historical receipts');
 // A source change during the inspection cannot half-publish a parsed candidate.
 const atomicPath=path.join(root,'atomic.md');await writeFile(atomicPath,'Name: Original');let mutate=false;
 const page={url:'http://example.test',documentId:'d',fields:[],controls:[]};const session=await createDocumentSession({sourcePath:atomicPath,sourceReload:true,request:async()=>{if(mutate)await writeFile(atomicPath,'Name: Changed during inspect');return page;}});const prior=session.source;await writeFile(atomicPath,'Name: Candidate');mutate=true;await assert.rejects(session.reload(),/SOURCE_CHANGED/);assert.equal(session.source,prior);await assert.rejects(session.apply({sourceVersion:prior.version}),/SOURCE_CHANGED/);
 // Version protection also precedes repeated/checkbox plans at the session boundary.
 for(const args of [{repeatGroups:[{}]},{checkboxGroups:[{}]}])await assert.rejects(session.apply({sourceVersion:'stale',...args}),/SOURCE_VERSION_MISMATCH/);
 const legacy=await createDocumentSession({sourcePath,request:async()=>page});assert.equal(legacy.source.entries[0].id,'s1');assert.equal(legacy.source.version,undefined);await assert.rejects(legacy.reload(),/NOT_ENABLED/);
 console.log('PASS atomic publication, repeat/checkbox version guards and legacy default IDs');
 await client.close();client=undefined;
 const legacyConfig=JSON.parse(await readFile(app.configPath,'utf8'));delete legacyConfig.sourceReload;const legacyPath=path.join(root,'legacy-session.json');await writeFile(legacyPath,JSON.stringify(legacyConfig));await connect(legacyPath);
 const legacyTools=(await client.listTools()).tools;assert.equal(legacyTools.length,4);assert.ok(!legacyTools.some(t=>t.name==='form_reload_source'));assert.ok(!Object.hasOwn(legacyTools.find(t=>t.name==='form_apply_bindings').inputSchema.properties,'sourceVersion'));assert.equal((await call('form_context')).source.entries[0].id,'s1');
 console.log('PASS legacy benchmark session file retains original tools/schema/entry IDs');
 if(process.env.AFA_RELOAD_PDF==='1'){
  await client.close();client=undefined;await app.close();process.env.AFA_PDF_SOURCE='1';process.env.AFA_PDF_ALLOW_IMAGES='1';
  const pdfPath=path.join(root,'facts.pdf'),pdf=await readFile('prototype/fixtures/pdf/image-facts.pdf');await writeFile(pdfPath,pdf);
  app=await createBrowserCompanion({url:fixtures.config.bridge+'/fixtures/plain.html',sourcePath:pdfPath,temporary:true,headless:true,baseDir:root});await connect();const pdfOld=await call('form_context');
  await writeFile(pdfPath,await readFile('prototype/fixtures/pdf/scan.pdf'));await rejected('form_reload_source',{},/PDF_(NO_TEXT|INLINE_IMAGES_UNSUPPORTED)/);assert.equal((await receipt()).source.version,pdfOld.source.version);
  await writeFile(pdfPath,Buffer.concat([pdf,Buffer.from('\n% explicit source revision')]));const pdfNew=await call('form_reload_source');assert.equal(pdfNew.source.generation,2);assert.equal(pdfNew.source.extractionCoverage.status,'partial-text');assert.notEqual(pdfNew.source.sha256,pdfOld.source.sha256);
  const emailField=pdfNew.page.fields.find(f=>f.kind==='email'),emailSource=pdfNew.source.entries.find(e=>e.value.includes('@'));const pdfApply=await call('form_apply_bindings',{sourceVersion:pdfNew.source.version,url:pdfNew.page.url,bindings:{[emailField.ref]:emailSource.id}});assert.equal(pdfApply.complete,true);
  const exported=await receipt();assert.equal(exported.source.version,pdfNew.source.version);assert.deepEqual(exported.source.extractionCoverage,pdfNew.source.extractionCoverage);assert.equal(exported.source.entries.length,1);assert.ok(!JSON.stringify(exported).includes('2030-07-19'));
  console.log('PASS actual partial-text PDF reload, failed scan candidate, same file recovery, versioned binding and receipt');
 }
}finally{await client?.close();await app?.close();await fixtures.close();await rm(root,{recursive:true,force:true});}
