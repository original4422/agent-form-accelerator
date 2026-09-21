import assert from 'node:assert/strict';import {mkdtemp,rm,writeFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createBridge,projectRoot} from '../src/bridge.mjs';import {createBrowserCompanion,companionCommand} from '../src/browser-companion.mjs';import {catalogPlan,catalogOracle} from './query-catalog-cases.mjs';import '../scripts/build-fixtures.mjs';
export async function companionVariantsContext(app,{enabled=false,pdf=false,fill=false}={}){
 const client=new Client({name:'companion-variants-check',version:'0.0.1'});
 try{
  await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/src/browser-bindings-mcp.mjs`],env:{...process.env,AFA_BROWSER_SESSION:app.configPath,AFA_QUERY_VARIANTS:enabled?'1':'0'},stderr:'pipe'}));
  const {tools}=await client.listTools(),apply=tools.find(t=>t.name==='form_apply_bindings'),c=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);assert.equal(JSON.stringify(apply.inputSchema).includes('queries'),enabled);
  const normalized={...c,page:{...c.page,documentId:undefined,snapshot:undefined}};
  const result={enabled,pdf,contextHash:createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),toolsHash:createHash('sha256').update(JSON.stringify(tools)).digest('hex'),passed:true};
  if(fill){const response=await client.callTool({name:'form_apply_bindings',arguments:catalogPlan(c)});
   if(!enabled){assert.ok(response.isError);assert.equal(await app.page.evaluate(()=>window.searchRequests.length),0);assert.equal(await app.page.getByLabel('Full name',{exact:true}).inputValue(),'');}
   else{assert.ok(!response.isError,JSON.stringify(response));const r=JSON.parse(response.content[0].text);assert.equal(r.complete,true);assert.equal(r.discoveryCalls,2);assert.equal(r.evidence.length,5);result.oracle=await catalogOracle(app.page);assert.ok(result.oracle.passed,JSON.stringify(result.oracle));}
  }
  return result;
 }finally{await client.close();}
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const root=await mkdtemp(path.join(os.tmpdir(),'afa-companion-variants-')),fixture=await createBridge({port:0}),results=[];let app;
 try{
  for(const suffix of ['a','b'])for(const enabled of [false,true]){
   app=await createBrowserCompanion({url:`${fixture.config.bridge}/fixtures/query-catalog-${suffix}.html`,sourcePath:`${projectRoot}/prototype/fixtures/documents/query-candidate.md`,temporary:true,baseDir:root,headless:true});await app.page.waitForSelector('[role=combobox]');
   const result=await companionVariantsContext(app,{enabled,fill:true});results.push({suffix,...result});console.log('PASS '+suffix+' '+enabled+' real companion MCP');await app.close();app=undefined;
  }
  const prior=process.env.AFA_QUERY_VARIANTS;try{process.env.AFA_QUERY_VARIANTS='1';assert.ok(companionCommand('/test/session.json').includes('AFA_QUERY_VARIANTS="1"'));process.env.AFA_QUERY_VARIANTS='0';assert.ok(!companionCommand('/test/session.json').includes('AFA_QUERY_VARIANTS'));results.push({name:'only explicit opt-in is forwarded to the printed command',passed:true});}finally{if(prior===undefined)delete process.env.AFA_QUERY_VARIANTS;else process.env.AFA_QUERY_VARIANTS=prior;}
 }catch(e){results.push({passed:false,error:e.stack});process.exitCode=1;console.error(e.message);}
 finally{await app?.close();await fixture.close();await rm(root,{recursive:true,force:true});await writeFile('prototype/reports/companion-variants-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
}
