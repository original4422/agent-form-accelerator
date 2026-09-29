import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,readFile,rm,stat,readdir} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createBrowserCompanion} from '../src/browser-companion.mjs';
import {captureLocalReceipt,renderLocalReceipt} from '../src/local-receipt.mjs';
const execute=promisify(execFile),root=await mkdtemp(path.join(os.tmpdir(),'afa-receipt-'));
const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html');res.end('<form><label>Name<input id="name" required></label><label>Email<input id="email" type="email" required></label><label>Start date<input type="date" required></label><p role="status">Unsaved | draft &lt;example&gt;</p><button type="button" onclick="document.querySelector(\'label\').firstChild.textContent=\'New meaning\';this.insertAdjacentHTML(\'beforebegin\',\'<label>Extra<input required></label>\')">Change question</button></form>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let app,client;const sourcePath=path.join(root,'facts.md');
const cli=async(...args)=>(await execute(process.execPath,['prototype/scripts/receipt.mjs','--session',app.configPath,...args])).stdout;
const call=async(name,args={})=>{const response=await client.callTool({name,arguments:args});assert.ok(!response.isError,JSON.stringify(response));return JSON.parse(response.content[0].text);};
const connect=async()=>{client=new Client({name:'receipt-check',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,args:['prototype/src/browser-bindings-mcp.mjs'],env:{...process.env,AFA_BROWSER_SESSION:app.configPath},stderr:'pipe'}));};
try {
 await writeFile(sourcePath,'Name: Alex | <script> & **Example**\nEmail: alex@example.test\nUnused: private unrelated fact\n');
 app=await createBrowserCompanion({url:`http://127.0.0.1:${server.address().port}/form?secret=query#fragment`,sourcePath,temporary:true,headless:true,baseDir:root});
 await assert.rejects(cli('--format','json'),/NO_CAPTURED_RECEIPT/);
 await connect();let c=await call('form_context');
 const bindings=Object.fromEntries(c.page.fields.filter(f=>f.label!=='Start date').map(f=>[f.ref,c.source.entries.find(e=>e.label===f.label).id]));
 // An export between context and apply must not invalidate the runtime snapshot.
 const before=await readdir(path.join(root,'.runtime'));assert.equal(JSON.parse(await cli('--format','json')).source.entries.length,0);assert.deepEqual(await readdir(path.join(root,'.runtime')),before);
 const applied=await call('form_apply_bindings',{url:c.page.url,bindings});assert.equal(applied.complete,true);assert.equal(applied.coverage.visibleRequiredCovered,false);
 const receipt=JSON.parse(await cli('--format','json'));assert.equal(receipt.currentState,'not-revalidated');assert.equal(receipt.result.complete,true);assert.equal(receipt.result.coverage.unresolvedRequired[0].label,'Start date');assert.equal(receipt.result.page.formStatus.messages[0].text,'Unsaved | draft <example>');
 const cfg=JSON.parse(await readFile(app.configPath,'utf8')),encoded=JSON.stringify(receipt);for(const secret of [cfg.token,sourcePath,app.profilePath,'?secret=query','#fragment'])assert.ok(!encoded.includes(secret));
 assert.equal(receipt.source.entries.length,2);assert.ok(!encoded.includes('private unrelated fact'));assert.equal(receipt.source.entries[0].value,'Alex | <script> & **Example**');
 if(process.env.AFA_RECEIPT_EXAMPLE){await writeFile(process.env.AFA_RECEIPT_EXAMPLE,renderLocalReceipt(receipt));}
 const markdown=await cli();assert.ok(markdown.includes('Alex &#124; &lt;script&gt; &amp; &#42;&#42;Example&#42;&#42;'));assert.ok(markdown.includes('Historical snapshot'));
 const out=path.join(root,'receipt.md');await cli('--out',out);assert.equal((await stat(out)).mode&0o777,0o600);assert.equal(await readFile(out,'utf8'),markdown);await assert.rejects(cli('--out',out),/EEXIST/);
 await app.page.locator('#name').fill('Manual edit');await app.page.getByText('Change question',{exact:true}).click();
 assert.deepEqual(JSON.parse(await cli('--format','json')),receipt,'manual edits and dynamic fields must not masquerade as a fresh snapshot');
 c=await call('form_context');const refreshed=JSON.parse(await cli('--format','json'));assert.equal(refreshed.operation,'context');assert.equal(refreshed.result.coverage.visibleRequiredCovered,false);assert.ok(!(refreshed.result.task?.targets??[]).some(t=>t.status==='verified'&&t.label==='New meaning'));assert.ok(refreshed.result.page.fields.some(f=>f.label==='New meaning'&&f.value==='Manual edit'));assert.ok(refreshed.result.page.fields.some(f=>f.label==='Extra'));assert.equal(refreshed.currentState,'not-revalidated');
 await client.close();client=undefined;assert.deepEqual(JSON.parse(await cli('--format','json')),refreshed,'receipt remains available after MCP exits');
 await writeFile(sourcePath,'Name: changed source\n');assert.deepEqual(JSON.parse(await cli('--format','json')),refreshed,'historical source hash is never described as fresh');
 await app.page.goto(`http://127.0.0.1:${server.address().port}/other`);assert.deepEqual(JSON.parse(await cli('--format','json')),refreshed,'navigation leaves the explicitly historical page identity');
 const source={sha256:'hash',entries:[{id:'s1',label:'text',value:'literal | <b>\nnext'}],extractionCoverage:{status:'partial-text',unparsedImages:[{page:1,bbox:[1,2,3,4]}]}};
 const partial=captureLocalReceipt('apply',{...applied,sourceCoverage:source.extractionCoverage},source);assert.deepEqual(partial.source.extractionCoverage,source.extractionCoverage);assert.ok(renderLocalReceipt(partial).includes('partial-text'));assert.ok(renderLocalReceipt(partial).includes('unparsedImages'));assert.ok(renderLocalReceipt(partial).includes('literal &#124; &lt;b&gt;<br>next'));
 if(process.env.AFA_RECEIPT_PDF==='1'){
  await app.close();process.env.AFA_PDF_SOURCE='1';process.env.AFA_PDF_ALLOW_IMAGES='1';
  app=await createBrowserCompanion({url:`http://127.0.0.1:${server.address().port}/pdf`,sourcePath:path.resolve('prototype/fixtures/pdf/image-facts.pdf'),temporary:true,headless:true,baseDir:root});
  await connect();const pdfContext=await call('form_context');const email=pdfContext.source.entries.find(e=>e.value.includes('@'));const field=pdfContext.page.fields.find(f=>f.label==='Email');
  const appliedPdf=await call('form_apply_bindings',{url:pdfContext.page.url,bindings:{[field.ref]:email.id}});assert.equal(appliedPdf.complete,true);
  const exported=JSON.parse(await cli('--format','json'));assert.equal(exported.source.extractionCoverage.status,'partial-text');assert.deepEqual(exported.source.extractionCoverage,pdfContext.source.extractionCoverage);assert.equal(exported.source.entries.length,1);assert.equal(exported.source.entries[0].value,'candidate@example.test');assert.ok(exported.result.coverage.unresolvedRequired.some(f=>f.label==='Start date'));assert.ok(!(await cli()).includes('2030-07-19'));
  console.log('PASS real mixed PDF through companion/MCP retains unparsed images and does not invent image-only start date');
 }
 await client?.close();client=undefined;
 const moduleUrl=new URL('../src/bindings-server.mjs',import.meta.url).href;
 const fakePage={url:'http://example.test/form',documentId:'d',snapshot:'v',fields:[{ref:'f1',label:'Name',group:'',kind:'text',supported:true,value:'changed source'}],controls:[]};
 const code=`import {serveBindings} from ${JSON.stringify(moduleUrl)};let writes=0;const page=${JSON.stringify(fakePage)};await serveBindings({sourcePath:${JSON.stringify(sourcePath)},contextMode:'prefetch',receiptMode:'changes',onReceipt:async()=>{throw new Error('CAPTURE_UNAVAILABLE')},request:async r=>{if(r.op==='inspect')return page;if(++writes>1)throw new Error('REPEATED_WRITE');return {complete:true,evidence:[],observation:page};}});`;
 client=new Client({name:'receipt-failure-check',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,args:['--input-type=module','-e',code],stderr:'pipe'}));
 const contextFailure=await call('form_context');assert.equal(contextFailure.receiptCapture.reason,'CAPTURE_UNAVAILABLE');
 const applyFailure=await call('form_apply_bindings',{url:fakePage.url,bindings:{f1:'s1'}});assert.equal(applyFailure.complete,true);assert.equal(applyFailure.receiptFormat,'changes-v1');assert.equal(applyFailure.receiptCapture.reason,'CAPTURE_UNAVAILABLE');
 console.log('PASS capture failure remains visible through compact context and changes-v1 without changing completion or retrying writes');
 console.log('PASS local receipt: real MCP fill, no snapshot invalidation, missing fact, manual/dynamic edits, refresh, disconnected MCP, source changes/navigation, escaping, exclusive private output and partial-source propagation');
}finally{await client?.close();await app?.close();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
