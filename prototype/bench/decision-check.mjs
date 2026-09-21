import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {factorPage,expandFactoredPage} from '../src/decision-context.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {createOfflinePublicHarness} from './offline-public-harness.mjs';
import {serveOfflinePage} from './offline-public-bridge.mjs';
import {PUBLIC_URL,CASES,BOOL_CASES,publicOracle} from './offline-public-cases.mjs';
import {projectRoot} from '../src/bridge.mjs';
const rows=[],dir=await mkdtemp(path.join(os.tmpdir(),'afa-decision-check-'));
const check=async(name,fn)=>{await fn();rows.push({name,passed:true});console.log('PASS '+name);};
let h,bridge,client;
try{
 const sourcePath=path.join(dir,'source.md');await writeFile(sourcePath,'# Test\nLanguages: A and B\n');
 const fields=['A','B','C'].map((label,i)=>({ref:`f${i+1}`,label,group:'Languages',kind:'checkbox',supported:true,disabled:false,readOnly:false,value:i===2,options:[],required:false,valid:true,pending:false}));
 const page={url:'https://example.test/form',documentId:'d',snapshot:'s',fields,controls:[]};let goals=[];
 const request=async r=>{if(r.op==='inspect')return structuredClone(page);goals.push(r);return {complete:false,observation:structuredClone(page)};};
 const session=await createDocumentSession({sourcePath,request});await session.context();
 const group={group:'Languages',sourceId:'s1',selectedRefs:['f1','f2']};
 await check('factoring preserves all metadata and field order including exceptions',()=>{
  const p={...page,fields:[...fields,{...fields[0],ref:'f4',disabled:true,readOnly:true,required:true,valid:false,pending:true,options:[{label:'x',value:'y',disabled:true}]},{...fields[1],ref:'f5',group:'Other'},{...fields[0],ref:'f6'}]};
  assert.deepEqual(expandFactoredPage(factorPage(p)),p);assert.deepEqual(expandFactoredPage(factorPage({...p,fields:[]})),{...p,fields:[]});
 });
 await check('closed set expands selected and unselected to identical per-field targets',async()=>{
  await session.apply({url:page.url,bindings:{},checkboxGroups:[group]});assert.deepEqual(goals.at(-1).fields.map(f=>[f.label,f.value]),[['A',true],['B',true],['C',false]]);
 });
 await check('explicit empty set clears every observed checkbox',async()=>{
  await session.apply({url:page.url,checkboxGroups:[{...group,selectedRefs:[]}]});assert.ok(goals.at(-1).fields.every(f=>f.value===false));
 });
 const rejects=[
 ['unknown group',{...group,group:'Missing'},/UNSUPPORTED_CHECKBOX_GROUP/],
 ['ungrouped checkbox set',{...group,group:''},/INVALID_CHECKBOX_GROUP/],
 ['unknown source',{...group,sourceId:'missing'},/UNKNOWN_SOURCE/],
 ['cross-group or invented ref',{...group,selectedRefs:['f9']},/INVALID_SELECTED_REFS/],
 ['duplicate selected ref',{...group,selectedRefs:['f1','f1']},/INVALID_SELECTED_REFS/],
 ];
 for(const [name,g,reason]of rejects)await check(name+' rejected before backend write',async()=>{const n=goals.length;await assert.rejects(session.apply({url:page.url,checkboxGroups:[g]}),reason);assert.equal(goals.length,n);});
 await check('overlapping explicit/group bindings and duplicate groups rejected before write',async()=>{const n=goals.length;await assert.rejects(session.apply({url:page.url,bindings:{f3:'s1'},choices:{f3:false},checkboxGroups:[group]}),/OVERLAPPING/);await assert.rejects(session.apply({url:page.url,checkboxGroups:[group,group]}),/INVALID_CHECKBOX_GROUP/);assert.equal(goals.length,n);});
 for(const [key,value]of [['disabled',true],['readOnly',true],['supported',false],['kind','radio']])await check(key+' group member rejected before write',async()=>{const old=fields[2][key];fields[2][key]=value;await session.context();const n=goals.length;await assert.rejects(session.apply({url:page.url,checkboxGroups:[group]}),/UNSUPPORTED_CHECKBOX_GROUP/);assert.equal(goals.length,n);fields[2][key]=old;});
 await check('changed source rejected before grouped write',async()=>{await session.context();await writeFile(sourcePath,'# Test\nLanguages: C\n');const n=goals.length;await assert.rejects(session.apply({url:page.url,checkboxGroups:[group]}),/SOURCE_CHANGED/);assert.equal(goals.length,n);});

 await writeFile(sourcePath,'# Test\nLanguages: A and B\n');
 for(const change of ['added','removed','renamed','kind','disabled','readonly','replaced'])await check('final checkbox membership '+change+(change==='replaced'?' preserves identity':' prevents false completion'),async()=>{
  const initial={...page,fields:structuredClone(fields)},final=structuredClone(initial);
  if(change==='added')final.fields.push({...final.fields[0],ref:'f9',label:'New option',value:true});
  if(change==='removed')final.fields.pop();
  if(change==='renamed')final.fields[2].label='Different meaning';
  if(change==='kind')final.fields[2].kind='radio';
  if(change==='disabled')final.fields[2].disabled=true;
  if(change==='readonly')final.fields[2].readOnly=true;
  if(change==='replaced')final.fields[2].ref='replacement';
  const s=await createDocumentSession({sourcePath,request:async r=>r.op==='inspect'?initial:{complete:true,observation:final,evidence:[]}});await s.context();
  const r=await s.apply({url:page.url,checkboxGroups:[group]});assert.equal(r.complete,change==='replaced');if(change!=='replaced'){assert.equal(r.reason,'CHECKBOX_GROUP_CHANGED');assert.deepEqual(r.changedGroups,['Languages']);}
 });
 h=await createOfflinePublicHarness(PUBLIC_URL);bridge=await serveOfflinePage(h);const configFile=path.join(dir,'controller.json');await writeFile(configFile,JSON.stringify(bridge.config),{mode:0o600});
 // Start with an incorrect selection; complete-set reconciliation must clear it.
 await h.page.getByLabel('Spanish (SPA)',{exact:true}).check();
 client=new Client({name:'decision-preflight',version:'0.0.1'});
 await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/bench/offline-public-bindings-mcp.mjs`],env:{...process.env,AFA_DOCUMENT_FILE:`${projectRoot}/prototype/fixtures/documents/public-candidate.md`,AFA_OFFLINE_CONFIG:configFile,AFA_OPTIONS_MODE:'compact',AFA_DECISION_MODE:'grouped'},stderr:'pipe'}));
 await check('actual MCP grouped metadata and same59 targets pass independent public DOM/FormData oracle',async()=>{
  const listed=await client.listTools(),apply=listed.tools.find(t=>t.name==='form_apply_bindings');assert.ok(apply.inputSchema.properties.checkboxGroups);
  const encoded=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);assert.equal(encoded.page.format,'grouped-fields-v1');const c={...encoded,page:expandFactoredPage(encoded.page)};assert.equal(c.page.fields.length,101);
  const refs=await h.page.evaluate(()=>Object.fromEntries([...globalThis.__afaPrototype.nodes].map(([ref,{el}])=>[el.name,ref])));
  const bindings={},choices={},grouped=new Map();
  for(const [name,label]of CASES)bindings[refs[name]]=c.source.entries.find(e=>e.label===label).id;
  for(const [prefix,label,sourceLabel]of BOOL_CASES){const f=c.page.fields.find(f=>f.group.startsWith(prefix)&&f.label===label),sourceId=c.source.entries.find(e=>e.label===sourceLabel).id;
   if(f.kind==='checkbox'){if(!grouped.has(f.group))grouped.set(f.group,{group:f.group,sourceId,selectedRefs:[]});grouped.get(f.group).selectedRefs.push(f.ref);}
   else{bindings[f.ref]=sourceId;choices[f.ref]=true;}
  }
  const r=await client.callTool({name:'form_apply_bindings',arguments:{url:c.page.url,bindings,choices,checkboxGroups:[...grouped.values()]}});assert.ok(!r.isError,JSON.stringify(r));const data=JSON.parse(r.content[0].text);assert.equal(data.complete,true,JSON.stringify(data));assert.equal(data.bindings.length,59);assert.equal(data.evidence.length,59);const oracle=await publicOracle(h.page,c.source);assert.equal(oracle.passed,true,JSON.stringify(oracle));assert.equal(oracle.submitAttempts,0);assert.equal(h.guard().frozen,true);assert.ok(data.coverage.unresolvedRequired.some(f=>f.label==='Current location ✱'));assert.ok(data.coverage.unsupported.some(f=>f.kind==='file'));
  rows.push({name:'public results',passed:true,encodedBytes:Buffer.byteLength(JSON.stringify(encoded)),decodedBytes:Buffer.byteLength(JSON.stringify(c)),bindings:Object.keys(bindings).length,checkboxGroups:grouped.size,expandedTargets:data.bindings.length,oracle,guard:h.guard()});
 });
}finally{await client?.close();await bridge?.close();await h?.close();await rm(dir,{recursive:true,force:true});await writeFile('prototype/reports/decision-checks.json',JSON.stringify({date:new Date().toISOString(),rows},null,2));}
