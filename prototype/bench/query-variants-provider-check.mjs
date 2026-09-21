import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness} from './harness.mjs';import {projectRoot} from '../src/bridge.mjs';import {catalogPlan,catalogOracle} from './query-catalog-cases.mjs';import '../scripts/build-fixtures.mjs';
export async function checkVariantsProvider({h,enabled=true,fill=false}){
 const client=new Client({name:'variants-check',version:'0.0.1'});
 try{
  await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/bench/playwright-bindings-mcp.mjs`],env:{...process.env,AFA_DOCUMENT_FILE:`${projectRoot}/prototype/fixtures/documents/query-candidate.md`,AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url(),AFA_CONTEXT_MODE:'prefetch',AFA_DISCOVERY_MODE:'batch',AFA_SELECTION_MODE:'conditional',AFA_QUERY_VARIANTS:enabled?'1':'0'},stderr:'pipe'}));
  const {tools}=await client.listTools(),apply=tools.find(t=>t.name==='form_apply_bindings'),c=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
  assert.equal(JSON.stringify(apply.inputSchema).includes('queries'),enabled);assert.equal(tools.length,4);
  const result={enabled,contextHash:createHash('sha256').update(JSON.stringify(c)).digest('hex'),toolsHash:createHash('sha256').update(JSON.stringify(tools)).digest('hex'),passed:true};
  if(fill){
   const args=catalogPlan(c),response=await client.callTool({name:'form_apply_bindings',arguments:args});
   if(!enabled){assert.ok(response.isError);assert.equal(await h.page.evaluate(()=>window.searchRequests.length),0);return result;}
   assert.ok(!response.isError,JSON.stringify(response));const r=JSON.parse(response.content[0].text);assert.equal(r.complete,true,JSON.stringify(r));assert.equal(r.discoveryCalls,2);assert.equal(r.evidence.length,5);assert.deepEqual(r.coverage.unresolvedRequired.map(f=>f.label),['Earliest available start date']);
   result.oracle=await catalogOracle(h.page);assert.equal(result.oracle.passed,true,JSON.stringify(result.oracle));
  }
  return result;
 }finally{await client.close();}
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const h=await createHarness({cdp:true}),results=[];
 try{for(const suffix of ['a','b'])for(const enabled of [false,true]){await h.reset(`query-catalog-${suffix}`);await h.page.waitForSelector('[role=combobox]');results.push({suffix,...await checkVariantsProvider({h,enabled,fill:true})});console.log('PASS '+suffix+' '+enabled+' actual MCP');}}
 finally{await h.close();await writeFile('prototype/reports/query-variants-provider-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));}
}
