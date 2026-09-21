import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness} from './harness.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {aliasQueries,aliasBindings,aliasOracle} from './alias-cases.mjs';
import '../scripts/build-fixtures.mjs';
export async function checkDiscoveryProvider({h,mode,fill=false,concurrent=false}) {
 const client=new Client({name:'discovery-preflight',version:'0.0.1'});
 try{
  const env={...process.env,AFA_DOCUMENT_FILE:`${projectRoot}/prototype/fixtures/documents/alias-candidate.md`,AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url(),AFA_CONTEXT_MODE:'prefetch',AFA_DISCOVERY_MODE:mode};
  await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/bench/playwright-bindings-mcp.mjs`],env,stderr:'pipe'}));
  const listed=await client.listTools();assert.equal(listed.tools.length,4);
  const search=listed.tools.find(t=>t.name==='form_search');if(mode==='single'){assert.ok(search.inputSchema.properties.ref&&search.inputSchema.properties.sourceId&&search.inputSchema.properties.query);assert.ok(!search.inputSchema.properties.queries);}else assert.equal(search.inputSchema.properties.queries.maxItems,12);
  const apply=listed.tools.find(t=>t.name==='form_apply_bindings');
  const context=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
  assert.equal(context.source.entries.length,14);assert.equal(context.page.fields.filter(f=>f.kind==='autocomplete').length,2);assert.ok(context.coverage.unresolvedRequired.some(f=>f.label==='Earliest available start date'));
  if(!fill)return {mode,passed:true,tools:4,actualContext:true,sourceEntries:14,searchBatchSize:mode==='single'?1:12};
  const queries=aliasQueries(context);
  const call=async queries=>{const r=await client.callTool({name:'form_search',arguments:mode==='single'?{url:context.page.url,...queries[0]}:{url:context.page.url,queries}});assert.ok(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);};
  let discovered,searches;
  if(mode==='batch'&&!concurrent){discovered=await call(queries);searches=discovered.searches;}
  else {const parts=concurrent?await Promise.all(queries.map(q=>call([q]))):[];if(!concurrent)for(const q of queries)parts.push(await call([q]));discovered=parts.at(-1);searches=parts.flatMap(p=>p.searches);}
  assert.ok(searches.every(s=>s.status==='observed'));
  const r=await client.callTool({name:'form_apply_bindings',arguments:aliasBindings(discovered,searches)});assert.ok(!r.isError,JSON.stringify(r));const data=JSON.parse(r.content[0].text);assert.equal(data.complete,true,JSON.stringify(data));assert.deepEqual(data.coverage.unresolvedRequired.map(f=>f.label),['Earliest available start date']);
  const oracle=await aliasOracle(h.page,context.source.entries.find(e=>e.label==='个人介绍').value);assert.equal(oracle.passed,true,JSON.stringify(oracle));
  return {mode,concurrent,passed:true,actualContext:true,...oracle};
 }finally{await client.close();}
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const h=await createHarness({cdp:true}),results=[];
 try{for(const [mode,concurrent]of [['single',false],['batch',false],['single',true]]){await h.reset('alias-form');await h.page.waitForSelector('[role=combobox]');const r=await checkDiscoveryProvider({h,mode,fill:true,concurrent});results.push(r);console.log('PASS '+mode+(concurrent?' concurrent requests':''));}}
 finally{await h.close();await writeFile(`${projectRoot}/prototype/reports/discovery-provider-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));}
}
