import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness} from './harness.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {conditionalBindings} from './conditional-cases.mjs';
import {aliasQueries,aliasBindings,aliasOracle} from './alias-cases.mjs';
import '../scripts/build-fixtures.mjs';
export async function checkConditionalProvider({h,mode,fill=false}){
 const client=new Client({name:'conditional-preflight',version:'0.0.1'});
 try{
  const env={...process.env,AFA_DOCUMENT_FILE:`${projectRoot}/prototype/fixtures/documents/alias-candidate.md`,AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url(),AFA_CONTEXT_MODE:'prefetch',AFA_DISCOVERY_MODE:'batch',AFA_SELECTION_MODE:mode};
  await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/bench/playwright-bindings-mcp.mjs`],env,stderr:'pipe'}));
  const {tools}=await client.listTools();assert.equal(tools.length,4);const apply=tools.find(t=>t.name==='form_apply_bindings');const c=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
  assert.equal(c.source.entries.length,14);assert.equal(c.page.fields.filter(f=>f.kind==='autocomplete').length,2);assert.ok(c.coverage.unresolvedRequired.some(f=>f.label==='Earliest available start date'));
  assert.equal(JSON.stringify(apply.inputSchema).includes('labelParts'),mode==='conditional');
  const result={mode,passed:true,contextHash:createHash('sha256').update(JSON.stringify(c)).digest('hex'),contextBytes:Buffer.byteLength(JSON.stringify(c)),tools:tools.length};
  if(fill){
   let args=conditionalBindings(c);
   if(mode!=='conditional'){const s=await client.callTool({name:'form_search',arguments:{url:c.page.url,queries:aliasQueries(c)}});assert.ok(!s.isError,JSON.stringify(s));const d=JSON.parse(s.content[0].text);args=aliasBindings(d,d.searches);}
   const response=await client.callTool({name:'form_apply_bindings',arguments:args});assert.ok(!response.isError,JSON.stringify(response));const r=JSON.parse(response.content[0].text);assert.equal(r.complete,true,JSON.stringify(r));assert.equal(r.bindings.length,10);assert.equal(r.evidence.length,10);assert.deepEqual(r.coverage.unresolvedRequired.map(f=>f.label),['Earliest available start date']);
   result.oracle=await aliasOracle(h.page,c.source.entries.find(e=>e.label==='个人介绍').value);assert.equal(result.oracle.passed,true,JSON.stringify(result.oracle));assert.equal(result.oracle.submits,0);result.conditionalChoices=r.conditionalSelections?.length??0;
  }
  return result;
 }finally{await client.close();}
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const h=await createHarness({cdp:true}),results=[];
 try{for(const mode of ['observed','conditional']){await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');results.push(await checkConditionalProvider({h,mode,fill:true}));console.log('PASS '+mode+' actual MCP/application state');}}
 finally{await h.close();await writeFile('prototype/reports/conditional-provider-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
}
