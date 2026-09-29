import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {readDocumentSource} from '../src/source-reader.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {resolveSourceBinding} from '../src/source-quote.mjs';
import {companionCommand} from '../src/browser-companion.mjs';
import {projectReceipt} from '../src/receipt-projection.mjs';
const results=[],root=await mkdtemp(path.join(os.tmpdir(),'afa-mixed-pdf-'));
const file=name=>`prototype/fixtures/pdf/${name}.pdf`;
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}};
process.env.AFA_PDF_SOURCE='1';delete process.env.AFA_PDF_ALLOW_IMAGES;
try{
 await check('strict default rejects a text CV with a portrait',async()=>{await assert.rejects(readDocumentSource(file('text-portrait')),/PDF_IMAGES_REQUIRE_REVIEW/);assert.ok(!companionCommand('/tmp/session').includes('AFA_PDF_ALLOW_IMAGES'));});
 process.env.AFA_PDF_ALLOW_IMAGES='1';
 await check('printed Codex command carries explicit image opt-in',async()=>{assert.ok(companionCommand('/tmp/session').includes('env.AFA_PDF_ALLOW_IMAGES="1"'));});
 await check('inline image parser omissions reject in both modes, including nested Forms',async()=>{for(const mode of ['0','1']){process.env.AFA_PDF_ALLOW_IMAGES=mode;for(const name of ['inline-facts','form-inline-facts'])await assert.rejects(readDocumentSource(file(name)),/PDF_INLINE_IMAGES_UNSUPPORTED/);}process.env.AFA_PDF_ALLOW_IMAGES='1';});
 await check('literal BI text is not an image operator',async()=>{const s=await readDocumentSource(file('literal-bi'));assert.ok(s.entries[0].value.startsWith('BI is literal'));});
 const portrait=await readDocumentSource(file('text-portrait'));
 await check('portrait is unparsed content with exact page and region, never decorative by assumption',async()=>{assert.equal(portrait.extractionCoverage.status,'partial-text');assert.deepEqual(portrait.extractionCoverage.unparsedImages,[{page:1,bbox:[470,37.5,570,150]}]);assert.ok(portrait.entries.some(e=>e.value==='candidate@example.test'));assert.match(portrait.extractionCoverage.warning,/conflicting facts/);});
 await check('image-only facts cannot become source entries or exact quotes',async()=>{const s=await readDocumentSource(file('image-facts'));assert.equal(s.extractionCoverage.status,'partial-text');assert.ok(!JSON.stringify(s.entries).includes('2030-07-19'));for(const e of s.entries)assert.throws(()=>resolveSourceBinding(s.entries,{sourceId:e.id,quote:'2030-07-19'}),/SOURCE_QUOTE/);});
 await check('all-scan and mixed text/scan pages still fail explicitly with opt-in',async()=>{for(const name of ['scan','mixed-scan-page'])await assert.rejects(readDocumentSource(file(name)),/PDF_(NO_TEXT|INLINE_IMAGES_UNSUPPORTED)/);});
 await check('duplicate names remain distinct spatial entries, without inferred identity',async()=>{const s=await readDocumentSource(file('duplicate-names')),names=s.entries.filter(e=>e.value==='Taylor Example');assert.equal(names.length,2);assert.notEqual(names[0].id,names[1].id);assert.equal(names[0].bbox[0],40);assert.equal(names[1].bbox[0],330);assert.ok(names.every(e=>e.label==='PDF text run'));});
 const page={url:'http://localhost/form',documentId:'d',snapshot:'v',fields:[{ref:'f1',group:'',label:'Email',kind:'email',supported:true},{ref:'f2',group:'',label:'Start date',kind:'date',supported:true,required:true}],controls:[]};
 const request=async r=>r.op==='inspect'?page:{complete:true,evidence:[],observation:page};
 await check('full and delta apply receipts retain partial-source coverage despite complete target',async()=>{for(const conditionalSelection of [false,true]){const session=await createDocumentSession({sourcePath:file('image-facts'),request,conditionalSelection});const context=await session.context();assert.equal(context.source.extractionCoverage.status,'partial-text');const email=context.source.entries.find(e=>e.value.includes('@'));const r=await session.apply({url:page.url,bindings:{f1:email.id}});assert.equal(r.complete,true);assert.equal(r.completionScope,'requested-targets');assert.equal(r.sourceCoverage.status,'partial-text');assert.deepEqual(projectReceipt(r,page).sourceCoverage,context.source.extractionCoverage);assert.equal(r.bindings.length,1);}});
 await check('unresolved conditional result retains image regions without a write',async()=>{const choicePage={...page,fields:[{ref:'f1',group:'',label:'School',kind:'select',supported:true,options:[]}]};let writes=0;const session=await createDocumentSession({sourcePath:file('text-portrait'),conditionalSelection:true,request:async r=>{if(r.op==='inspect')return choicePage;if(r.op==='discover')return {observation:choicePage,searches:[{status:'observed',options:[]}]};writes++;}});const ctx=await session.context();const r=await session.apply({url:page.url,bindings:{f1:ctx.source.entries[0].id},choices:{f1:{search:{query:'school',labelParts:['school']}}}});assert.equal(r.complete,false);assert.equal(r.sourceCoverage.status,'partial-text');assert.equal(writes,0);});
 await check('actual MCP prefetch and apply wire carry partial text coverage',async()=>{
  const moduleUrl=new URL('../src/bindings-server.mjs',import.meta.url).href;
  const code=`import {serveBindings} from ${JSON.stringify(moduleUrl)};const page=${JSON.stringify(page)};await serveBindings({sourcePath:${JSON.stringify(path.resolve(file('image-facts')))},request:async r=>r.op==='inspect'?page:{complete:true,evidence:[],observation:page},contextMode:'prefetch',receiptMode:'changes'});`;
  const client=new Client({name:'pdf-mixed-check',version:'1'},{capabilities:{}});
  try{await client.connect(new StdioClientTransport({command:process.execPath,args:['--input-type=module','-e',code],env:{...process.env}}));
   const tools=await client.listTools();assert.match(tools.tools.find(t=>t.name==='form_apply_bindings').description,/partial-text/);
   const context=JSON.parse((await client.callTool({name:'form_context',arguments:{}})).content[0].text);
   assert.equal(context.source.extractionCoverage.status,'partial-text');
   const email=context.source.entries.find(e=>e.value.includes('@'));
   const result=JSON.parse((await client.callTool({name:'form_apply_bindings',arguments:{url:page.url,bindings:{f1:email.id}}})).content[0].text);
   assert.equal(result.receiptFormat,'changes-v1');assert.equal(result.complete,true);assert.deepEqual(result.sourceCoverage,context.source.extractionCoverage);
  }finally{await client.close();}
 });
 await check('changed mixed PDF invalidates source before writing',async()=>{const copied=path.join(root,'cv.pdf');await writeFile(copied,await readFile(file('text-portrait')));let writes=0;const session=await createDocumentSession({sourcePath:copied,request:async r=>{if(r.op==='inspect')return page;writes++;}});await session.context();await writeFile(copied,Buffer.concat([await readFile(copied),Buffer.from('\n% changed image or text')]));await assert.rejects(session.apply({url:page.url,bindings:{f1:'s1'}}),/SOURCE_CHANGED/);assert.equal(writes,0);});
 await check('pure-text entries are identical with and without image opt-in',async()=>{const enabled=await readDocumentSource(file('two-columns'));delete process.env.AFA_PDF_ALLOW_IMAGES;const strict=await readDocumentSource(file('two-columns'));assert.deepEqual(enabled,strict);assert.equal(strict.extractionCoverage,undefined);});
}finally{delete process.env.AFA_PDF_ALLOW_IMAGES;await rm(root,{recursive:true,force:true});await writeFile('prototype/reports/pdf-mixed-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
